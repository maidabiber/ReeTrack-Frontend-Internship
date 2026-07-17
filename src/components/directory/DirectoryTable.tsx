import type { ReactNode } from 'react'
import { Icon, type IconName } from '../ui/Icon'

/**
 * Table-level pieces shared by the directory pages: icon column headers,
 * coloured status text, skeleton row shell, and the per-row actions menu.
 * Each page keeps its own GRID template and cell content — these components
 * only own the chrome that must stay identical across directories.
 */

/** Icon-only column header; the label lives in a tooltip and for screen readers. */
export function HeaderCell({
  icon,
  label,
  alignEnd,
}: {
  icon: IconName
  label: string
  alignEnd?: boolean
}) {
  return (
    <div title={label} className={`flex items-center py-1.5 text-brand ${alignEnd ? 'justify-end' : ''}`}>
      <Icon name={icon} className="h-4 w-4" />
      <span className="sr-only">{label}</span>
    </div>
  )
}

/* Role/status are plain text, told apart by colour and weight only — no
 * badge chrome (design.md). Pass a colour class from the page's palette. */
export function StatusMark({ label, colorClassName }: { label: string; colorClassName: string }) {
  return <span className={`truncate text-caption font-medium ${colorClassName}`}>{label}</span>
}

/**
 * Ghost-row shell while a directory loads: the page supplies its GRID class
 * and cells matching the real rows' geometry.
 */
export function SkeletonRow({
  gridClassName,
  index,
  children,
}: {
  gridClassName: string
  index: number
  children: ReactNode
}) {
  return (
    <div
      aria-hidden="true"
      className={`${gridClassName} motion-safe:animate-pulse`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {children}
    </div>
  )
}

/** The row's trailing ⋯ trigger plus its glass dropdown of RowMenuItems. */
export function RowMenu({
  open,
  onToggle,
  ariaLabel = 'Row actions',
  children,
}: {
  open: boolean
  onToggle: (event: React.MouseEvent) => void
  ariaLabel?: string
  children: ReactNode
}) {
  return (
    <div className="relative flex justify-end">
      <button
        type="button"
        onClick={onToggle}
        aria-label={ariaLabel}
        className="flex h-6 w-6 items-center justify-center rounded-xs text-navy/50 hover:bg-surface-muted hover:text-navy"
      >
        <Icon name="more" className="h-[15px] w-[15px]" />
      </button>
      {open && (
        <div className="absolute top-[calc(100%+4px)] right-0 z-30 min-w-[170px] rounded-xl bg-white/80 p-menu shadow-dropdown backdrop-blur-xl">
          {children}
        </div>
      )}
    </div>
  )
}

export function RowMenuItem({
  icon,
  label,
  danger,
  disabled,
  title,
  onClick,
}: {
  icon: IconName
  label: string
  danger?: boolean
  disabled?: boolean
  title?: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={(event) => {
        event.stopPropagation()
        onClick?.()
      }}
      className={`flex w-full items-center gap-2 rounded-xs px-2.5 py-2 text-left text-caption font-medium ${
        disabled
          ? 'cursor-not-allowed text-navy/35'
          : `hover:bg-surface-muted ${danger ? 'text-red' : 'text-navy'}`
      }`}
    >
      <Icon name={icon} className={`size-icon-sm ${danger && !disabled ? 'opacity-80' : 'opacity-65'}`} />
      {label}
    </button>
  )
}
