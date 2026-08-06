import { Icon } from '../Icon'
import { cn } from '../../../lib/utils'
import type { ManualFieldState } from '../../time/ManualField'
import { FIELD_STATE_STYLES, MODAL_LABEL_CLASS } from './fieldStyles'
import { useTimeSegmentState } from './useTimeSegmentState'

type TimeSegmentFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  disabled?: boolean
  fieldState?: ManualFieldState
  hint?: string
  hideLabel?: boolean
  variant?: 'tracker' | 'modal'
  /** When true, render only the hh:mm controls (no outer border/label). */
  bare?: boolean
  className?: string
}

export function TimeSegmentField({
  label,
  value,
  onChange,
  onBlur,
  disabled = false,
  fieldState = 'default',
  hint,
  hideLabel = false,
  variant = 'modal',
  bare = false,
  className,
}: TimeSegmentFieldProps) {
  const isModal = variant === 'modal'
  const {
    displayHh,
    displayMm,
    timeError,
    hhRef,
    mmRef,
    onHhChange,
    onMmChange,
    onHhBlur,
    onMmBlur,
    onHhKeyDown,
    onMmKeyDown,
    onSegmentFocus,
    focusHour,
  } = useTimeSegmentState({ value, onChange, onBlur })

  const segments = (
    <div
      className="flex items-center gap-0.5 pl-2 pr-2.5"
      onClick={(e) => {
        if (disabled) return
        if ((e.target as HTMLElement).tagName === 'INPUT') return
        focusHour()
      }}
    >
      <Icon
        name="clock"
        className={cn(
          'mr-0.5 shrink-0 text-navy/30',
          bare || !isModal ? 'size-3.5' : 'size-4',
        )}
      />
      <input
        ref={hhRef}
        value={displayHh}
        onChange={(e) => onHhChange(e.target.value)}
        onFocus={onSegmentFocus}
        onBlur={(e) => onHhBlur(e.target.value)}
        onKeyDown={onHhKeyDown}
        disabled={disabled}
        inputMode="numeric"
        maxLength={2}
        aria-label="Hour (24-hour)"
        className={cn(
          'w-4 bg-transparent py-2 text-center text-[13px] font-mono tabular-nums text-navy outline-none',
          timeError && 'text-orange',
        )}
      />
      <span className="select-none text-[13px] font-mono tabular-nums text-navy">:</span>
      <input
        ref={mmRef}
        value={displayMm}
        onChange={(e) => onMmChange(e.target.value)}
        onFocus={onSegmentFocus}
        onBlur={(e) => onMmBlur(e.target.value)}
        onKeyDown={onMmKeyDown}
        disabled={disabled}
        inputMode="numeric"
        maxLength={2}
        aria-label="Minute"
        className={cn(
          'w-4 bg-transparent py-2 text-center text-[13px] font-mono tabular-nums text-navy outline-none',
          timeError && 'text-orange',
        )}
      />
    </div>
  )

  if (bare) {
    return segments
  }

  if (variant === 'tracker' && hideLabel) {
    return (
      <div className={cn('block h-9 w-fit', className)}>
        <div
          className={cn(
            'flex h-9 items-center overflow-hidden rounded-lg border bg-white shadow-[0_1px_2px_rgba(31,43,77,0.04)] transition-colors',
            FIELD_STATE_STYLES[fieldState],
            disabled && 'opacity-60 cursor-not-allowed',
          )}
          onClick={disabled ? undefined : focusHour}
        >
          {segments}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex w-full min-w-0 flex-col', className)}>
      {hideLabel ? null : (
        <span
          className={
            isModal
              ? MODAL_LABEL_CLASS
              : 'font-display text-sm font-semibold uppercase tracking-wide text-navy/45'
          }
        >
          {label}
        </span>
      )}
      <div
        className={cn(
          'flex items-stretch overflow-hidden rounded-lg border bg-white shadow-[0_1px_2px_rgba(31,43,77,0.04)] transition-colors',
          isModal ? 'h-[33px] rounded-md' : 'h-9',
          FIELD_STATE_STYLES[fieldState],
          disabled && 'opacity-60 cursor-not-allowed',
        )}
        onClick={disabled ? undefined : focusHour}
      >
        {segments}
      </div>
      {hint ? <span className="text-xs leading-tight text-navy/50">{hint}</span> : null}
    </div>
  )
}
