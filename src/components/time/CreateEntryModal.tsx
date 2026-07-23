import { useState } from 'react'
import { timeEntryApiErrorMessage } from '../../api/timeEntries'
import { useTimer } from '../../hooks/useTimer'
import {
  applyManualFieldChange,
  createManualEntryFromCalendarEvent,
  formatManualDurationInput,
  MAX_MANUAL_DURATION_SECONDS,
  parseDurationInput,
  validateManualEntry,
} from '../../lib/manualEntry'
import { Modal } from '../ui/Modal'
import { ManualDateTimeFields } from './ManualDateTimeFields'
import { ManualField } from './ManualField'

import { DURATION_LIMIT_MESSAGE, isDurationLimitError } from '../../lib/timeEntryErrors'
import { useOverlapAlert } from '../../hooks/useOverlapAlert'
import { DurationLimitModal } from './durationLimitModal'
import { OverlapAlertModal } from './overlapAlert'
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
  const [isBillable, setIsBillable] = useState(true)
  const [manualEntry, setManualEntry] = useState(() =>
    createManualEntryFromCalendarEvent({ start: initialStart, end: initialEnd }),
  )
  const [durationDraft, setDurationDraft] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [durationLimitMessage, setDurationLimitMessage] = useState<string | null>(null)

  const durationInput =
    durationDraft ?? formatManualDurationInput(manualEntry.durationSeconds)

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
          isBillable,
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
        subtitle="Review times and description, then save."
        onClose={onClose}
      >
        <div className="mb-3">
          <label className="mb-1.5 block font-display text-[11.5px] font-semibold text-navy/70">
            Description
          </label>
          <input
            className="w-full rounded-[10px] border-[1.5px] border-navy/[0.08] px-3 py-[9px] text-[13px] text-navy outline-none focus:border-brand"
            placeholder="What did you work on?"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={isSavingManual}
          />
        </div>

        <div className="mb-3 flex flex-col gap-3">
          <ManualDateTimeFields
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
          <ManualDateTimeFields
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
          <ManualField
            label="Duration"
            type="text"
            value={durationInput}
            onChange={(value) => {
              setDurationDraft(value)
              setDurationLimitMessage(null)
              overlapAlert.clearOverlapAlert()
              const parsed = parseDurationInput(value)
              if (parsed === null) return
              setManualEntry((current) => applyManualFieldChange(current, 'duration', parsed))
            }}
            onBlur={() => setDurationDraft(null)}
            className="font-mono tabular-nums"
            disabled={isSavingManual}
            hint={endOrderError ?? undefined}
            fieldState={endOrderError ? 'error' : 'default'}
          />
        </div>

        <label className="mb-3 flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={isBillable}
            onChange={(event) => setIsBillable(event.target.checked)}
            disabled={isSavingManual}
            className="h-4 w-4 rounded border-navy/20 text-brand focus:ring-brand/30"
          />
          <span className="text-[13px] font-medium text-navy/80">Billable</span>
        </label>

        {blockingError ? (
          <div className="mb-3 rounded-[10px] bg-red-tint px-3 py-2.5 text-[12.5px] leading-[1.5] text-red">
            {blockingError}
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
          <button
            type="button"
            disabled={isSavingManual || Boolean(blockingError)}
            onClick={() => void handleSave()}
            className="flex-1 rounded-full bg-brand py-2.5 font-display text-[13px] font-semibold text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
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