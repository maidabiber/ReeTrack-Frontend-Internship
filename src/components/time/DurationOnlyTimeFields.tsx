import { useMemo } from 'react'
import type { CalendarDate } from '@internationalized/date'
import { dateToCalendarDate } from '../../lib/calendarDate'
import {
  formatManualDurationInput,
  parseDateInput,
  parseDurationInput,
  toDateInputValue,
} from '../../lib/manualEntry'
import { DatePickerField } from '../ui/date-picker'
import { ManualField } from './ManualField'
import { cn } from '../../lib/utils'

type DurationOnlyTimeFieldsProps = {
  dateValue: string
  onDateChange: (dateInput: string) => void
  durationInput: string
  onDurationInputChange: (value: string) => void
  durationSeconds: number
  onDurationSecondsChange: (seconds: number) => void
  durationParseError: string | null
  onDurationParseErrorChange: (error: string | null) => void
  onClearDurationLimit?: () => void
  disabled?: boolean
  variant?: 'tracker' | 'modal'
  className?: string
}

export function DurationOnlyTimeFields({
  dateValue,
  onDateChange,
  durationInput,
  onDurationInputChange,
  durationSeconds,
  onDurationSecondsChange,
  durationParseError,
  onDurationParseErrorChange,
  onClearDurationLimit,
  disabled = false,
  variant = 'modal',
  className,
}: DurationOnlyTimeFieldsProps) {
  const calendarDate = useMemo(() => {
    const parsed = parseDateInput(dateValue)
    return parsed ? dateToCalendarDate(parsed) : dateToCalendarDate(new Date())
  }, [dateValue])

  const handleDateChange = (nextDate: CalendarDate) => {
    onDateChange(
      toDateInputValue(new Date(nextDate.year, nextDate.month - 1, nextDate.day)),
    )
  }

  return (
    <div
      className={cn(
        'mb-3 grid grid-cols-1 items-start gap-x-3 gap-y-3 sm:grid-cols-2',
        className,
      )}
    >
      <div className="min-w-0">
        <DatePickerField
          variant={variant}
          label="Date"
          value={calendarDate}
          onChange={handleDateChange}
          disabled={disabled}
        />
      </div>
      <div className="min-w-0">
        <ManualField
          variant={variant}
          label="Duration"
          type="text"
          value={durationInput}
          onChange={(value) => {
            onDurationInputChange(value)
            onDurationParseErrorChange(null)
            onClearDurationLimit?.()
            const parsed = parseDurationInput(value)
            if (parsed === null) return
            onDurationSecondsChange(parsed)
          }}
          onBlur={() => {
            const parsed = parseDurationInput(durationInput)
            if (durationInput.trim() && parsed === null) {
              onDurationParseErrorChange('Use 1:30 or 1:30:00')
              return
            }
            onDurationParseErrorChange(null)
            onDurationInputChange(formatManualDurationInput(durationSeconds))
          }}
          className="font-mono tabular-nums"
          fieldState={durationParseError ? 'error' : 'default'}
          hint={durationParseError ?? undefined}
          disabled={disabled}
        />
      </div>
    </div>
  )
}
