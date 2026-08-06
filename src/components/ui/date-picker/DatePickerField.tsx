import { useState } from 'react'
import { Button, DatePicker, Group } from 'react-aria-components'
import type { CalendarDate } from '@internationalized/date'
import { Icon } from '../Icon'
import { cn } from '../../../lib/utils'
import { formatPickerDate, formatPickerDateLabel, todayCalendarDate } from '../../../lib/calendarDate'
import type { ManualFieldState } from '../../time/ManualField'
import {
  FIELD_STATE_STYLES,
  MODAL_LABEL_CLASS,
  MODAL_PICKER_VALUE_CLASS,
  TRACKER_INPUT_CLASS,
  TRACKER_VALUE_CLASS,
} from './fieldStyles'
import { PickerCalendar } from './PickerCalendar'
import { PickerPopover } from './PickerPopover'

type DatePickerFieldProps = {
  label: string
  value: CalendarDate | null
  onChange: (value: CalendarDate) => void
  placeholder?: string
  disabled?: boolean
  fieldState?: ManualFieldState
  hideLabel?: boolean
  compact?: boolean
  variant?: 'tracker' | 'modal'
  className?: string
}

export function DatePickerField({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  fieldState = 'default',
  hideLabel = false,
  compact = false,
  variant = 'tracker',
  className = '',
}: DatePickerFieldProps) {
  const isModal = variant === 'modal'
  const resolvedPlaceholder = placeholder ?? (isModal ? 'Pick date' : 'Choose date')
  const [isOpen, setIsOpen] = useState(false)

  const formatted = value
    ? compact && !isModal
      ? formatPickerDate(value, true)
      : formatPickerDateLabel(value)
    : resolvedPlaceholder

  const isPlaceholder = !value

  const handleToday = () => {
    onChange(todayCalendarDate())
    setIsOpen(false)
  }

  if (variant === 'tracker' && hideLabel) {
    return (
      <DatePicker
        value={value}
        aria-label={hideLabel ? label : undefined}
        onChange={(next) => {
          if (next) onChange(next)
        }}
        isDisabled={disabled}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        className={cn('flex h-9 w-fit items-center', className)}
      >
        <Group
          className={cn(
            TRACKER_INPUT_CLASS,
            'flex items-center gap-1.5 pr-1.5',
            FIELD_STATE_STYLES[fieldState],
            disabled && 'opacity-60',
          )}
        >
          <Button className="flex items-center gap-1.5 text-left font-sans outline-none">
            <Icon name="calendar" className="size-3.5 shrink-0 text-navy/40" />
            <span
              className={cn(
                'min-w-0 truncate text-sm tabular-nums',
                isPlaceholder ? 'text-navy/40' : 'font-medium text-navy',
              )}
            >
              {formatted}
            </span>
          </Button>
        </Group>
        <PickerPopover onToday={handleToday}>
          <PickerCalendar />
        </PickerPopover>
      </DatePicker>
    )
  }

  return (
    <DatePicker
      value={value}
      aria-label={hideLabel ? label : undefined}
      onChange={(next) => {
        if (next) onChange(next)
      }}
      isDisabled={disabled}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      className={cn(
        isModal ? 'flex w-full min-w-0 flex-col' : 'flex w-fit flex-col gap-1',
        className,
      )}
    >
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

      <Group
        className={cn(
          isModal
            ? 'flex h-[33px] w-full min-w-0 items-center overflow-hidden rounded-md border border-navy/[0.08] bg-white transition-colors'
            : 'flex h-9 w-fit items-center overflow-hidden rounded-lg border bg-white shadow-[0_1px_2px_rgba(31,43,77,0.04)] transition-colors',
          FIELD_STATE_STYLES[fieldState],
          isOpen && 'border-navy/30 ring-1 ring-navy/15',
          disabled && 'opacity-60',
        )}
      >
        <Button
          className={cn(
            'flex flex-1 items-center gap-2 px-3 text-left font-sans outline-none',
            isModal ? 'h-full min-w-0' : 'h-full gap-1.5 px-2.5',
          )}
        >
          <Icon name="calendar" className={cn('shrink-0 text-navy/40', isModal ? 'size-4' : 'size-3.5')} />
          <span
            className={cn(
              'min-w-0 truncate',
              isModal ? MODAL_PICKER_VALUE_CLASS : TRACKER_VALUE_CLASS,
              isPlaceholder && (isModal ? 'text-navy/30' : 'text-navy/40'),
            )}
          >
            {formatted}
          </span>
        </Button>
      </Group>

      <PickerPopover onToday={handleToday}>
        <PickerCalendar />
      </PickerPopover>
    </DatePicker>
  )
}
