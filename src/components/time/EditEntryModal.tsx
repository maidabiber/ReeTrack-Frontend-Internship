import { useState } from 'react'
import { ApiError } from '../../api/client'
import { timeEntryApiErrorMessage } from '../../api/timeEntries'
import { useTimer } from '../../hooks/useTimer'
import {
  applyManualFieldChange,
  createManualEntryFromTimeEntry,
  dateInputToUtcIso,
  entryDateToDateInputValue,
  formatManualDurationInput,
  MAX_MANUAL_DURATION_SECONDS,
  parseDatetimeLocal,
  parseDurationInput,
  toDatetimeLocalValue,
  validateDurationOnlyEntry,
  validateManualEntry,
} from '../../lib/manualEntry'
import type { TimeEntry } from '../../types/timeEntry'
import { Modal } from '../ui/Modal'
import { DURATION_LIMIT_MESSAGE, isDurationLimitError } from '../../lib/overlapErrors'
import { useOverlapConfirm } from '../../hooks/useOverlapConfirm'
import { DurationLimitModal, OverlapConfirmModal } from './overlapConfirm'

export function EditEntryModal({ entry, onClose }: { entry: TimeEntry; onClose: () => void }) {
  const isDurationOnly = entry.mode === 'DurationOnly'
  const { isSavingEdit, updateEntry } = useTimer()
  const [description, setDescription] = useState(entry.description ?? '')
  const [isBillable, setIsBillable] = useState(entry.isBillable)
  const [manualEntry, setManualEntry] = useState(() => createManualEntryFromTimeEntry(entry))
  const [durationDraft, setDurationDraft] = useState<string | null>(null)
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

  const durationInput =
    durationDraft ?? formatManualDurationInput(manualEntry.durationSeconds)

  const validation = validateManualEntry(manualEntry, [], null)
  const durationOnlyValidationError = validateDurationOnlyEntry(durationOnlySeconds)

  const overlapConfirm = useOverlapConfirm()
  const { overlapWarning, showOverlapConfirm } = overlapConfirm

  const endOrderError =
    manualEntry.end <= manualEntry.start ? 'End must be after start' : null
  const blockingError = isDurationOnly
    ? durationOnlyValidationError ?? durationParseError ?? error
    : validation.error ?? error

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
      await updateEntry({
        id: entry.id,
        description: description.trim() || undefined,
        startedAtUtc: entryDateUtc,
        durationSeconds: durationOnlySeconds,
        isBillable,
      })
      onClose()
    } catch (err) {
      if (isDurationLimitError(err)) {
        setDurationLimitMessage(timeEntryApiErrorMessage(err, DURATION_LIMIT_MESSAGE))
        return
      }

      if (err instanceof ApiError && err.status === 403) {
        setError(timeEntryApiErrorMessage(err, 'This entry cannot be edited.'))
        return
      }

      setError(timeEntryApiErrorMessage(err, 'Could not save changes.'))
    }
  }

  const handleSave = async (confirmOverlap = false) => {
    setDurationLimitMessage(null)

    if (manualEntry.durationSeconds > MAX_MANUAL_DURATION_SECONDS) {
      setDurationLimitMessage(DURATION_LIMIT_MESSAGE)
      return
    }

    await overlapConfirm.saveWithOverlapConfirm(confirmOverlap, {
      onClearError: () => setError(null),
      validationError: validation.error,
      onValidationError: setError,
      save: async (confirmedOverlap) => {
        await updateEntry({
          id: entry.id,
          description: description.trim() || undefined,
          startedAtUtc: manualEntry.start.toISOString(),
          endedAtUtc: manualEntry.end.toISOString(),
          isBillable,
          confirmOverlap: confirmedOverlap,
        })
        onClose()
      },
      onOtherError: (err) => {
        if (isDurationLimitError(err)) {
          setDurationLimitMessage(
            timeEntryApiErrorMessage(err, DURATION_LIMIT_MESSAGE),
          )
          return
        }

        if (err instanceof ApiError && err.status === 403) {
          setError(timeEntryApiErrorMessage(err, 'This entry cannot be edited.'))
          return
        }

        setError(timeEntryApiErrorMessage(err, 'Could not save changes.'))
      },
    })
  }

  return (
    <>
      <Modal
        title="Edit time entry"
        subtitle={
          isDurationOnly
            ? 'Update description, duration, and billable status.'
            : 'Update description, times, and billable status.'
        }
        onClose={onClose}
      >
        <div className="mb-3">
          <label className="mb-1.5 block font-display text-label font-semibold text-navy/70">
            Description
          </label>
          <input
            className="w-full rounded-md border-control border-navy/[0.08] px-3 py-field text-body text-navy outline-none focus:border-brand"
            placeholder="What did you work on?"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={isSavingEdit}
          />
        </div>

        {isDurationOnly ? (
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <EditField
              label="Date"
              type="date"
              value={durationOnlyDate}
              onChange={setDurationOnlyDate}
              disabled={isSavingEdit}
            />
            <EditField
              label="Duration"
              type="text"
              value={durationOnlyInput}
              onChange={(value) => {
                setDurationOnlyInput(value)
                setDurationParseError(null)
                setDurationLimitMessage(null)
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
              className="font-mono tabular-nums"
              hasError={Boolean(durationParseError)}
              hint={durationParseError ?? undefined}
              disabled={isSavingEdit}
            />
          </div>
        ) : (
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <EditField
              label="Start"
              type="datetime-local"
              value={toDatetimeLocalValue(manualEntry.start)}
              onChange={(value) => {
                const parsed = parseDatetimeLocal(value)
                if (!parsed) return
                setDurationLimitMessage(null)
                overlapConfirm.clearOverlapConfirm()
                setManualEntry((current) => applyManualFieldChange(current, 'start', parsed))
              }}
              hasError={Boolean(endOrderError)}
              disabled={isSavingEdit}
            />
            <EditField
              label="End"
              type="datetime-local"
              value={toDatetimeLocalValue(manualEntry.end)}
              onChange={(value) => {
                const parsed = parseDatetimeLocal(value)
                if (!parsed) return
                setDurationLimitMessage(null)
                overlapConfirm.clearOverlapConfirm()
                setManualEntry((current) => applyManualFieldChange(current, 'end', parsed))
              }}
              hint={endOrderError ?? undefined}
              hasError={Boolean(endOrderError)}
              disabled={isSavingEdit}
            />
            <EditField
              label="Duration"
              type="text"
              value={durationInput}
              onChange={(value) => {
                setDurationDraft(value)
                setDurationLimitMessage(null)
                overlapConfirm.clearOverlapConfirm()
                const parsed = parseDurationInput(value)
                if (parsed === null) return
                setManualEntry((current) => applyManualFieldChange(current, 'duration', parsed))
              }}
              onBlur={() => setDurationDraft(null)}
              className="font-mono tabular-nums"
              disabled={isSavingEdit}
            />
          </div>
        )}

        <label className="mb-3 flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={isBillable}
            onChange={(event) => setIsBillable(event.target.checked)}
            disabled={isSavingEdit}
            className="h-4 w-4 rounded border-navy/20 text-brand focus:ring-brand/30"
          />
          <span className="text-md font-medium text-navy/80">Billable</span>
        </label>

        {blockingError ? (
          <div className="mb-3 rounded-md bg-red-tint px-3 py-2.5 text-sm leading-[1.5] text-red">
            {blockingError}
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
          <button
            type="button"
            disabled={isSavingEdit || Boolean(blockingError)}
            onClick={() => void (isDurationOnly ? handleSaveDurationOnly() : handleSave(false))}
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

      {showOverlapConfirm && overlapWarning && !isDurationOnly ? (
        <OverlapConfirmModal
          message={overlapWarning}
          isSaving={isSavingEdit}
          onCancel={overlapConfirm.clearOverlapConfirm}
          onConfirm={() => void handleSave(true)}
        />
      ) : null}
    </>
  )
}

function EditField({
  label,
  type,
  value,
  onChange,
  onBlur,
  className = '',
  disabled,
  hasError = false,
  hint,
}: {
  label: string
  type: 'datetime-local' | 'text' | 'date'
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  className?: string
  disabled?: boolean
  hasError?: boolean
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
        className={`w-full rounded-md border-control px-3 py-field text-body text-navy outline-none focus:border-brand disabled:opacity-60 ${
          hasError ? 'border-red/40' : 'border-navy/[0.08]'
        } ${className}`}
      />
      {hint ? <span className="text-xs leading-tight text-red">{hint}</span> : null}
    </label>
  )
}
