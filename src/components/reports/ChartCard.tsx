import type { ReactNode } from 'react'

/** Titled card wrapper for a single report chart or list. */
export function ChartCard({
  title,
  action,
  children,
}: {
  title: string
  /** Optional control on the title row, e.g. a "show all" toggle. */
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl bg-white px-5 py-4 shadow-card">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-body font-bold text-navy">{title}</h3>
        {action}
      </div>
      <span aria-hidden className="mt-1.5 mb-3 block h-px w-9 bg-brand-gradient" />
      {children}
    </div>
  )
}

export function EmptyNote({ text }: { text: string }) {
  return <p className="py-6 text-center text-body text-navy/50">{text}</p>
}
