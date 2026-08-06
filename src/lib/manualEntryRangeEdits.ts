import type { CalendarDate } from '@internationalized/date'
import { parseTimeString } from './timeInputUtils'

export type RangeEndpoints = {
  start: Date
  end: Date
}

export type RangeEditOptions = {
  /** When true, changing start also moves end (modals). Tracker leaves end alone. */
  syncEnd?: boolean
}

export function applyStartDateChange(
  current: RangeEndpoints,
  calendarDate: CalendarDate,
  options: RangeEditOptions = {},
): RangeEndpoints {
  const syncEnd = options.syncEnd ?? true
  const newStart = new Date(current.start)
  newStart.setFullYear(calendarDate.year, calendarDate.month - 1, calendarDate.day)

  if (!syncEnd) {
    return { start: newStart, end: current.end }
  }

  const newEnd = new Date(current.end)
  newEnd.setFullYear(calendarDate.year, calendarDate.month - 1, calendarDate.day)
  if (newEnd <= newStart) newEnd.setDate(newEnd.getDate() + 1)
  return { start: newStart, end: newEnd }
}

export function applyStartTimeChange(
  current: RangeEndpoints,
  timeString: string,
  options: RangeEditOptions = {},
): RangeEndpoints | null {
  const parsed = parseTimeString(timeString)
  if (!parsed) return null

  const syncEnd = options.syncEnd ?? true
  const newStart = new Date(current.start)
  newStart.setHours(parsed.hour, parsed.minute, 0, 0)

  if (!syncEnd) {
    return { start: newStart, end: current.end }
  }

  const newEnd = new Date(current.end)
  newEnd.setHours(newStart.getHours(), newStart.getMinutes(), 0, 0)
  if (newEnd <= newStart) newEnd.setDate(newEnd.getDate() + 1)
  return { start: newStart, end: newEnd }
}

export function applyEndTimeChange(
  current: RangeEndpoints,
  timeString: string,
): RangeEndpoints | null {
  const parsed = parseTimeString(timeString)
  if (!parsed) return null

  const newEnd = new Date(current.start)
  newEnd.setHours(parsed.hour, parsed.minute, 0, 0)
  if (newEnd <= current.start) {
    newEnd.setDate(newEnd.getDate() + 1)
  }
  return { start: current.start, end: newEnd }
}
