export type ManualFieldState = 'default' | 'error' | 'warning'

const MANUAL_FIELD_STYLES: Record<ManualFieldState, string> = {
  default: 'border-navy/10 focus:border-brand/40',
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
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-display text-sm font-semibold uppercase tracking-wide text-navy/45">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        aria-invalid={fieldState === 'error' ? true : undefined}
        className={`rounded-md border bg-surface-muted px-2.5 py-1.5 text-sm text-navy outline-none transition-colors disabled:opacity-60 ${MANUAL_FIELD_STYLES[fieldState]} ${className}`}
      />
      {hint ? (
        <span className="text-xs leading-tight text-navy/50">{hint}</span>
      ) : null}
    </label>
  )
}
