import { useRef, useState } from 'react'
import { Icon } from '../ui/Icon'
import { useDismissOnOutside } from '../../hooks/useDismissOnOutside'

export type TrackerMode = 'timer' | 'manual' | 'duration'

const MODE_OPTIONS: { value: TrackerMode; label: string }[] = [
  { value: 'timer', label: 'Timer' },
  { value: 'manual', label: 'Manual' },
  { value: 'duration', label: 'Duration' },
]

/**
 * Chevron that opens a mode menu for the tracker split button.
 * Parent owns mode state; disabled while a timer is running.
 */
export function TrackerModeMenu({
  mode,
  onModeChange,
  disabled = false,
  buttonClassName,
}: {
  mode: TrackerMode
  onModeChange: (mode: TrackerMode) => void
  disabled?: boolean
  /** Extra classes for the chevron control (e.g. attached split styling). */
  buttonClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Keep the menu closed while disabled without an effect.
  const menuOpen = open && !disabled

  useDismissOnOutside(rootRef, menuOpen, () => setOpen(false))

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Change tracker mode"
        aria-expanded={menuOpen}
        aria-haspopup="listbox"
        disabled={disabled}
        title={disabled ? 'Stop the running timer before changing mode' : undefined}
        onClick={() => setOpen((v) => !v)}
        className={
          buttonClassName ??
          'flex h-11 w-9 flex-shrink-0 items-center justify-center text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60'
        }
      >
        <Icon name="chevron-down" className="h-3.5 w-3.5" />
      </button>

      {menuOpen ? (
        <div
          role="listbox"
          aria-label="Tracker mode"
          className="absolute top-[calc(100%+6px)] right-0 z-50 min-w-[9.5rem] overflow-hidden rounded-xl bg-white p-menu shadow-dropdown"
        >
          {MODE_OPTIONS.map((option) => {
            const selected = option.value === mode
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onModeChange(option.value)
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
