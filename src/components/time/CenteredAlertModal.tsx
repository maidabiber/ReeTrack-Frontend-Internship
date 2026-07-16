import { type ReactNode } from 'react'
import { Icon } from '../ui/Icon'

export function CenteredAlertModal({
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