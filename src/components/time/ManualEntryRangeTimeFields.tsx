import type { CalendarDate } from '@internationalized/date'
import type { ManualFieldState } from './ManualField'
import { DateTimePickerField, TimeSegmentField } from '../ui/date-picker'
import { cn } from '../../lib/utils'

type ManualEntryRangeTimeFieldsProps = {
  variant: 'modal' | 'tracker'
  startDateCalendarValue: CalendarDate
  startTimeInput: string
  endTimeInput: string
  onStartDateChange: (cd: CalendarDate) => void
  onStartTimeChange: (value: string) => void
  onEndTimeChange: (value: string) => void
  fieldState?: ManualFieldState
  disabled?: boolean
  layout?: 'modal-grid' | 'tracker-inline'
  className?: string
}

export function ManualEntryRangeTimeFields({
  variant,
  startDateCalendarValue,
  startTimeInput,
  endTimeInput,
  onStartDateChange,
  onStartTimeChange,
  onEndTimeChange,
  fieldState = 'default',
  disabled = false,
  layout = variant === 'modal' ? 'modal-grid' : 'tracker-inline',
  className,
}: ManualEntryRangeTimeFieldsProps) {
  const startField = (
    <DateTimePickerField
      variant={variant}
      label={variant === 'modal' ? 'Date & start time' : 'Start'}
      hideLabel={layout === 'tracker-inline'}
      dateValue={startDateCalendarValue}
      timeValue={startTimeInput}
      onDateChange={onStartDateChange}
      onTimeChange={onStartTimeChange}
      fieldState={fieldState}
      disabled={disabled}
    />
  )

  const endField = (
    <TimeSegmentField
      variant={variant}
      label="End time"
      hideLabel={layout === 'tracker-inline'}
      value={endTimeInput}
      onChange={onEndTimeChange}
      fieldState={fieldState}
      disabled={disabled}
    />
  )

  if (layout === 'tracker-inline') {
    return (
      <>
        {startField}
        {endField}
      </>
    )
  }

  return (
    <div
      className={cn(
        'mb-3 grid grid-cols-1 items-start gap-x-3 gap-y-3 sm:grid-cols-2',
        className,
      )}
    >
      <div className="min-w-0 sm:col-span-2">{startField}</div>
      <div className="min-w-0 sm:col-span-2">{endField}</div>
    </div>
  )
}
