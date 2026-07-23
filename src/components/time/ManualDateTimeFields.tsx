import { DateTimePickerField } from '../ui/date-picker/DateTimePickerField'
import type { ManualFieldState } from './ManualField'

type ManualDateTimeFieldsProps = {
  label: string
  value: Date
  onChange: (value: Date) => void
  disabled?: boolean
  fieldState?: ManualFieldState
  hideLabel?: boolean
  compact?: boolean
  variant?: 'tracker' | 'modal'
}

export function ManualDateTimeFields({
  label,
  value,
  onChange,
  disabled = false,
  fieldState = 'default',
  hideLabel = false,
  compact = false,
  variant = 'tracker',
}: ManualDateTimeFieldsProps) {
  return (
    <DateTimePickerField
      label={label}
      value={value}
      onChange={onChange}
      disabled={disabled}
      fieldState={fieldState}
      hideLabel={hideLabel}
      compact={compact}
      variant={variant}
    />
  )
}
