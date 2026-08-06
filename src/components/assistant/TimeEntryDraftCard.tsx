import { useRef, useState } from 'react'
import { Icon } from '../ui/Icon'
import { apiErrorMessage } from '../../api/client'
import {
  createTimeEntriesBatch,
  type BatchEntryConflict,
  type TimeEntryRequest,
} from '../../api/timeEntries'
import type { TimeEntryDraft, TimeEntryDraftItem } from '../../types/assistant'
import type { TimeEntry } from '../../types/timeEntry'
import { dateInputToUtcIso, toDateInputValue } from '../../lib/manualEntry'
import { summarizeDraftRow } from '../../lib/timeEntryDraftSummary'
import { TimeEntryDraftRow } from './TimeEntryDraftRow'

function emptyEntry(): TimeEntryDraftItem {
  return {
    entryDate: toDateInputValue(new Date()),
    startTime: null,
    endTime: null,
    durationMinutes: 60,
    description: null,
    projectId: null,
    projectName: null,
    projectTaskId: null,
    taskName: null,
    tagIds: [],
    tagNames: [],
    isBillable: true,
  }
}

/** Normalize HH:mm or HH:mm:ss (from <input type="time">) to HH:mm. */
function normalizeTimePart(time: string): string | null {
  const match = time.trim().match(/^(\d{1,2}):([0-5]\d)(?::[0-5]\d)?$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23) return null
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/** Local Date from a draft row's date + HH:mm parts — never string-concatenated into UTC. */
function localDateTime(entryDate: string, time: string): Date | null {
  const normalized = normalizeTimePart(time)
  if (!normalized) return null
  const [hours, minutes] = normalized.split(':').map(Number)
  const [year, month, day] = entryDate.split('-').map(Number)
  if (!year || !month || !day) return null
  const date = new Date(year, month - 1, day, hours, minutes)
  return Number.isNaN(date.getTime()) ? null : date
}

function rangeMinutes(row: TimeEntryDraftItem): number {
  if (!row.startTime || !row.endTime) return row.durationMinutes
  const start = localDateTime(row.entryDate, row.startTime)
  const end = localDateTime(row.entryDate, row.endTime)
  if (!start || !end) return row.durationMinutes
  const minutes = (end.getTime() - start.getTime()) / 60000
  return minutes > 0 ? minutes : minutes + 24 * 60 // overnight range, e.g. 22:00 -> 01:00
}

/** The single local->UTC conversion boundary for the whole feature (see the plan's timezone rule). */
function toRequest(row: TimeEntryDraftItem): TimeEntryRequest {
  const association = {
    description: row.description?.trim() || undefined,
    isBillable: row.isBillable,
    projectId: row.projectId,
    projectTaskId: row.projectTaskId,
    tagIds: row.tagIds,
  }

  if (row.startTime && row.endTime) {
    const start = localDateTime(row.entryDate, row.startTime)
    const end = localDateTime(row.entryDate, row.endTime)
    if (!start || !end) {
      throw new Error(`Invalid date/time on ${row.entryDate}. Use yyyy-MM-dd and HH:mm.`)
    }
    if (end <= start) end.setDate(end.getDate() + 1)
    return { ...association, startedAtUtc: start.toISOString(), endedAtUtc: end.toISOString() }
  }

  if (row.durationMinutes <= 0) {
    throw new Error(`Entry on ${row.entryDate} needs a duration or a start/end time.`)
  }

  const entryDateUtc = dateInputToUtcIso(row.entryDate)
  if (!entryDateUtc) {
    throw new Error(`Invalid date ${row.entryDate}. Use yyyy-MM-dd.`)
  }

  return {
    ...association,
    entryDateUtc,
    durationSeconds: row.durationMinutes * 60,
  }
}

interface DraftRow {
  id: string
  item: TimeEntryDraftItem
}

function toDraftRow(item: TimeEntryDraftItem): DraftRow {
  return { id: crypto.randomUUID(), item }
}

/** "09:00–11:00" in the viewer's local time, for naming the entry a row collides with. */
function formatOverlapWindow(startedAtUtc: string, endedAtUtc: string | null): string {
  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })

  return endedAtUtc ? `${time(startedAtUtc)}–${time(endedAtUtc)}` : `${time(startedAtUtc)} onwards`
}

export function TimeEntryDraftCard({
  draft,
  onChange,
  onCreated,
}: {
  draft: TimeEntryDraft
  onChange: (draft: TimeEntryDraft) => void
  onCreated: (entries: TimeEntry[], draftItems: TimeEntryDraftItem[], skippedCount: number) => void
}) {
  // Rows carry a stable local id, not just an index — removing a row must not
  // shift a later row's per-row state (useEntryAssociations) onto the wrong entry.
  const [rows, setRows] = useState<DraftRow[]>(() =>
    (draft.entries.length > 0 ? draft.entries : [emptyEntry()]).map(toDraftRow),
  )
  const rowsRef = useRef(rows)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Keyed by row id, not batch index: the user can add or remove rows after a
  // conflict comes back, and the flags must follow the rows they belong to.
  const [conflicts, setConflicts] = useState<Map<string, BatchEntryConflict>>(new Map())

  const emitRows = (next: DraftRow[]) => {
    rowsRef.current = next
    setRows(next)
    onChange({ entries: next.map((row) => row.item) })
  }

  const clearConflicts = () => setConflicts((prev) => (prev.size === 0 ? prev : new Map()))

  const updateRow = (id: string, patch: Partial<TimeEntryDraftItem>) => {
    // Only the clock fields can change whether a row overlaps, so only they invalidate the
    // server's verdict. This also has to ignore the association patches TimeEntryDraftRow
    // emits from its own sync effect, which would otherwise clear the flags on first paint.
    const affectsOverlap =
      'entryDate' in patch || 'startTime' in patch || 'endTime' in patch || 'durationMinutes' in patch

    if (affectsOverlap) clearConflicts()

    emitRows(rowsRef.current.map((row) => (row.id === id ? { ...row, item: { ...row.item, ...patch } } : row)))
  }

  const addRow = () => {
    clearConflicts()
    emitRows([...rowsRef.current, toDraftRow(emptyEntry())])
  }

  const removeRow = (id: string) => {
    clearConflicts()
    emitRows(rowsRef.current.filter((row) => row.id !== id))
  }

  const totalMinutes = rows.reduce((sum, row) => sum + rangeMinutes(row.item), 0)
  const totalHours = totalMinutes / 60

  const canSave =
    rows.length > 0 &&
    rows.every(
      (row) => row.item.entryDate && (row.item.durationMinutes > 0 || (row.item.startTime && row.item.endTime)),
    ) &&
    !isSaving

  const handleCreate = async (skipOverlapping = false) => {
    if (!canSave) return
    setIsSaving(true)
    setError(null)

    const submitted = rowsRef.current
    const draftItems = submitted.map((row) => row.item)

    try {
      const requests = draftItems.map(toRequest)
      const result = await createTimeEntriesBatch(requests, { skipOverlapping })

      // Set unconditionally so a clean retry clears flags left over from a previous attempt.
      setConflicts(
        new Map(
          result.conflicts
            .filter((conflict) => submitted[conflict.index] !== undefined)
            .map((conflict) => [submitted[conflict.index]!.id, conflict]),
        ),
      )

      // Nothing written: the server is asking the user to look at the conflicts first.
      if (result.created.length === 0) {
        if (result.conflicts.length === 0) {
          throw new Error('Server did not create any time entries. Please try again.')
        }
        return
      }

      // Partial success — keep the conflicting rows on screen so they can be fixed and retried.
      if (result.conflicts.length > 0) {
        const conflicted = new Set(result.conflicts.map((conflict) => conflict.index))
        emitRows(submitted.filter((_, index) => conflicted.has(index)))
      }

      onCreated(
        result.created,
        draftItems.filter((_, index) => !result.conflicts.some((conflict) => conflict.index === index)),
        result.conflicts.length,
      )
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not create the time entries.'))
    } finally {
      setIsSaving(false)
    }
  }

  const conflictRows = rows.filter((row) => conflicts.has(row.id))
  const cleanRowCount = rows.length - conflictRows.length

  return (
    <div className="rounded-2xl border border-brand/20 bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-display text-label font-semibold text-navy">Time Entry Draft</h4>
        <span className="rounded-full bg-brand-tint px-2.5 py-0.5 text-micro font-medium text-brand">
          AI proposed
        </span>
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-red/30 bg-red-tint px-3 py-2 text-sm text-red" role="alert">
          {error}
        </div>
      )}

      {conflictRows.length > 0 && (
        <div className="mb-3 rounded-xl border border-red/30 bg-red-tint px-3 py-2.5" role="alert">
          <p className="text-sm font-semibold text-red">
            {conflictRows.length} of {rows.length}{' '}
            {conflictRows.length === 1 ? 'entry overlaps' : 'entries overlap'} existing time entries
          </p>
          <ul className="mt-2 space-y-1.5">
            {conflictRows.map((row) => {
              const conflict = conflicts.get(row.id)!
              return (
                <li key={row.id} className="text-sm text-navy/75">
                  <span className="font-mono tabular-nums">{summarizeDraftRow(row.item)}</span>
                  {conflict.overlappingEntries.map((entry) => (
                    <span key={entry.id} className="block pl-4 text-navy/55">
                      ↳ overlaps {entry.description?.trim() || 'an existing entry'}{' '}
                      <span className="font-mono tabular-nums">
                        {formatOverlapWindow(entry.startedAtUtc, entry.endedAtUtc)}
                      </span>
                    </span>
                  ))}
                  {conflict.overlappingEntries.length === 0 && (
                    <span className="block pl-4 text-navy/55">↳ {conflict.message}</span>
                  )}
                </li>
              )
            })}
          </ul>
          <p className="mt-2 text-caption text-navy/55">
            Nothing was saved. Adjust the flagged rows, or create the rest and come back to them.
          </p>
        </div>
      )}

      <div className="space-y-2.5">
        {rows.map((row) => (
          <TimeEntryDraftRow
            key={row.id}
            row={row.item}
            hasConflict={conflicts.has(row.id)}
            onChange={(patch) => updateRow(row.id, patch)}
            onRemove={rows.length > 1 ? () => removeRow(row.id) : undefined}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1 text-micro font-medium text-brand transition-colors hover:text-brand-deep"
        >
          <Icon name="plus" className="h-3 w-3" />
          Add entry
        </button>
        <span className="font-mono text-micro tabular-nums text-navy/50">
          Total: {Number.isInteger(totalHours) ? totalHours : totalHours.toFixed(2)}h
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {conflictRows.length > 0 && cleanRowCount > 0 && (
          <button
            type="button"
            onClick={() => handleCreate(true)}
            disabled={!canSave}
            className="w-full rounded-full bg-brand py-2 font-display text-body font-semibold text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving
              ? 'Creating...'
              : `Create the ${cleanRowCount} that ${cleanRowCount === 1 ? "doesn't" : "don't"} overlap`}
          </button>
        )}
        <button
          type="button"
          onClick={() => handleCreate(false)}
          disabled={!canSave}
          className={`w-full rounded-full py-2 font-display text-body font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            conflictRows.length > 0 && cleanRowCount > 0
              ? 'border-control border-navy/15 text-navy/70 hover:border-navy/30 hover:text-navy'
              : 'bg-brand text-white hover:bg-brand-deep'
          }`}
        >
          {isSaving
            ? 'Creating...'
            : conflictRows.length > 0
              ? 'Retry all'
              : `Create ${rows.length > 1 ? `${rows.length} entries` : 'entry'}`}
        </button>
      </div>
    </div>
  )
}
