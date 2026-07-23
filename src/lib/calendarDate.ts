import { CalendarDate, Time, getLocalTimeZone, today, toCalendarDateTime } from '@internationalized/date'
import type { CalendarDateTime } from '@internationalized/date'

export function dateToCalendarDate(date: Date): CalendarDate {
  return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

export function dateToTimeValue(date: Date): Time {
  return new Time(date.getHours(), date.getMinutes())
}

export function dateToCalendarDateTime(date: Date): CalendarDateTime {
  return toCalendarDateTime(dateToCalendarDate(date)).set({
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: 0,
    millisecond: 0,
  })
}

export function calendarDateTimeToDate(value: CalendarDateTime): Date {
  return value.toDate(getLocalTimeZone())
}

export function calendarDateAndTimeToDate(calendarDate: CalendarDate, time: Time): Date {
  return new Date(calendarDate.year, calendarDate.month - 1, calendarDate.day, time.hour, time.minute)
}

export function formatPickerDateTime(date: Date, compact = false): { date: string; time: string } {
  return {
    date: date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      ...(compact ? {} : { year: 'numeric' }),
    }),
    time: date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
  }
}

export function formatPickerDateLabel(calendarDate: CalendarDate): string {
  const date = new Date(calendarDate.year, calendarDate.month - 1, calendarDate.day)
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatPickerDate(calendarDate: CalendarDate, compact = false): string {
  const date = new Date(calendarDate.year, calendarDate.month - 1, calendarDate.day)
  if (compact) {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function todayCalendarDate(): CalendarDate {
  return today(getLocalTimeZone())
}

export function toTimeInputValue(date: Date): string {
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function mergeDateAndTime(dateValue: string, timeValue: string): Date | null {
  const [year, month, day] = dateValue.split('-').map((part) => Number.parseInt(part, 10))
  const [hours, minutes] = timeValue.split(':').map((part) => Number.parseInt(part, 10))
  if (
    !year ||
    !month ||
    !day ||
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null
  }

  const parsed = new Date(year, month - 1, day, hours, minutes)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}
