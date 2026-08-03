import { useState } from 'react'
import {
  approvePendingTimeEntry,
  updatePendingTimeEntry,
} from '../../api/timeEntries'
import { apiErrorMessage } from '../../api/client'
import { Modal } from '../ui/Modal'
import { ManualDateTimeFields } from './ManualDateTimeFields'
import {
  applyManualFieldChange,
  createManualEntryFromTimeEntry,
  validateManualEntry,
} from '../../lib/manualEntry'
import type { TimeEntry } from '../../types/timeEntry'
import { isOverlapConflictError } from '../../lib/timeEntryErrors'
import { OverlapAlertModal } from './overlapAlert'

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
  const [error, setError] = useState<string | null>(null)
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isApproving, setIsApproving] = useState(false)

  const validation = validateManualEntry(
    manualEntry,
    allPending.filter((item) => item.status === 'Confirmed'),
    null,
    new Date(),
    entry.id,
  )

  const endOrderError = manualEntry.end <= manualEntry.start ? 'End must be after start' : null
  const blockingError = validation.error ?? error

  const handleSave = async () => {
    setError(null)

    if (validation.error) {
      setError(validation.error)
      return
    }

    if (validation.overlapWarning) {
      setOverlapWarning(validation.overlapWarning)
      return
    }

    setIsSaving(true)
    try {
      const updated = await updatePendingTimeEntry(entry.id, {
        description: description.trim() || undefined,
        startedAtUtc: manualEntry.start.toISOString(),
        endedAtUtc: manualEntry.end.toISOString(),
        isBillable,
      })
      onUpdated(updated)
      setOverlapWarning(null)
    } catch (err) {
      if (isOverlapConflictError(err)) {
        setOverlapWarning(
          apiErrorMessage(err, 'This entry overlaps with an existing entry.'),
        )
        return
      }
      setError(apiErrorMessage(err, 'Could not save changes.'))
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
      setError(apiErrorMessage(err, 'Could not approve the entry.'))
    } finally {
      setIsApproving(false)
    }
  }

  return (
    <>
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

        <div className="mb-3 grid grid-cols-1 items-start gap-x-3 gap-y-3 sm:grid-cols-2">
          <div className="min-w-0">
            <ManualDateTimeFields
              variant="modal"
              label="Start"
              value={manualEntry.start}
              onChange={(parsed) => {
                setOverlapWarning(null)
                setManualEntry((current) => applyManualFieldChange(current, 'start', parsed))
              }}
              fieldState={endOrderError ? 'error' : 'default'}
              disabled={isSaving || isApproving}
            />
          </div>
          <div className="min-w-0">
            <ManualDateTimeFields
              variant="modal"
              label="End"
              value={manualEntry.end}
              onChange={(parsed) => {
                setOverlapWarning(null)
                setManualEntry((current) => applyManualFieldChange(current, 'end', parsed))
              }}
              fieldState={endOrderError ? 'error' : 'default'}
              disabled={isSaving || isApproving}
            />
          </div>
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

        <div className="mt-4.5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border-control border-navy bg-transparent py-2.5 font-display text-body font-semibold text-navy"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving || isApproving || Boolean(blockingError)}
            onClick={() => void handleSave()}
            className="flex-1 rounded-full border-control border-navy/15 bg-surface-muted py-2.5 font-display text-body font-semibold text-navy disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save edits'}
          </button>
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

      {overlapWarning ? (
        <OverlapAlertModal
          message={overlapWarning}
          onDismiss={() => setOverlapWarning(null)}
        />
      ) : null}
    </>
  )
}