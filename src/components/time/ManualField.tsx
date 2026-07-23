import { cn } from '../../lib/utils'
import {
  MODAL_LABEL_CLASS,
  MODAL_PICKER_INPUT_CLASS,
  MODAL_PICKER_VALUE_CLASS,
  TRACKER_INPUT_CLASS,
} from '../ui/date-picker/fieldStyles'

export type ManualFieldState = 'default' | 'error' | 'warning'

const MANUAL_FIELD_STYLES: Record<ManualFieldState, string> = {
  default: 'border-navy/[0.08] focus:border-brand/40',
  error: 'border-orange/30 bg-orange-tint/25 focus:border-orange/45',
  warning: 'border-yellow/35 bg-yellow-tint/40 focus:border-yellow/50',
}

export function ManualFormNotice({
  variant,
  message,
}: {
  variant: 'error' | 'warning'
  message: string
}) {
  const styles = {
    error: 'border border-orange/15 bg-orange-tint/55',
    warning: 'border border-yellow/20 bg-yellow-tint/75',
  }[variant]

  const dotColor = {
    error: 'bg-orange',
    warning: 'bg-yellow',
  }[variant]

  return (
    <div
      className={`flex items-start gap-2.5 rounded-md px-3 py-2 ${styles}`}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      <span
        aria-hidden="true"
        className={`mt-menu h-1.5 w-1.5 flex-shrink-0 rounded-full ${dotColor}`}
      />
      <p className="min-w-0 flex-1 text-micro leading-[1.45] text-navy/75">{message}</p>
    </div>
  )
}

export function ManualField({
  label,
  type,
  value,
  onChange,
  onBlur,
  className = '',
  disabled,
  fieldState = 'default',
  hint,
  hideLabel = false,
  variant = 'modal',
}: {
  label: string
  type: 'datetime-local' | 'text' | 'date'
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  className?: string
  disabled?: boolean
  fieldState?: ManualFieldState
  hint?: string
  hideLabel?: boolean
  variant?: 'tracker' | 'modal'
}) {
  const isTracker = variant === 'tracker' && hideLabel

  if (isTracker) {
    return (
      <label className="block h-9 w-fit">
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          aria-label={label}
          aria-invalid={fieldState === 'error' ? true : undefined}
          className={cn(
            TRACKER_INPUT_CLASS,
            MANUAL_FIELD_STYLES[fieldState],
            disabled && 'opacity-60',
            className,
          )}
        />
      </label>
    )
  }

  return (
    <div className="flex w-full min-w-0 flex-col">
      {hideLabel ? null : <span className={MODAL_LABEL_CLASS}>{label}</span>}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        aria-label={hideLabel ? label : undefined}
        aria-invalid={fieldState === 'error' ? true : undefined}
        className={cn(
          MODAL_PICKER_INPUT_CLASS,
          MODAL_PICKER_VALUE_CLASS,
          MANUAL_FIELD_STYLES[fieldState],
          disabled && 'opacity-60',
          className,
        )}
      />
      {hint ? (
        <span className="text-xs leading-tight text-navy/50">{hint}</span>
      ) : null}
    </div>
  )
}
