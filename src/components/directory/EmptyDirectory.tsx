import type { MouseEvent, ReactNode } from 'react'


export function EmptyDirectory({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string
  description?: string
  actionLabel?: string
  onAction?: (event: MouseEvent) => void
}): ReactNode {
  const showAction = actionLabel != null && onAction != null

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white px-5 py-14 text-center shadow-card">
      <span aria-hidden="true" className="absolute -top-12 -right-8 h-36 w-36 rounded-full bg-brand-veil" />
      <span aria-hidden="true" className="absolute -bottom-14 -left-8 h-40 w-40 rounded-full bg-brand-tint" />
      <span aria-hidden="true" className="absolute top-9 left-[16%] h-7 w-7 -rotate-12 rounded-[9px] bg-brand-tint" />
      <span aria-hidden="true" className="absolute right-[20%] bottom-10 h-5 w-5 rotate-12 rounded-[7px] bg-brand-hi opacity-60" />
      <span aria-hidden="true" className="absolute top-[30%] right-[9%] h-10 w-10 rotate-6 rounded-[12px] bg-brand opacity-80" />
      <div className="relative">
        <p className="font-display text-md font-semibold text-navy">{title}</p>
        {description ? (
          <p className="mx-auto mt-1 max-w-[360px] text-body leading-[1.5] text-navy/60">{description}</p>
        ) : null}
        {showAction ? (
          <button
            type="button"
            onClick={onAction}
            className="mt-5 rounded-full bg-brand px-4.5 py-field font-display text-body font-semibold text-white transition-colors hover:bg-brand-deep"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  )
}
