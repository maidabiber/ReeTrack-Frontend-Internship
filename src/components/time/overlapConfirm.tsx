import { useState, type ReactNode } from 'react'
import { ApiError } from '../../api/client'
import { timeEntryApiErrorMessage } from '../../api/timeEntries'
import { Icon } from '../ui/Icon'

export const DURATION_LIMIT_MESSAGE =
  'Duration cannot exceed 24 hours. Please shorten the entry before saving.'

export function isOverlapConflictError(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 409) return false
  const message = timeEntryApiErrorMessage(error, '')
  return message.toLowerCase().includes('overlap')
}

export function isDurationLimitError(error: unknown): boolean {
  const message = timeEntryApiErrorMessage(error, '')
  return message.toLowerCase().includes('24 hour')
}

export function useOverlapConfirm() {
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null)
  const [pendingOverlapConfirm, setPendingOverlapConfirm] = useState(false)

  const clearOverlapConfirm = () => {
    setOverlapWarning(null)
    setPendingOverlapConfirm(false)
  }

  const showOverlapConfirm = Boolean(pendingOverlapConfirm && overlapWarning)

  const saveWithOverlapConfirm = async (
    confirmOverlap: boolean,
    {
      validationError,
      onValidationError,
      onClearError,
      save,
      onOtherError,
    }: {
      validationError: string | null
      onValidationError: (message: string) => void
      onClearError?: () => void
      save: (confirmOverlap: boolean) => Promise<void>
      onOtherError?: (err: unknown) => void
    },
  ) => {
    onClearError?.()

    if (validationError) {
      onValidationError(validationError)
      return
    }

    try {
      await save(confirmOverlap)
      clearOverlapConfirm()
    } catch (err) {
      if (!confirmOverlap && isOverlapConflictError(err)) {
        setOverlapWarning(
          timeEntryApiErrorMessage(err, 'This entry overlaps with an existing entry.'),
        )
        setPendingOverlapConfirm(true)
        return
      }

      onOtherError?.(err)
    }
  }

  return {
    overlapWarning,
    pendingOverlapConfirm,
    showOverlapConfirm,
    clearOverlapConfirm,
    saveWithOverlapConfirm,
  }
}

function formatOverlapMessage(message: string) {
  const match = message.match(/^This entry overlaps with:\s*(.+)\.\s*Save anyway\?$/i)
  if (!match) return message

  const labels = match[1]
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean)

  if (labels.length === 0) return message

  return (
    <>
      This entry overlaps with:{' '}
      {labels.map((label, index) => (
        <span key={`${label}-${index}`}>
          {index > 0 ? ', ' : null}
          <strong className="font-semibold text-navy">{label}</strong>
        </span>
      ))}
      . Save anyway?
    </>
  )
}

function CenteredAlertModal({
  title,
  message,
  titleId,
  messageId,
  onDismiss,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  isSaving = false,
}: {
  title: string
  message: ReactNode
  titleId: string
  messageId: string
  onDismiss: () => void
  primaryLabel: string
  onPrimary: () => void
  secondaryLabel?: string
  isSaving?: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-110 flex items-center justify-center bg-navy/45 p-4"
      onClick={onDismiss}
      role="presentation"
    >
      <div
        className="w-[400px] max-w-full rounded-3xl bg-white p-modal shadow-modal"
        onClick={(event) => event.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
      >
        <div className="mb-5 flex items-start gap-3.5">
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-yellow-tint"
          >
            <Icon name="timer" className="h-[18px] w-[18px] text-yellow" />
          </span>
          <div className="min-w-0">
            <h2 id={titleId} className="font-display text-base font-bold text-navy">
              {title}
            </h2>
            <p id={messageId} className="mt-2 text-body leading-[1.55] text-navy/75">
              {message}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {secondaryLabel ? (
            <button
              type="button"
              onClick={onDismiss}
              disabled={isSaving}
              className="flex-1 rounded-full border-control border-navy bg-transparent py-2.5 font-display text-body font-semibold text-navy disabled:opacity-60"
            >
              {secondaryLabel}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onPrimary}
            disabled={isSaving}
            className="flex-1 rounded-full bg-brand py-2.5 font-display text-body font-semibold text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : primaryLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function OverlapConfirmModal({
  message,
  isSaving = false,
  onCancel,
  onConfirm,
}: {
  message: string
  isSaving?: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <CenteredAlertModal
      title="Time overlap"
      message={formatOverlapMessage(message)}
      titleId="overlap-confirm-title"
      messageId="overlap-confirm-message"
      onDismiss={onCancel}
      secondaryLabel="Cancel"
      primaryLabel="Save anyway"
      onPrimary={onConfirm}
      isSaving={isSaving}
    />
  )
}

export function DurationLimitModal({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <CenteredAlertModal
      title="Duration too long"
      message={message}
      titleId="duration-limit-title"
      messageId="duration-limit-message"
      onDismiss={onDismiss}
      primaryLabel="Got it"
      onPrimary={onDismiss}
    />
  )
}
