import type { ReactNode } from 'react'

/**
 * Centered modal dialog with a dimmed overlay. Clicking the overlay (but not the
 * card) closes it via onClose.
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
  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-navy/35 p-4"
      onClick={onClose}
    >
      <div
        className={`${widthClassName} max-w-full rounded-3xl bg-white p-modal shadow-modal`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <h2 className="font-display text-base font-bold text-navy">{title}</h2>
        {subtitle && <p className="mt-1 mb-4.5 text-sm text-navy/60">{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}
