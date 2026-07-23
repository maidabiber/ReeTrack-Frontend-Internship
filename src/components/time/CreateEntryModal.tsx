import { useState } from 'react'
import { timeEntryApiErrorMessage } from '../../api/timeEntries'
import { useEntryAssociations } from '../../hooks/useEntryAssociations'
import { useTimer } from '../../hooks/useTimer'
import { useWeekLock } from '../../hooks/useWeekLock'
import { WeekLockBanner } from '../timesheet/WeekLockBanner'
import {
  applyManualFieldChange,
  createManualEntryFromCalendarEvent,
  MAX_MANUAL_DURATION_SECONDS,
  validateManualEntry,
} from '../../lib/manualEntry'
import { Modal } from '../ui/Modal'

import { DURATION_LIMIT_MESSAGE, isDurationLimitError } from '../../lib/timeEntryErrors'
import { useOverlapAlert } from '../../hooks/useOverlapAlert'
import { DurationLimitModal } from './durationLimitModal'
import { OverlapAlertModal } from './overlapAlert'
import { TimeEntryFields } from './TimeEntryFields'
import { ManualDateTimeFields } from './ManualDateTimeFields'

interface CreateEntryModalProps {
  initialDescription: string
  initialStart: Date
  initialEnd: Date
  onClose: () => void
}

export function CreateEntryModal({
  initialDescription,
  initialStart,
  initialEnd,
  onClose,
}: CreateEntryModalProps) {
  const { isSavingManual, addManualEntry } = useTimer()
  const [description, setDescription] = useState(initialDescription)
  const associations = useEntryAssociations({
    projectId: null,
    projectTaskId: null,
    tagIds: [],
    isBillable: true,
  })
  const [manualEntry, setManualEntry] = useState(() =>
    createManualEntryFromCalendarEvent({ start: initialStart, end: initialEnd }),
  )
  // Can't create an entry into a submitted/approved week (the backend 409s too).
  const weekLock = useWeekLock(manualEntry.start)
  const [error, setError] = useState<string | null>(null)
  const [durationLimitMessage, setDurationLimitMessage] = useState<string | null>(null)

  const validation = validateManualEntry(manualEntry, [], null)
  const overlapAlert = useOverlapAlert()
  const { overlapWarning, showOverlapAlert } = overlapAlert

  const endOrderError =
    manualEntry.end <= manualEntry.start ? 'End must be after start' : null
  const blockingError = validation.error ?? error

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
        await addManualEntry({
          description: description.trim() || undefined,
          startedAtUtc: manualEntry.start.toISOString(),
          endedAtUtc: manualEntry.end.toISOString(),
          ...associations.payload,
        })
        onClose()
      },
      onOtherError: (err) => {
        if (isDurationLimitError(err)) {
          setDurationLimitMessage(timeEntryApiErrorMessage(err, DURATION_LIMIT_MESSAGE))
          return
        }

        setError(timeEntryApiErrorMessage(err, 'Could not create the time entry.'))
      },
    })
  }

  return (
    <>
      <Modal
        title="Create time entry"
        subtitle="Review times, project, tags, and description, then save."
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
          knownTags={[]}
          disabled={isSavingManual}
          error={blockingError}
          timeFields={
            <div className="mb-3 grid grid-cols-1 items-start gap-x-3 gap-y-3 sm:grid-cols-2">
              <div className="min-w-0">
                <ManualDateTimeFields
                  variant="modal"
                  label="Start"
                  value={manualEntry.start}
                  onChange={(parsed) => {
                    setDurationLimitMessage(null)
                    overlapAlert.clearOverlapAlert()
                    setManualEntry((current) => applyManualFieldChange(current, 'start', parsed))
                  }}
                  fieldState={endOrderError ? 'error' : 'default'}
                  disabled={isSavingManual}
                />
              </div>
              <div className="min-w-0">
                <ManualDateTimeFields
                  variant="modal"
                  label="End"
                  value={manualEntry.end}
                  onChange={(parsed) => {
                    setDurationLimitMessage(null)
                    overlapAlert.clearOverlapAlert()
                    setManualEntry((current) => applyManualFieldChange(current, 'end', parsed))
                  }}
                  fieldState={endOrderError ? 'error' : 'default'}
                  disabled={isSavingManual}
                />
              </div>
            </div>
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
            disabled={isSavingManual || Boolean(blockingError) || weekLock.locked}
            onClick={() => void handleSave()}
            className="flex-1 rounded-full bg-brand py-2.5 font-display text-body font-semibold text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSavingManual ? 'Saving…' : 'Save'}
          </button>
        </div>
      </Modal>

      {durationLimitMessage ? (
        <DurationLimitModal
          message={durationLimitMessage}
          onDismiss={() => setDurationLimitMessage(null)}
        />
      ) : null}

      {showOverlapAlert && overlapWarning ? (
        <OverlapAlertModal
          message={overlapWarning}
          onDismiss={overlapAlert.clearOverlapAlert}
        />
      ) : null}
    </>
  )
}
