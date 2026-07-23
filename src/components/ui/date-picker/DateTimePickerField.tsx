import { useMemo, useState, type ReactNode } from 'react'
import { getLocalTimeZone, today, toCalendarDateTime } from '@internationalized/date'
import type { CalendarDateTime } from '@internationalized/date'
import {
  Button,
  DatePicker,
  Dialog,
  Group,
  Popover,
} from 'react-aria-components'
import type { DateValue } from 'react-aria-components'
import { Icon } from '../Icon'
import { cn } from '../../../lib/utils'
import {
  calendarDateTimeToDate,
  dateToCalendarDateTime,
  formatPickerDateTime,
} from '../../../lib/calendarDate'
import type { ManualFieldState } from '../../time/ManualField'
import { FIELD_STATE_STYLES, MODAL_LABEL_CLASS, MODAL_PICKER_BUTTON_CLASS, MODAL_PICKER_GROUP_CLASS, TRACKER_TIME_CLASS, TRACKER_VALUE_CLASS, TRIGGER_BUTTON_SIZES, TRIGGER_GROUP_CLASS } from './fieldStyles'
import { InputDateSegments } from './InputDateSegments'
import { PickerCalendar } from './PickerCalendar'
import { TIME_SLOTS, timeSlotId } from './timeSlots'

type DateTimePickerFieldProps = {
  label: string
  value: Date
  onChange: (value: Date) => void
  disabled?: boolean
  fieldState?: ManualFieldState
  hideLabel?: boolean
  compact?: boolean
  variant?: 'tracker' | 'modal'
  className?: string
}

function isCalendarDateTime(value: DateValue): value is CalendarDateTime {
  return 'hour' in value
}

export function DateTimePickerField({
  label,
  value,
  onChange,
  disabled = false,
  fieldState = 'default',
  hideLabel = false,
  compact = false,
  variant = 'tracker',
  className = '',
}: DateTimePickerFieldProps) {
  const isModal = variant === 'modal'
  const calendarValue = useMemo(() => dateToCalendarDateTime(value), [value])
  const [focusedValue, setFocusedValue] = useState<DateValue | null>(null)
  const [prevValueKey, setPrevValueKey] = useState(value.getTime())

  if (value.getTime() !== prevValueKey) {
    setPrevValueKey(value.getTime())
    setFocusedValue(null)
  }

  const pickerFocusedValue = focusedValue ?? calendarValue
  const formatted = useMemo(
    () => formatPickerDateTime(value, compact && !isModal),
    [value, compact, isModal],
  )

  const handleChange = (next: DateValue | null) => {
    if (!next || !isCalendarDateTime(next)) return
    onChange(calendarDateTimeToDate(next))
  }

  const handleTodayClick = () => {
    const nextDay = today(getLocalTimeZone())
    const next = isCalendarDateTime(calendarValue)
      ? toCalendarDateTime(nextDay).set({ hour: calendarValue.hour, minute: calendarValue.minute })
      : toCalendarDateTime(nextDay)

    onChange(calendarDateTimeToDate(next))
    setFocusedValue(next)
  }

  const handleTimeClick = (slotId: string) => {
    const slot = TIME_SLOTS.find((item) => item.id === slotId)
    if (!slot) return

    const base = isCalendarDateTime(calendarValue)
      ? calendarValue
      : toCalendarDateTime(today(getLocalTimeZone()))
    const next = base.set({ hour: slot.hour, minute: slot.minute })
    onChange(calendarDateTimeToDate(next))
  }

  const selectedTimeId =
    isCalendarDateTime(calendarValue)
      ? timeSlotId(calendarValue.hour, calendarValue.minute)
      : null

  const triggerClass = isModal
    ? MODAL_PICKER_BUTTON_CLASS
    : compact
      ? TRIGGER_BUTTON_SIZES.datetime.compact
      : TRIGGER_BUTTON_SIZES.datetime.default

  return (
    <DatePicker
      shouldCloseOnSelect={false}
      aria-label={hideLabel ? label : undefined}
      value={calendarValue}
      onChange={handleChange}
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
          <span className="min-w-0 truncate">
            {isModal ? (
              <>
                <span className="text-body text-navy">{formatted.date}</span>{' '}
                <span className="text-body text-navy/50">{formatted.time}</span>
              </>
            ) : (
              <>
                <span className={TRACKER_VALUE_CLASS}>{formatted.date}</span>{' '}
                <span className={TRACKER_TIME_CLASS}>{formatted.time}</span>
              </>
            )}
          </span>
        </Button>
      </Group>

      <Popover
        offset={8}
        placement="bottom end"
        className={({ isEntering, isExiting }) =>
          cn(
            'z-50 outline-none',
            isEntering && 'animate-in fade-in duration-150 ease-out',
            isExiting && 'animate-out fade-out duration-100 ease-in',
          )
        }
      >
        <Dialog className="rounded-2xl border border-navy/[0.08] bg-white shadow-dropdown outline-none">
          {({ close }) => (
            <>
              <div className="flex">
                <div className="flex flex-col px-5 py-4">
                  
                  <PickerCalendar focusedValue={pickerFocusedValue} onFocusChange={setFocusedValue} />
                  <div className="mt-3 flex flex-col gap-2 md:hidden">
                    <div className="flex gap-2">
                      <InputDateSegments compact />
                      <PickerActionButton onClick={handleTodayClick}>Today</PickerActionButton>
                    </div>
                    <label className="flex flex-col gap-1">
                      <span className="sr-only">Time</span>
                      <div className="relative">
                        <Icon
                          name="clock"
                          className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-navy/40"
                        />
                        <select
                          aria-label="Time"
                          value={selectedTimeId ?? ''}
                          onChange={(event) => handleTimeClick(event.target.value)}
                          className="h-8 w-full appearance-none rounded-md border border-navy/10 bg-surface-muted pl-8 pr-2 text-sm text-navy outline-none focus:border-brand/40"
                        >
                          <option value="" disabled>
                            Time
                          </option>
                          {TIME_SLOTS.map((slot) => (
                            <option key={slot.id} value={slot.id}>
                              {slot.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="relative hidden min-h-0 w-36 flex-col border-l border-navy/[0.06] md:flex">
                  <div className="px-4 pb-2 pt-5 text-center text-xs font-semibold uppercase tracking-wide text-navy/45">
                    Time
                  </div>
                  <ul className="flex max-h-72 min-h-0 flex-col gap-1 overflow-y-auto px-3 pb-4">
                    {TIME_SLOTS.map((slot) => {
                      const isSelected = selectedTimeId === slot.id
                      return (
                        <li key={slot.id}>
                          <PickerActionButton
                            onClick={() => handleTimeClick(slot.id)}
                            className={cn('w-full', isSelected && 'border-brand/30 bg-brand-tint text-brand')}
                          >
                            {slot.label}
                          </PickerActionButton>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>

              <div className="flex gap-2 border-t border-navy/[0.06] p-3">
                <div className="mr-auto hidden items-center gap-2 md:flex">
                  <InputDateSegments />
                  <PickerActionButton onClick={handleTodayClick}>Today</PickerActionButton>
                </div>

                <PickerActionButton onClick={close} className="max-md:flex-1">
                  Cancel
                </PickerActionButton>
                <PickerActionButton
                  onClick={close}
                  variant="primary"
                  className="max-md:flex-1"
                >
                  Apply
                </PickerActionButton>
              </div>
            </>
          )}
        </Dialog>
      </Popover>
    </DatePicker>
  )
}

function PickerActionButton({
  children,
  onClick,
  className = '',
  variant = 'secondary',
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
  variant?: 'primary' | 'secondary'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md px-3 py-1.5 text-sm font-semibold outline-none transition-colors',
        variant === 'primary'
          ? 'bg-brand text-white hover:bg-brand-deep'
          : 'border border-navy/10 bg-white text-navy hover:bg-surface-muted',
        className,
      )}
    >
      {children}
    </button>
  )
}
