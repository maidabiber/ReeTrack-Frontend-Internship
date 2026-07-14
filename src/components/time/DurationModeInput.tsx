import { forwardRef, useCallback, useImperativeHandle, useState } from 'react'
import { Icon } from '../ui/Icon'
import { ManualField, ManualFormNotice } from './ManualField'
import {
  DURATION_LIMIT_MESSAGE,
  DurationLimitModal,
  isDurationLimitError,
} from './overlapConfirm'
import { useTimer } from '../../hooks/useTimer'
import { timeEntryApiErrorMessage } from '../../api/timeEntries'
import {
  dateInputToUtcIso,
  formatManualDurationInput,
  MAX_MANUAL_DURATION_SECONDS,
  parseDurationInput,
  toDateInputValue,
  validateDurationOnlyEntry,
} from '../../lib/manualEntry'

const DEFAULT_DURATION_ONLY_SECONDS = 60 * 60

export type DurationModeInputHandle = {
  saveEntry: () => Promise<void>
}

type DurationModeInputProps = {
  description: string
  onClearDescription: () => void
  onClearShareNotice: () => void
}

export const DurationModeInput = forwardRef<DurationModeInputHandle, DurationModeInputProps>(
  function DurationModeInput({ description, onClearDescription, onClearShareNotice }, ref) {
    const { isInitializing, isSavingManual, addDurationEntry } = useTimer()

    const [durationOnlySeconds, setDurationOnlySeconds] = useState(DEFAULT_DURATION_ONLY_SECONDS)
    const [durationOnlyInput, setDurationOnlyInput] = useState(
      formatManualDurationInput(DEFAULT_DURATION_ONLY_SECONDS),
    )
    const [durationOnlyDate, setDurationOnlyDate] = useState(() => toDateInputValue(new Date()))
    const [localError, setLocalError] = useState<string | null>(null)
    const [durationParseError, setDurationParseError] = useState<string | null>(null)
    const [durationLimitMessage, setDurationLimitMessage] = useState<string | null>(null)

    const durationOnlyValidationError = validateDurationOnlyEntry(durationOnlySeconds)
    const blockingError = durationOnlyValidationError ?? durationParseError ?? localError

    const clearFeedback = () => {
      setLocalError(null)
      setDurationParseError(null)
      setDurationLimitMessage(null)
      onClearShareNotice()
    }

    const saveEntry = useCallback(async () => {
      setDurationLimitMessage(null)

      if (durationOnlySeconds > MAX_MANUAL_DURATION_SECONDS) {
        setDurationLimitMessage(DURATION_LIMIT_MESSAGE)
        return
      }

      const validationError = durationOnlyValidationError ?? durationParseError
      if (validationError) {
        setLocalError(validationError)
        return
      }

      const entryDateUtc = dateInputToUtcIso(durationOnlyDate)
      if (!entryDateUtc) {
        setLocalError('Enter a valid date.')
        return
      }

      setLocalError(null)

      try {
        await addDurationEntry({
          description: description.trim() || undefined,
          entryDateUtc,
          durationSeconds: durationOnlySeconds,
        })
        onClearDescription()
        setDurationOnlySeconds(DEFAULT_DURATION_ONLY_SECONDS)
        setDurationOnlyInput(formatManualDurationInput(DEFAULT_DURATION_ONLY_SECONDS))
        setDurationOnlyDate(toDateInputValue(new Date()))
      } catch (err) {
        if (isDurationLimitError(err)) {
          setDurationLimitMessage(timeEntryApiErrorMessage(err, DURATION_LIMIT_MESSAGE))
          return
        }

        setLocalError(timeEntryApiErrorMessage(err, 'Could not save the duration entry.'))
      }
    }, [
      addDurationEntry,
      description,
      durationOnlyDate,
      durationOnlySeconds,
      durationOnlyValidationError,
      durationParseError,
      onClearDescription,
    ])

    useImperativeHandle(ref, () => ({ saveEntry }), [saveEntry])

    return (
      <>
        <div className="flex min-w-0 flex-col items-end gap-2">
          <div className="flex flex-wrap items-end justify-end gap-2">
            <ManualField
              label="Date"
              type="date"
              value={durationOnlyDate}
              onChange={setDurationOnlyDate}
              className="w-duration-date"
              disabled={isInitializing || isSavingManual}
            />
            <ManualField
              label="Duration"
              type="text"
              value={durationOnlyInput}
              onChange={(value) => {
                setDurationOnlyInput(value)
                setDurationParseError(null)
                clearFeedback()
                const parsed = parseDurationInput(value)
                if (parsed === null) return
                setDurationOnlySeconds(parsed)
              }}
              onBlur={() => {
                const parsed = parseDurationInput(durationOnlyInput)
                if (durationOnlyInput.trim() && parsed === null) {
                  setDurationParseError('Use 1:30 or 1:30:00')
                  return
                }
                setDurationParseError(null)
                setDurationOnlyInput(formatManualDurationInput(durationOnlySeconds))
              }}
              hint={durationParseError ?? undefined}
              fieldState={durationParseError ? 'error' : 'default'}
              className="w-duration-value font-mono"
              disabled={isInitializing || isSavingManual}
            />

            <button
              type="button"
              aria-label="Add duration entry"
              disabled={isInitializing || isSavingManual || Boolean(blockingError)}
              onClick={() => void saveEntry()}
              className="mb-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-brand text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon name="plus" className="size-icon-md" />
            </button>
          </div>

          {blockingError ? (
            <ManualFormNotice variant="error" message={blockingError} />
          ) : null}
        </div>

        {durationLimitMessage ? (
          <DurationLimitModal
            message={durationLimitMessage}
            onDismiss={() => setDurationLimitMessage(null)}
          />
        ) : null}
      </>
    )
  },
)
