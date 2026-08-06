import { useCallback, useState } from 'react'
import { ApiError, apiErrorMessage } from '../../api/client'
import { useEntryAssociations } from '../../hooks/useEntryAssociations'
import { useManualEntryRangeFields } from '../../hooks/useManualEntryRangeFields'
import { useTimer } from '../../hooks/useTimer'
import { useWeekLock } from '../../hooks/useWeekLock'
import { WeekLockBanner } from '../timesheet/WeekLockBanner'
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
import { Modal } from '../ui/Modal'

import { DURATION_LIMIT_MESSAGE, isDurationLimitError } from '../../lib/timeEntryErrors'
import { useOverlapAlert } from '../../hooks/useOverlapAlert'
import { DurationLimitModal } from './durationLimitModal'
import { DurationOnlyTimeFields } from './DurationOnlyTimeFields'
import { ManualEntryRangeTimeFields } from './ManualEntryRangeTimeFields'
import { OverlapAlertModal } from './overlapAlert'
import { TimeEntryFields } from './TimeEntryFields'

export function EditEntryModal({
  entry,
  onClose,
  onSaved,
}: {
  entry: TimeEntry
  onClose: () => void
  onSaved?: () => void
}) {
  const isDurationOnly = entry.mode === 'DurationOnly'
  const { isSavingEdit, updateEntry } = useTimer()
  // Entries in a submitted/approved week can't be edited (the backend 409s too).
  const weekLock = useWeekLock(entry.startedAtUtc ? new Date(entry.startedAtUtc) : null)
  const [description, setDescription] = useState(entry.description ?? '')
  const associations = useEntryAssociations({
    projectId: entry.projectId,
    projectTaskId: entry.projectTaskId,
    tagIds: entry.tags.map((t) => t.id),
    isBillable: entry.isBillable,
  })
  const [manualEntry, setManualEntry] = useState(() => createManualEntryFromTimeEntry(entry))
  const [durationOnlySeconds, setDurationOnlySeconds] = useState(entry.durationSeconds)
  const [durationOnlyInput, setDurationOnlyInput] = useState(() =>
    formatManualDurationInput(entry.durationSeconds),
  )
  const [durationOnlyDate, setDurationOnlyDate] = useState(() =>
    entryDateToDateInputValue(entry.startedAtUtc),
  )
  const [error, setError] = useState<string | null>(null)
  const [durationLimitMessage, setDurationLimitMessage] = useState<string | null>(null)
  const [durationParseError, setDurationParseError] = useState<string | null>(null)

  const validation = validateManualEntry(manualEntry, [], null)
  const durationOnlyValidationError = validateDurationOnlyEntry(durationOnlySeconds)

  const overlapAlert = useOverlapAlert()
  const { overlapWarning, showOverlapAlert } = overlapAlert

  const endOrderError =
    manualEntry.end <= manualEntry.start ? 'End must be after start' : null
  const blockingError = isDurationOnly
    ? durationOnlyValidationError ?? durationParseError ?? error
    : validation.error ?? error

  const rangeFieldState = endOrderError ? 'error' : 'default'

  const applyChange = useCallback(
    (type: 'start' | 'end', date: Date) => {
      setDurationLimitMessage(null)
      overlapAlert.clearOverlapAlert()
      setManualEntry((current) => applyManualFieldChange(current, type, date))
    },
    [overlapAlert],
  )

  const rangeFields = useManualEntryRangeFields({
    start: manualEntry.start,
    end: manualEntry.end,
    onApplyChange: applyChange,
    syncEndWithStart: true,
  })

  const handleSaveDurationOnly = async () => {
    setDurationLimitMessage(null)

    if (durationOnlySeconds > MAX_MANUAL_DURATION_SECONDS) {
      setDurationLimitMessage(DURATION_LIMIT_MESSAGE)
      return
    }

    const validationError = durationOnlyValidationError ?? durationParseError
    if (validationError) {
      setError(validationError)
      return
    }

    const entryDateUtc = dateInputToUtcIso(durationOnlyDate)
    if (!entryDateUtc) {
      setError('Enter a valid date.')
      return
    }

    setError(null)

    try {
      await updateEntry(entry.id, {
        description: description.trim() || undefined,
        entryDateUtc,
        durationSeconds: durationOnlySeconds,
        ...associations.payload,
      })
      onSaved?.()
      onClose()
    } catch (err) {
      if (isDurationLimitError(err)) {
        setDurationLimitMessage(apiErrorMessage(err, DURATION_LIMIT_MESSAGE))
        return
      }

      if (err instanceof ApiError && err.status === 403) {
        setError(apiErrorMessage(err, 'This entry cannot be edited.'))
        return
      }

      setError(apiErrorMessage(err, 'Could not save changes.'))
    }
  }

  const handleSave = async () => {
    setDurationLimitMessage(null)

    if (manualEntry.durationSeconds > MAX_MANUAL_DURATION_SECONDS) {
      setDurationLimitMessage(DURATION_LIMIT_MESSAGE)
      return
    }

    await overlapAlert.saveOrShowOverlapAlert({
      onClearError: () => setError(null),
      validationError: validation.error,
      onValidationError: setError,
      save: async () => {
        await updateEntry(entry.id, {
          description: description.trim() || undefined,
          startedAtUtc: manualEntry.start.toISOString(),
          endedAtUtc: manualEntry.end.toISOString(),
          ...associations.payload,
        })
        onSaved?.()
        onClose()
      },
      onOtherError: (err) => {
        if (isDurationLimitError(err)) {
          setDurationLimitMessage(
            apiErrorMessage(err, DURATION_LIMIT_MESSAGE),
          )
          return
        }

        if (err instanceof ApiError && err.status === 403) {
          setError(apiErrorMessage(err, 'This entry cannot be edited.'))
          return
        }

        setError(apiErrorMessage(err, 'Could not save changes.'))
      },
    })
  }

  return (
    <>
      <Modal
        title="Edit time entry"
        subtitle={
          isDurationOnly
            ? 'Update description, project, tags, duration, and billable status.'
            : 'Update description, project, tags, times, and billable status.'
        }
        onClose={onClose}
      >
        {weekLock.locked && (
          <WeekLockBanner
            status={weekLock.status}
            className="mb-4 rounded-lg bg-surface-muted px-3.5 py-2.5"
          />
        )}

        <TimeEntryFields
          description={description}
          onDescriptionChange={setDescription}
          associations={associations}
          knownTags={entry.tags}
          disabled={isSavingEdit}
          error={blockingError}
          timeFields={
            isDurationOnly ? (
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
                disabled={isSavingEdit}
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
                disabled={isSavingEdit}
              />
            )
          }
        />

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
            disabled={isSavingEdit || Boolean(blockingError) || weekLock.locked}
            onClick={() => void (isDurationOnly ? handleSaveDurationOnly() : handleSave())}
            className="flex-1 rounded-full bg-brand py-2.5 font-display text-body font-semibold text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSavingEdit ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </Modal>

      {durationLimitMessage ? (
        <DurationLimitModal
          message={durationLimitMessage}
          onDismiss={() => setDurationLimitMessage(null)}
        />
      ) : null}

      {showOverlapAlert && overlapWarning && !isDurationOnly ? (
        <OverlapAlertModal
          message={overlapWarning}
          onDismiss={overlapAlert.clearOverlapAlert}
        />
      ) : null}
    </>
  )
}
