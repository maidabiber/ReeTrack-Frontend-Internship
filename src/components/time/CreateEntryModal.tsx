import { useState } from 'react'
import { timeEntryApiErrorMessage } from '../../api/timeEntries'
import { useTimer } from '../../hooks/useTimer'
import {
  applyManualFieldChange,
  createManualEntryFromCalendarEvent,
  formatManualDurationInput,
  MAX_MANUAL_DURATION_SECONDS,
  parseDatetimeLocal,
  parseDurationInput,
  toDatetimeLocalValue,
  validateManualEntry,
} from '../../lib/manualEntry'
import { Modal } from '../ui/Modal'
import { DURATION_LIMIT_MESSAGE, isDurationLimitError } from '../../lib/overlapErrors'
import { useOverlapConfirm } from '../../hooks/useOverlapConfirm'
import { DurationLimitModal, OverlapConfirmModal } from './overlapConfirm'

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
  const overlapConfirm = useOverlapConfirm()
  const { overlapWarning, showOverlapConfirm } = overlapConfirm

  const endOrderError =
    manualEntry.end <= manualEntry.start ? 'End must be after start' : null
  const blockingError = validation.error ?? error

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
        await addManualEntry({
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

        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <CreateField
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
            disabled={isSavingManual}
          />
          <CreateField
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
            disabled={isSavingManual}
          />
          <CreateField
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
            disabled={isSavingManual}
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
            onClick={() => void handleSave(false)}
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

      {showOverlapConfirm && overlapWarning ? (
        <OverlapConfirmModal
          message={overlapWarning}
          isSaving={isSavingManual}
          onCancel={overlapConfirm.clearOverlapConfirm}
          onConfirm={() => void handleSave(true)}
        />
      ) : null}
    </>
  )
}

function CreateField({
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
  type: 'datetime-local' | 'text'
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
      <span className="font-display text-[11.5px] font-semibold text-navy/70">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        className={`w-full rounded-[10px] border-[1.5px] px-3 py-[9px] text-[13px] text-navy outline-none focus:border-brand disabled:opacity-60 ${
          hasError ? 'border-red/40' : 'border-navy/[0.08]'
        } ${className}`}
      />
      {hint ? <span className="text-[11px] leading-tight text-red">{hint}</span> : null}
    </label>
  )
}