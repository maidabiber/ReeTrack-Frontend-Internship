import { useRef, useState } from 'react'
import { Icon } from '../ui/Icon'
import { useDismissOnOutside } from '../../hooks/useDismissOnOutside'
import { DATE_RANGE_OPTIONS, type DateRangeKey } from '../../lib/dateRangeFilter'

/**
 * The list-view date filter — presets only, applied client-side over entries already
 * in TimerContext. Keeps the pill's original styling so nothing regresses visually.
 */
export function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRangeKey
  onChange: (key: DateRangeKey) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useDismissOnOutside(rootRef, open, () => setOpen(false), { closeOnEscape: true })

  const active = DATE_RANGE_OPTIONS.find((option) => option.key === value) ?? DATE_RANGE_OPTIONS[0]

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-navy/[0.06] bg-white px-3.5 py-2 font-display text-sm font-bold text-navy shadow-float"
      >
        <Icon name="calendar" className="size-icon-sm opacity-55" />
        <span className="hidden sm:inline">{active.label}</span>
        <span className="sm:hidden">{active.shortLabel}</span>
        <Icon name="chevron-down" className="h-3 w-3 opacity-45" />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="Date range"
          className="absolute top-[calc(100%+6px)] left-0 z-40 min-w-[9.5rem] overflow-hidden rounded-xl bg-white p-menu shadow-dropdown"
        >
          {DATE_RANGE_OPTIONS.map((option) => {
            const selected = option.key === value
            return (
              <button
                key={option.key}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(option.key)
                  setOpen(false)
                }}
                className={`flex w-full items-center rounded-xs px-2.5 py-compact text-left text-caption hover:bg-surface-muted ${
                  selected ? 'font-bold text-navy' : 'font-medium text-navy'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
