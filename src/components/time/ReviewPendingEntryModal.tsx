import { useState } from 'react'
import { ApiError } from '../../api/client'
import {
  approvePendingTimeEntry,
  timeEntryApiErrorMessage,
  updatePendingTimeEntry,
} from '../../api/timeEntries'
import { Modal } from '../ui/Modal'
import {
  applyManualFieldChange,
  createManualEntryFromTimeEntry,
  formatManualDurationInput,
  parseDatetimeLocal,
  parseDurationInput,
  toDatetimeLocalValue,
  validateManualEntry,
} from '../../lib/manualEntry'
import type { TimeEntry } from '../../types/timeEntry'

interface ReviewPendingEntryModalProps {
  entry: TimeEntry
  allPending: TimeEntry[]
  onClose: () => void
  onUpdated: (entry: TimeEntry) => void
  onApproved: () => void
}

export function ReviewPendingEntryModal({
  entry,
  allPending,
  onClose,
  onUpdated,
  onApproved,
}: ReviewPendingEntryModalProps) {
  const [description, setDescription] = useState(entry.description ?? '')
  const [isBillable, setIsBillable] = useState(entry.isBillable)
  const [manualEntry, setManualEntry] = useState(() => createManualEntryFromTimeEntry(entry))
  const [durationDraft, setDurationDraft] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null)
  const [pendingOverlapConfirm, setPendingOverlapConfirm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isApproving, setIsApproving] = useState(false)

  const durationInput =
    durationDraft ?? formatManualDurationInput(manualEntry.durationSeconds)

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
        <label className="mb-1.5 block font-display text-label font-semibold text-navy/70">
          Description
        </label>
        <input
          className="w-full rounded-md border-control border-navy/[0.08] px-3 py-field text-body text-navy outline-none focus:border-brand"
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
            setDurationDraft(value)
            setOverlapWarning(null)
            setPendingOverlapConfirm(false)
            const parsed = parseDurationInput(value)
            if (parsed === null) return
            setManualEntry((current) => applyManualFieldChange(current, 'duration', parsed))
          }}
          onBlur={() => setDurationDraft(null)}
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
        <span className="text-md font-medium text-navy/80">Billable</span>
      </label>

      {blockingError ? (
        <div className="mb-3 rounded-md bg-red-tint px-3 py-2.5 text-sm text-red">{blockingError}</div>
      ) : null}

      {overlapWarning ? (
        <div className="mb-3 rounded-md bg-yellow-tint px-3 py-2.5 text-sm text-navy">
          {overlapWarning}
        </div>
      ) : null}

      <div className="mt-4.5 flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-full border-control border-navy bg-transparent py-2.5 font-display text-body font-semibold text-navy"
        >
          Cancel
        </button>
        {pendingOverlapConfirm ? (
          <button
            type="button"
            disabled={isSaving || isApproving || Boolean(blockingError)}
            onClick={() => void handleSave(true)}
            className="flex-1 rounded-full bg-brand py-2.5 font-display text-body font-semibold text-white disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save anyway'}
          </button>
        ) : (
          <button
            type="button"
            disabled={isSaving || isApproving || Boolean(blockingError)}
            onClick={() => void handleSave(false)}
            className="flex-1 rounded-full border-control border-navy/15 bg-surface-muted py-2.5 font-display text-body font-semibold text-navy disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save edits'}
          </button>
        )}
        <button
          type="button"
          disabled={isSaving || isApproving || Boolean(blockingError) || Boolean(endOrderError)}
          onClick={() => void handleApprove()}
          className="flex-1 rounded-full bg-brand py-2.5 font-display text-body font-semibold text-white disabled:opacity-60"
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
      <span className="font-display text-label font-semibold text-navy/70">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        className={`w-full rounded-md border-control border-navy/[0.08] px-3 py-field text-body text-navy outline-none focus:border-brand disabled:opacity-60 ${className}`}
      />
      {hint ? <span className="text-xs leading-tight text-red">{hint}</span> : null}
    </label>
  )
}
