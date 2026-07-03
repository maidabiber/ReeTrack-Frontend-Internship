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
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-navy/35 p-4"
      onClick={onClose}
    >
      <div
        className="w-[360px] max-w-full rounded-[20px] bg-white p-[26px] shadow-[0_24px_56px_rgba(31,43,77,0.22)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <h2 className="font-display text-base font-bold text-navy">{title}</h2>
        {subtitle && <p className="mt-1 mb-[18px] text-[12.5px] text-navy/60">{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}
