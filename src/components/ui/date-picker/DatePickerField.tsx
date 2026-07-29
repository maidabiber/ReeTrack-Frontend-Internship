import {
  Button,
  DatePicker,
  Dialog,
  Group,
  Popover,
} from 'react-aria-components'
import type { CalendarDate } from '@internationalized/date'
import { Icon } from '../Icon'
import { cn } from '../../../lib/utils'
import { formatPickerDate, formatPickerDateLabel, todayCalendarDate } from '../../../lib/calendarDate'
import type { ManualFieldState } from '../../time/ManualField'
import {
  FIELD_STATE_STYLES,
  MODAL_LABEL_CLASS,
  MODAL_PICKER_BUTTON_CLASS,
  MODAL_PICKER_GROUP_CLASS,
  MODAL_PICKER_VALUE_CLASS,
  POPOVER_CLASS,
  TRACKER_VALUE_CLASS,
  TRIGGER_BUTTON_SIZES,
  TRIGGER_GROUP_CLASS,
} from './fieldStyles'
import { PickerCalendar } from './PickerCalendar'

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
  placeholder = 'Choose date',
  disabled = false,
  fieldState = 'default',
  hideLabel = false,
  compact = false,
  variant = 'tracker',
  className = '',
}: DatePickerFieldProps) {
  const isModal = variant === 'modal'
  const triggerClass = isModal
    ? MODAL_PICKER_BUTTON_CLASS
    : compact
      ? TRIGGER_BUTTON_SIZES.date.compact
      : TRIGGER_BUTTON_SIZES.date.default
  const formatted = value
    ? compact && !isModal
      ? formatPickerDate(value, true)
      : formatPickerDateLabel(value)
    : placeholder

  return (
    <DatePicker
      value={value}
      aria-label={hideLabel ? label : undefined}
      onChange={(next) => {
        if (next) onChange(next)
      }}
      isDisabled={disabled}
      className={cn(
        isModal
          ? 'flex w-full min-w-0 flex-col'
          : hideLabel
            ? 'flex h-9 w-fit items-center'
            : 'flex w-fit flex-col gap-1',
        className,
      )}
    >
      {hideLabel ? null : (
        <span className={isModal ? MODAL_LABEL_CLASS : 'font-display text-sm font-semibold uppercase tracking-wide text-navy/45'}>
          {label}
        </span>
      )}

      <Group
        className={cn(
          isModal ? MODAL_PICKER_GROUP_CLASS : TRIGGER_GROUP_CLASS,
          FIELD_STATE_STYLES[fieldState],
          disabled && 'opacity-60',
        )}
      >
        <Button
          className={cn(
            'flex items-center text-left font-sans outline-none',
            isModal ? triggerClass : cn('h-full w-auto', triggerClass),
          )}
        >
          <Icon name="calendar" className="size-4 shrink-0 text-navy/40" />
          <span className={cn('min-w-0 truncate', isModal ? MODAL_PICKER_VALUE_CLASS : TRACKER_VALUE_CLASS)}>
            {formatted}
          </span>
        </Button>
      </Group>

      <Popover className={POPOVER_CLASS}>
        <Dialog className="outline-none">
          <div>
            <PickerCalendar />
            <div className="mt-3 border-t border-navy/[0.06] pt-3">
              <button
                type="button"
                onClick={() => onChange(todayCalendarDate())}
                className="w-full rounded-md py-1.5 text-sm font-semibold text-brand outline-none hover:bg-brand-tint"
              >
                Today
              </button>
            </div>
          </div>
        </Dialog>
      </Popover>
    </DatePicker>
  )
}
