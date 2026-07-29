import type { ReactNode } from 'react'
import { Icon } from '../ui/Icon'

/**
 * Page-level controls shared by the directory pages (projects, clients,
 * members, tags): header, segmented view tabs, search field, notice banner
 * and the load-error retry state. Table-level pieces live in DirectoryTable.
 */

/** Title, on-screen row count, and the icon-only primary action (design.md §5). */
export function DirectoryHeader({
  title,
  count,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: {
  title: string
  /** Row count beside the title; pass null to hide it (loading / error). */
  count: number | null
  actionLabel: string
  onAction: (event: React.MouseEvent) => void
  /** Optional text button shown before the primary + action. */
  secondaryActionLabel?: string
  onSecondaryAction?: (event: React.MouseEvent) => void
}) {
  return (
    <header className="flex items-center justify-between gap-4">
      <div className="flex items-baseline gap-2">
        <h1 className="font-display text-xl font-bold text-navy">{title}</h1>
        {count !== null && (
          <span className="font-mono text-sm text-navy/40 tabular-nums">
            {String(count).padStart(2, '0')}
          </span>
        )}
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        {secondaryActionLabel && onSecondaryAction && (
          <button
            type="button"
            onClick={onSecondaryAction}
            className="flex h-9 items-center rounded-full border-control border-navy bg-transparent px-4 font-display text-body font-semibold text-navy transition-colors hover:bg-navy/[0.08]"
          >
            {secondaryActionLabel}
          </button>
        )}
        <button
          type="button"
          onClick={onAction}
          aria-label={actionLabel}
          title={actionLabel}
          className="flex size-9 flex-shrink-0 items-center justify-center rounded-full bg-brand text-white transition-colors hover:bg-brand-deep"
        >
          <Icon name="plus" className="size-icon-md" />
        </button>
      </div>
    </header>
  )
}

/** Pill-shaped segmented control for switching the directory's view or filter. */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ value: T; label: string }>
  value: T
  onChange: (next: T) => void
}) {
  return (
    <div className="flex rounded-full bg-white p-segment shadow-soft" role="tablist">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          role="tab"
          aria-selected={value === option.value}
          className={`rounded-full px-3.5 py-compact font-mono text-eyebrow font-medium tracking-[0.12em] uppercase transition-colors ${
            value === option.value ? 'bg-navy text-cream' : 'text-navy/55 hover:text-navy'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function DirectorySearch({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="flex min-w-[180px] max-w-[280px] flex-1 items-center gap-1.5 rounded-full border-control border-navy/[0.08] bg-white px-3.5 py-compact focus-within:border-brand">
      <Icon name="search" className="h-3.5 w-3.5 flex-shrink-0 text-navy/50" />
      <input
        className="w-full border-none bg-transparent text-body text-navy outline-none placeholder:text-navy/45"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onClick={(event) => event.stopPropagation()}
      />
    </label>
  )
}

/** Transient confirmation banner (mutation results). */
export function NoticeBanner({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-brand-tint px-4 py-3 text-body font-medium text-navy">
      <span aria-hidden="true" className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand" />
      {children}
    </div>
  )
}

/** Load failure with a retry, rendered inside the table body. */
export function LoadErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
      <span className="text-body text-red">{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full border-control border-navy px-4 py-1.5 font-display text-sm font-semibold text-navy"
      >
        Try again
      </button>
    </div>
  )
}
