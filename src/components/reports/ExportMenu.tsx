import { useRef, useState } from 'react'
import type { ReportExportFormat } from '../../api/reports'
import { useDismissOnOutside } from '../../hooks/useDismissOnOutside'
import { Icon } from '../ui/Icon'

const EXPORT_OPTIONS: ReadonlyArray<{ format: ReportExportFormat; label: string }> = [
  { format: 'csv', label: 'CSV' },
  { format: 'xlsx', label: 'Excel' },
  { format: 'pdf', label: 'PDF' },
]

/**
 * Export split-button for the summary report.
 *
 * Presented as a listbox rather than a menu: `role="menu"` carries an expectation of
 * arrow-key roving focus that a three-item popover doesn't earn, and claiming it
 * without implementing it is worse for screen-reader users than not claiming it.
 * Mirrors TrackerModeMenu, which is the established dropdown pattern here.
 */
export function ExportMenu({
  exporting,
  onExport,
  disabled,
}: {
  exporting: ReportExportFormat | null
  onExport: (format: ReportExportFormat) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const menuOpen = open && !disabled && exporting === null
  useDismissOnOutside(rootRef, menuOpen, () => setOpen(false), { closeOnEscape: true })

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={menuOpen}
        disabled={disabled || exporting !== null}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-body font-medium text-white transition hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Icon name="download" className="h-4 w-4" />
        {exporting ? `Exporting ${exporting.toUpperCase()}…` : 'Export'}
        <Icon name="chevron-down" className="h-4 w-4 opacity-80" />
      </button>

      {menuOpen ? (
        <div
          role="listbox"
          aria-label="Export format"
          className="absolute top-[calc(100%+6px)] right-0 z-50 min-w-[9.5rem] overflow-hidden rounded-xl bg-white p-menu shadow-dropdown"
        >
          {EXPORT_OPTIONS.map((option) => (
            <button
              key={option.format}
              type="button"
              role="option"
              aria-selected={false}
              onClick={() => {
                setOpen(false)
                onExport(option.format)
              }}
              className="flex w-full items-center rounded-xs px-2.5 py-compact text-left text-caption font-medium text-navy hover:bg-surface-muted"
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
