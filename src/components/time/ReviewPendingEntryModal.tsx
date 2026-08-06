import { useCallback, useState } from 'react'
import {
  approvePendingTimeEntry,
  rejectPendingTimeEntry,
  type TimeEntryRequest,
} from '../../api/timeEntries'
import { apiErrorMessage } from '../../api/client'
import { Modal } from '../ui/Modal'
import { useManualEntryRangeFields } from '../../hooks/useManualEntryRangeFields'
import {
  applyManualFieldChange,
  createManualEntryFromTimeEntry,
  dateInputToUtcIso,
  entryDateToDateInputValue,
  formatManualDurationInput,
  MAX_MANUAL_DURATION_SECONDS,
  validateDurationOnlyEntry,
  validateManualEntry,
} from '../../lib/manualEntry'
import type { TimeEntry } from '../../types/timeEntry'
import {
  DURATION_LIMIT_MESSAGE,
  isDurationLimitError,
  isOverlapConflictError,
} from '../../lib/timeEntryErrors'
import { DurationLimitModal } from './durationLimitModal'
import { DurationOnlyTimeFields } from './DurationOnlyTimeFields'
import { ManualEntryRangeTimeFields } from './ManualEntryRangeTimeFields'
import { OverlapAlertModal } from './overlapAlert'

interface ReviewPendingEntryModalProps {
  entry: TimeEntry
  allPending: TimeEntry[]
  onClose: () => void
  onUpdated: (entry: TimeEntry) => void
  onApproved: () => void
  onRejected: () => void
}

export function ReviewPendingEntryModal({
  entry,
  allPending,
  onClose,
  onApproved,
  onRejected,
}: ReviewPendingEntryModalProps) {
  const isDurationOnly = entry.mode === 'DurationOnly'
  const [description, setDescription] = useState(entry.description ?? '')
  const [isBillable, setIsBillable] = useState(entry.isBillable)
  const [manualEntry, setManualEntry] = useState(() => createManualEntryFromTimeEntry(entry))
  const [durationOnlySeconds, setDurationOnlySeconds] = useState(entry.durationSeconds)
  const [durationOnlyInput, setDurationOnlyInput] = useState(() =>
    formatManualDurationInput(entry.durationSeconds),
  )
  const [durationOnlyDate, setDurationOnlyDate] = useState(() =>
    entryDateToDateInputValue(entry.startedAtUtc),
  )
  const [error, setError] = useState<string | null>(null)
  const [durationParseError, setDurationParseError] = useState<string | null>(null)
  const [durationLimitMessage, setDurationLimitMessage] = useState<string | null>(null)
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null)
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)

  const validation = validateManualEntry(
    manualEntry,
    allPending.filter((item) => item.status === 'Confirmed'),
    null,
    new Date(),
    entry.id,
  )
  const durationOnlyValidationError = validateDurationOnlyEntry(durationOnlySeconds)

  const endOrderError = manualEntry.end <= manualEntry.start ? 'End must be after start' : null
  const blockingError = isDurationOnly
    ? durationOnlyValidationError ?? durationParseError ?? error
    : validation.error ?? error

  const rangeFieldState = endOrderError ? 'error' : 'default'
  const busy = isApproving || isRejecting

  const applyChange = useCallback(
    (type: 'start' | 'end', date: Date) => {
      setOverlapWarning(null)
      setManualEntry((current) => applyManualFieldChange(current, type, date))
    },
    [],
  )

  const rangeFields = useManualEntryRangeFields({
    start: manualEntry.start,
    end: manualEntry.end,
    onApplyChange: applyChange,
    syncEndWithStart: true,
  })

  const buildApproveRequest = (): TimeEntryRequest | null => {
    if (isDurationOnly) {
      const entryDateUtc = dateInputToUtcIso(durationOnlyDate)
      if (!entryDateUtc) {
        setError('Enter a valid date.')
        return null
      }

      return {
        description: description.trim() || undefined,
        isBillable,
        entryDateUtc,
        durationSeconds: durationOnlySeconds,
      }
    }

    return {
      description: description.trim() || undefined,
      isBillable,
      startedAtUtc: manualEntry.start.toISOString(),
      endedAtUtc: manualEntry.end.toISOString(),
    }
  }

  const handleApprove = async () => {
    setDurationLimitMessage(null)

    if (isDurationOnly) {
      if (durationOnlySeconds > MAX_MANUAL_DURATION_SECONDS) {
        setDurationLimitMessage(DURATION_LIMIT_MESSAGE)
        return
      }
    } else if (manualEntry.durationSeconds > MAX_MANUAL_DURATION_SECONDS) {
      setDurationLimitMessage(DURATION_LIMIT_MESSAGE)
      return
    }

    const request = buildApproveRequest()
    if (!request) return

    setError(null)
    setIsApproving(true)
    try {
      await approvePendingTimeEntry(entry.id, request)
      onApproved()
    } catch (err) {
      if (isDurationLimitError(err)) {
        setDurationLimitMessage(apiErrorMessage(err, DURATION_LIMIT_MESSAGE))
        return
      }
      if (isOverlapConflictError(err)) {
        setOverlapWarning(
          apiErrorMessage(err, 'This entry overlaps with an existing entry.'),
        )
        return
      }
      setError(apiErrorMessage(err, 'Could not approve the entry.'))
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    setError(null)
    setIsRejecting(true)
    try {
      await rejectPendingTimeEntry(entry.id)
      onRejected()
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not reject the entry.'))
    } finally {
      setIsRejecting(false)
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
            disabled={busy}
          />
        </div>

        {isDurationOnly ? (
          <DurationOnlyTimeFields
            dateValue={durationOnlyDate}
            onDateChange={setDurationOnlyDate}
            durationInput={durationOnlyInput}
            onDurationInputChange={setDurationOnlyInput}
            durationSeconds={durationOnlySeconds}
            onDurationSecondsChange={setDurationOnlySeconds}
            durationParseError={durationParseError}
            onDurationParseErrorChange={setDurationParseError}
            onClearDurationLimit={() => setDurationLimitMessage(null)}
            disabled={busy}
          />
        ) : (
          <ManualEntryRangeTimeFields
            variant="modal"
            startDateCalendarValue={rangeFields.startDateCalendarValue}
            startTimeInput={rangeFields.startTimeInput}
            endTimeInput={rangeFields.endTimeInput}
            onStartDateChange={rangeFields.handleStartDateChange}
            onStartTimeChange={rangeFields.handleStartTimeChange}
            onEndTimeChange={rangeFields.handleEndTimeChange}
            fieldState={rangeFieldState}
            disabled={busy}
          />
        )}

        <label className="mb-3 flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={isBillable}
            onChange={(event) => setIsBillable(event.target.checked)}
            disabled={busy}
            className="h-4 w-4 rounded border-navy/20 text-brand focus:ring-brand/30"
          />
          <span className="text-md font-medium text-navy/80">Billable</span>
        </label>

        {blockingError ? (
          <div className="mb-3 rounded-md bg-red-tint px-3 py-2.5 text-sm text-red">{blockingError}</div>
        ) : null}

        <div className="mt-4.5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-w-[5.5rem] flex-1 rounded-full border-control border-navy bg-transparent py-2.5 font-display text-body font-semibold text-navy"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleReject()}
            className="min-w-[5.5rem] flex-1 rounded-full border-control border-red/30 bg-red-tint py-2.5 font-display text-body font-semibold text-red disabled:opacity-60"
          >
            {isRejecting ? 'Rejecting…' : 'Reject'}
          </button>
          <button
            type="button"
            disabled={
              busy ||
              Boolean(blockingError) ||
              (!isDurationOnly && Boolean(endOrderError))
            }
            onClick={() => void handleApprove()}
            className="min-w-[5.5rem] flex-1 rounded-full bg-brand py-2.5 font-display text-body font-semibold text-white disabled:opacity-60"
          >
            {isApproving ? 'Approving…' : 'Approve'}
          </button>
        </div>
      </Modal>

      {durationLimitMessage ? (
        <DurationLimitModal
          message={durationLimitMessage}
          onDismiss={() => setDurationLimitMessage(null)}
        />
      ) : null}

      {overlapWarning && !isDurationOnly ? (
        <OverlapAlertModal
          message={overlapWarning}
          onDismiss={() => setOverlapWarning(null)}
        />
      ) : null}
    </>
  )
}
