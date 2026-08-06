import { useRef, useState, type MouseEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { Button, DatePicker, Group } from 'react-aria-components'
import type { CalendarDate } from '@internationalized/date'
import { cn } from '../../../lib/utils'
import {
  formatPickerDateLabel,
  todayCalendarDate,
} from '../../../lib/calendarDate'
import { formatTimeFromDate } from '../../../lib/timeInputUtils'
import type { ManualFieldState } from '../../time/ManualField'
import { FIELD_STATE_STYLES, MODAL_LABEL_CLASS } from './fieldStyles'
import { PickerCalendar } from './PickerCalendar'
import { PickerPopover } from './PickerPopover'
import { TimeSegmentField } from './TimeSegmentField'

type DateTimePickerFieldProps = {
  label: string
  dateValue: CalendarDate | null
  timeValue: string
  onDateChange: (value: CalendarDate) => void
  onTimeChange: (value: string) => void
  disabled?: boolean
  fieldState?: ManualFieldState
  hideLabel?: boolean
  variant?: 'tracker' | 'modal'
  className?: string
}

export function DateTimePickerField({
  label,
  dateValue,
  timeValue,
  onDateChange,
  onTimeChange,
  disabled = false,
  fieldState = 'default',
  hideLabel = false,
  variant = 'modal',
  className,
}: DateTimePickerFieldProps) {
  const isModal = variant === 'modal'
  const [isOpen, setIsOpen] = useState(false)
  const groupRef = useRef<HTMLDivElement>(null)

  const formattedDate = dateValue ? formatPickerDateLabel(dateValue) : 'Pick date'
  const isPlaceholder = !dateValue

  const handleToday = () => {
    const now = new Date()
    onDateChange(todayCalendarDate())
    onTimeChange(formatTimeFromDate(now))
    setIsOpen(false)
  }

  const focusHour = () => {
    const hourInput = groupRef.current?.querySelector<HTMLInputElement>(
      'input[aria-label="Hour (24-hour)"]',
    )
    hourInput?.focus({ preventScroll: true })
    hourInput?.select()
  }

  /** Focus hour after the calendar closes so a date pick still selects time. */
  const scheduleFocusHour = () => {
    if (disabled) return
    queueMicrotask(focusHour)
    requestAnimationFrame(focusHour)
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) scheduleFocusHour()
  }

  const isDateButtonTarget = (target: EventTarget | null) =>
    (target as HTMLElement | null)?.closest?.('button, [role="button"]') != null

  const isTimeInputTarget = (target: EventTarget | null) =>
    (target as HTMLElement | null)?.closest?.('input') != null

  const handleControlPointerDownCapture = (event: ReactPointerEvent) => {
    if (disabled) return
    // Let the date Button complete its press so the popover can open.
    if (isDateButtonTarget(event.target)) return
    // Leave hour/minute alone so clicking minutes still selects minutes.
    if (isTimeInputTarget(event.target)) return
    focusHour()
  }

  const handleControlClick = (event: MouseEvent) => {
    if (disabled) return
    if (isDateButtonTarget(event.target)) return
    if (isTimeInputTarget(event.target)) return
    scheduleFocusHour()
  }

  return (
    <DatePicker
      value={dateValue}
      aria-label={hideLabel ? label : undefined}
      onChange={(next) => {
        if (next) onDateChange(next)
      }}
      isDisabled={disabled}
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
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
        ref={groupRef}
        className={cn(
          'flex items-stretch overflow-hidden rounded-lg border bg-white shadow-[0_1px_2px_rgba(31,43,77,0.04)] transition-colors',
          isModal ? 'h-[33px] rounded-md' : 'h-9',
          isOpen ? 'border-navy/30 ring-1 ring-navy/15' : FIELD_STATE_STYLES[fieldState],
          disabled && 'opacity-60',
        )}
        onPointerDownCapture={handleControlPointerDownCapture}
        onClick={handleControlClick}
      >
        <Button className="whitespace-nowrap px-3 text-left text-[13px] font-medium text-navy outline-none">
          <span className={cn(isPlaceholder && 'text-navy/35')}>{formattedDate}</span>
        </Button>

        <div aria-hidden="true" className="my-1.5 w-px bg-navy/[0.08]" />

        <TimeSegmentField
          bare
          label="Time"
          value={timeValue}
          onChange={onTimeChange}
          disabled={disabled}
          variant={variant}
        />
      </Group>

      <PickerPopover onToday={handleToday}>
        <PickerCalendar />
      </PickerPopover>
    </DatePicker>
  )
}
