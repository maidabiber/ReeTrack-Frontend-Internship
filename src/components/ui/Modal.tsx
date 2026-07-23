import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'

/**
 * Glass modal dialog: the page frosts behind an ink scrim, and the dialog is
 * a translucent white panel framed by the brand-gradient hairline (the same
 * treatment as the standalone auth card), with soft brand blobs behind the
 * glass. Clicking the scrim, the close button, or pressing Escape closes it.
 */
export function Modal({
  title,
  subtitle,
  onClose,
  children,
  widthClassName = 'w-[360px]',
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  /** Tailwind width class for the dialog card. Defaults to the narrow 360px form. */
  widthClassName?: string
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-md motion-safe:animate-fade"
      onClick={onClose}
    >
      <div
        className={`${widthClassName} max-w-full rounded-3xl bg-brand-gradient p-px shadow-modal motion-safe:animate-pop`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="relative rounded-3xl bg-canvas p-modal">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
          >
            <span className="absolute -top-16 -right-14 h-40 w-40 rounded-full bg-brand-veil/50" />
            <span className="absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-brand-tint/50" />
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full text-navy/45 transition-colors hover:bg-navy/[0.06] hover:text-navy"
            >
              <Icon name="x" className="h-3.5 w-3.5" />
            </button>
            <h2 className="pr-8 font-display text-base font-bold text-navy">{title}</h2>
            {subtitle && <p className="mt-1 mb-4.5 text-sm text-navy/60">{subtitle}</p>}
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
