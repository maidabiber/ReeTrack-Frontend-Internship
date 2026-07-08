import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../api/client'
import {
  approvePendingTimeEntry,
  listPendingTimeEntries,
  timeEntryApiErrorMessage,
  updatePendingTimeEntry,
} from '../api/timeEntries'
import { Icon } from '../components/ui/Icon'
import { Modal } from '../components/ui/Modal'
import { Pill } from '../components/ui/Pill'
import { formatDurationHms } from '../lib/formatDuration'
import {
  applyManualFieldChange,
  createManualEntryFromTimeEntry,
  formatManualDurationInput,
  parseDatetimeLocal,
  parseDurationInput,
  toDatetimeLocalValue,
  validateManualEntry,
} from '../lib/manualEntry'
import type { TimeEntry } from '../types/timeEntry'

/**
 * RT-111 / RT-112 — pending shared time entries awaiting assignee approval.
 */
export default function ApprovalsPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviewEntry, setReviewEntry] = useState<TimeEntry | null>(null)

  const refresh = useCallback(async () => {
    setError(null)
    try {
      const pending = await listPendingTimeEntries()
      setEntries(pending)
    } catch {
      setError('Could not load pending entries.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <div className="mx-auto w-full max-w-[980px] px-10 py-8">
      <div className="mb-6">
        <h1 className="font-display text-[28px] font-bold text-navy">Approvals</h1>
        <p className="mt-1 text-[14px] text-navy/55">
          Review time entries teammates logged on your behalf. Edit the duration or times before approving.
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-[12px] bg-red-tint px-4 py-3 text-[13px] text-red" role="alert">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[18px] bg-white shadow-card">
        {isLoading ? (
          <div className="px-5 py-16 text-center text-[13px] text-navy/50">Loading pending entries…</div>
        ) : entries.length === 0 ? (
          <div className="px-5 py-16 text-center text-[13px] leading-[1.6] text-navy/50">
            No pending entries.
            <br />
            When a teammate @mentions you on a manual entry, it will appear here.
          </div>
        ) : (
          <ul className="divide-y divide-navy/5">
            {entries.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => setReviewEntry(entry)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-muted/60"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <Pill label="Pending" dotClassName="bg-yellow" />
                      {entry.submittedByDisplayName ? (
                        <span className="text-[12px] text-navy/50">
                          from {entry.submittedByDisplayName}
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate text-[14px] font-medium text-navy">
                      {entry.description?.trim() || 'No description'}
                    </p>
                    <p className="mt-0.5 text-[12px] text-navy/50">
                      {entry.startedAtUtc ? new Date(entry.startedAtUtc).toLocaleString() : ''}
                    </p>
                  </div>
                  <div className="font-mono text-[14px] tabular-nums text-navy">
                    {formatDurationHms(entry.durationSeconds)}
                  </div>
                  <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-navy/30" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {reviewEntry ? (
        <ReviewPendingEntryModal
          entry={reviewEntry}
          allPending={entries}
          onClose={() => setReviewEntry(null)}
          onUpdated={(updated) => {
            setEntries((current) => current.map((item) => (item.id === updated.id ? updated : item)))
            setReviewEntry(updated)
          }}
          onApproved={() => {
            setEntries((current) => current.filter((item) => item.id !== reviewEntry.id))
            setReviewEntry(null)
          }}
        />
      ) : null}
    </div>
  )
}

function ReviewPendingEntryModal({
  entry,
  allPending,
  onClose,
  onUpdated,
  onApproved,
}: {
  entry: TimeEntry
  allPending: TimeEntry[]
  onClose: () => void
  onUpdated: (entry: TimeEntry) => void
  onApproved: () => void
}) {
  const [description, setDescription] = useState(entry.description ?? '')
  const [isBillable, setIsBillable] = useState(entry.isBillable)
  const [manualEntry, setManualEntry] = useState(() => createManualEntryFromTimeEntry(entry))
  const [durationInput, setDurationInput] = useState(() => formatManualDurationInput(entry.durationSeconds))
  const [error, setError] = useState<string | null>(null)
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null)
  const [pendingOverlapConfirm, setPendingOverlapConfirm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isApproving, setIsApproving] = useState(false)

  useEffect(() => {
    setDurationInput(formatManualDurationInput(manualEntry.durationSeconds))
  }, [manualEntry.durationSeconds])

  const validation = validateManualEntry(
    manualEntry,
    allPending.filter((item) => item.status === 'Confirmed'),
    null,
    new Date(),
    entry.id,
  )

  const endOrderError = manualEntry.end <= manualEntry.start ? 'End must be after start' : null
  const blockingError = validation.error ?? error

  const handleSave = async (confirmOverlap = false) => {
    setError(null)

    if (validation.error) {
      setError(validation.error)
      return
    }

    if (!confirmOverlap && validation.overlapWarning) {
      setOverlapWarning(validation.overlapWarning)
      setPendingOverlapConfirm(true)
      return
    }

    setIsSaving(true)
    try {
      const result = await updatePendingTimeEntry(entry.id, {
        description: description.trim() || undefined,
        startedAtUtc: manualEntry.start.toISOString(),
        endedAtUtc: manualEntry.end.toISOString(),
        isBillable,
        confirmOverlap,
      })
      onUpdated(result.entry)
      setOverlapWarning(null)
      setPendingOverlapConfirm(false)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && !confirmOverlap) {
        setOverlapWarning(timeEntryApiErrorMessage(err, 'This entry overlaps with an existing entry.'))
        setPendingOverlapConfirm(true)
        return
      }
      setError(timeEntryApiErrorMessage(err, 'Could not save changes.'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleApprove = async () => {
    setError(null)
    setIsApproving(true)
    try {
      await approvePendingTimeEntry(entry.id)
      onApproved()
    } catch (err) {
      setError(timeEntryApiErrorMessage(err, 'Could not approve the entry.'))
    } finally {
      setIsApproving(false)
    }
  }

  return (
    <Modal
      title="Review shared entry"
      subtitle={
        entry.submittedByDisplayName
          ? `${entry.submittedByDisplayName} logged this time for you. Adjust it if needed, then approve.`
          : 'Adjust the entry if needed, then approve.'
      }
      onClose={onClose}
    >
      <div className="mb-3">
        <label className="mb-1.5 block font-display text-[11.5px] font-semibold text-navy/70">
          Description
        </label>
        <input
          className="w-full rounded-[10px] border-[1.5px] border-navy/[0.08] px-3 py-[9px] text-[13px] text-navy outline-none focus:border-brand"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={isSaving || isApproving}
        />
      </div>

      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <PendingField
          label="Start"
          type="datetime-local"
          value={toDatetimeLocalValue(manualEntry.start)}
          onChange={(value) => {
            const parsed = parseDatetimeLocal(value)
            if (!parsed) return
            setOverlapWarning(null)
            setPendingOverlapConfirm(false)
            setManualEntry((current) => applyManualFieldChange(current, 'start', parsed))
          }}
          disabled={isSaving || isApproving}
        />
        <PendingField
          label="End"
          type="datetime-local"
          value={toDatetimeLocalValue(manualEntry.end)}
          onChange={(value) => {
            const parsed = parseDatetimeLocal(value)
            if (!parsed) return
            setOverlapWarning(null)
            setPendingOverlapConfirm(false)
            setManualEntry((current) => applyManualFieldChange(current, 'end', parsed))
          }}
          hint={endOrderError ?? undefined}
          disabled={isSaving || isApproving}
        />
        <PendingField
          label="Duration"
          type="text"
          value={durationInput}
          onChange={(value) => {
            setDurationInput(value)
            setOverlapWarning(null)
            setPendingOverlapConfirm(false)
            const parsed = parseDurationInput(value)
            if (parsed === null) return
            setManualEntry((current) => applyManualFieldChange(current, 'duration', parsed))
          }}
          onBlur={() => setDurationInput(formatManualDurationInput(manualEntry.durationSeconds))}
          className="font-mono tabular-nums"
          disabled={isSaving || isApproving}
        />
      </div>

      <label className="mb-3 flex cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          checked={isBillable}
          onChange={(event) => setIsBillable(event.target.checked)}
          disabled={isSaving || isApproving}
          className="h-4 w-4 rounded border-navy/20 text-brand focus:ring-brand/30"
        />
        <span className="text-[13px] font-medium text-navy/80">Billable</span>
      </label>

      {blockingError ? (
        <div className="mb-3 rounded-[10px] bg-red-tint px-3 py-2.5 text-[12.5px] text-red">{blockingError}</div>
      ) : null}

      {overlapWarning ? (
        <div className="mb-3 rounded-[10px] bg-yellow-tint px-3 py-2.5 text-[12.5px] text-navy">
          {overlapWarning}
        </div>
      ) : null}

      <div className="mt-[18px] flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-full border-[1.5px] border-navy bg-transparent py-2.5 font-display text-[13px] font-semibold text-navy"
        >
          Cancel
        </button>
        {pendingOverlapConfirm ? (
          <button
            type="button"
            disabled={isSaving || isApproving || Boolean(blockingError)}
            onClick={() => void handleSave(true)}
            className="flex-1 rounded-full bg-brand py-2.5 font-display text-[13px] font-semibold text-white disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save anyway'}
          </button>
        ) : (
          <button
            type="button"
            disabled={isSaving || isApproving || Boolean(blockingError)}
            onClick={() => void handleSave(false)}
            className="flex-1 rounded-full border-[1.5px] border-navy/15 bg-surface-muted py-2.5 font-display text-[13px] font-semibold text-navy disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save edits'}
          </button>
        )}
        <button
          type="button"
          disabled={isSaving || isApproving || Boolean(blockingError) || Boolean(endOrderError)}
          onClick={() => void handleApprove()}
          className="flex-1 rounded-full bg-brand py-2.5 font-display text-[13px] font-semibold text-white disabled:opacity-60"
        >
          {isApproving ? 'Approving…' : 'Approve'}
        </button>
      </div>
    </Modal>
  )
}

function PendingField({
  label,
  type,
  value,
  onChange,
  onBlur,
  className = '',
  disabled,
  hint,
}: {
  label: string
  type: 'datetime-local' | 'text'
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  className?: string
  disabled?: boolean
  hint?: string
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-display text-[11.5px] font-semibold text-navy/70">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        className={`w-full rounded-[10px] border-[1.5px] border-navy/[0.08] px-3 py-[9px] text-[13px] text-navy outline-none focus:border-brand disabled:opacity-60 ${className}`}
      />
      {hint ? <span className="text-[11px] leading-tight text-red">{hint}</span> : null}
    </label>
  )
}
