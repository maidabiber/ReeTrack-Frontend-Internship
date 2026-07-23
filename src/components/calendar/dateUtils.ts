import type { CalendarEvent, EventLayout } from './types'

const MINUTES_PER_DAY = 24 * 60

export const HOVER_MIN_DISPLAY_VH_RATIO = 0.05

export function hoverMinDisplayHeightPx(viewportHeight: number): number {
  return viewportHeight * HOVER_MIN_DISPLAY_VH_RATIO
}

export function hoverMinDisplayHeightPercent(viewportHeight: number, hourHeight: number): number {
  const dayHeightPx = hourHeight * 24
  return (hoverMinDisplayHeightPx(viewportHeight) / dayHeightPx) * 100
}

export function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7)
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

/** Monday-based week start. */
export function startOfWeek(date: Date): Date {
  const d = startOfDay(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  return addDays(d, diff)
}

export function endOfWeek(date: Date): Date {
  return endOfDay(addDays(startOfWeek(date), 6))
}

export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

export function getMonthGridDays(date: Date): Date[] {
  const first = startOfMonth(date)
  const start = startOfWeek(first)
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

export function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

export function snapMinutes(minutes: number, interval = 15): number {
  return Math.round(minutes / interval) * interval
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000)
}

export function preserveDurationMove(start: Date, end: Date, newStart: Date): { start: Date; end: Date } {
  const durationMs = end.getTime() - start.getTime()
  return {
    start: newStart,
    end: new Date(newStart.getTime() + durationMs),
  }
}

export function minutesFromPointerY(clientY: number, columnTop: number, hourHeight: number): number {
  const relativeY = clientY - columnTop
  const minutes = (relativeY / hourHeight) * 60
  return Math.max(0, Math.min(MINUTES_PER_DAY, minutes))
}

export function dateAtDayMinutes(day: Date, minutes: number): Date {
  const result = startOfDay(day)
  result.setMinutes(minutes)
  return result
}

export type ResizeEdge = 'start' | 'end'

const MIN_SNAPPED_DURATION_MINUTES = 15
const MIN_FREE_DURATION_MINUTES = 1

export function resizeEventEdge(
  start: Date,
  end: Date,
  day: Date,
  edge: ResizeEdge,
  deltaMinutes: number,
  altKey: boolean,
): { start: Date; end: Date } | null {
  const snappedDelta = altKey ? Math.round(deltaMinutes) : snapMinutes(deltaMinutes, 15)
  const minDurationMs =
    (altKey ? MIN_FREE_DURATION_MINUTES : MIN_SNAPPED_DURATION_MINUTES) * 60 * 1000

  let newStart = start
  let newEnd = end

  if (edge === 'start') {
    newStart = addMinutes(start, snappedDelta)
    if (newEnd.getTime() - newStart.getTime() < minDurationMs) {
      newStart = new Date(newEnd.getTime() - minDurationMs)
    }
  } else {
    newEnd = addMinutes(end, snappedDelta)
    if (newEnd.getTime() - newStart.getTime() < minDurationMs) {
      newEnd = new Date(newStart.getTime() + minDurationMs)
    }
  }

  return clampEventToDay(newStart, newEnd, day)
}

export function clampEventToDay(start: Date, end: Date, day: Date): { start: Date; end: Date } | null {
  const dayStart = startOfDay(day)
  const dayEnd = endOfDay(day)
  const durationMs = end.getTime() - start.getTime()

  let newStart = start
  if (newStart < dayStart) newStart = dayStart

  let newEnd = new Date(newStart.getTime() + durationMs)
  if (newEnd > dayEnd) {
    newEnd = dayEnd
    newStart = new Date(newEnd.getTime() - durationMs)
    if (newStart < dayStart) return null
  }

  return { start: newStart, end: newEnd }
}

export function dayOffset(fromDay: Date, toDay: Date): number {
  const from = startOfDay(fromDay).getTime()
  const to = startOfDay(toDay).getTime()
  return Math.round((to - from) / (24 * 60 * 60 * 1000))
}

export function moveEventToDay(start: Date, end: Date, targetDay: Date): { start: Date; end: Date } {
  const durationMs = end.getTime() - start.getTime()
  const minutes = minutesSinceMidnight(start)
  const newStart = dateAtDayMinutes(targetDay, minutes)
  return {
    start: newStart,
    end: new Date(newStart.getTime() + durationMs),
  }
}

export interface ColumnBounds {
  day: Date
  left: number
  right: number
}

/** Resolve which day column contains clientX using column boundaries. */
export function findColumnAtPointer<T extends ColumnBounds>(clientX: number, columns: T[]): T | null {
  if (columns.length === 0) return null
  if (columns.length === 1) return columns[0]

  const sorted = [...columns].sort((a, b) => a.left - b.left)
  const first = sorted[0]
  const last = sorted[sorted.length - 1]

  if (clientX <= first.left) return first
  if (clientX >= last.right) return last

  for (const column of sorted) {
    if (clientX >= column.left && clientX <= column.right) return column
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const leftCol = sorted[i]
    const rightCol = sorted[i + 1]
    if (clientX > leftCol.right && clientX < rightCol.left) {
      const midpoint = (leftCol.right + rightCol.left) / 2
      return clientX < midpoint ? leftCol : rightCol
    }
  }

  return first
}

export function eventTopPercent(start: Date, day: Date): number {
  if (!isSameDay(start, day)) return 0
  return (minutesSinceMidnight(start) / MINUTES_PER_DAY) * 100
}

export function eventHeightPercent(start: Date, end: Date, day: Date): number {
  const dayStart = startOfDay(day)
  const dayEnd = endOfDay(day)

  const effectiveStart = start < dayStart ? dayStart : start
  const effectiveEnd = end > dayEnd ? dayEnd : end

  const durationMinutes =
    (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60)
  return Math.max((durationMinutes / MINUTES_PER_DAY) * 100, 1.5)
}

export function eventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  const dayStart = startOfDay(day)
  const dayEnd = endOfDay(day)
  return events.filter((e) => e.start <= dayEnd && e.end >= dayStart)
}

export function eventsInRange(
  events: CalendarEvent[],
  from: Date,
  to: Date,
): CalendarEvent[] {
  return events.filter((e) => e.start <= to && e.end >= from)
}

export function layoutOverlappingEvents(events: CalendarEvent[]): EventLayout[] {
  if (events.length === 0) return []

  const sorted = [...events].sort((a, b) => {
    const startDiff = a.start.getTime() - b.start.getTime()
    if (startDiff !== 0) return startDiff
    return b.end.getTime() - b.start.getTime() - (a.end.getTime() - a.start.getTime())
  })

  const layouts: EventLayout[] = []
  const columns: { end: number }[] = []

  for (const event of sorted) {
    const startMin = event.start.getTime()
    const endMin = event.end.getTime()

    let column = columns.findIndex((col) => col.end <= startMin)
    if (column === -1) {
      column = columns.length
      columns.push({ end: endMin })
    } else {
      columns[column].end = endMin
    }

    layouts.push({ event, column, totalColumns: 1 })
  }

  // Assign equal totalColumns within each connected overlap cluster (sweep by start).
  let clusterStart = 0
  let clusterEnd = layouts[0].event.end.getTime()
  let clusterMaxCol = layouts[0].column

  for (let i = 1; i < layouts.length; i++) {
    const start = layouts[i].event.start.getTime()
    if (start < clusterEnd) {
      clusterEnd = Math.max(clusterEnd, layouts[i].event.end.getTime())
      clusterMaxCol = Math.max(clusterMaxCol, layouts[i].column)
      continue
    }

    const totalColumns = clusterMaxCol + 1
    for (let j = clusterStart; j < i; j++) {
      layouts[j].totalColumns = totalColumns
    }

    clusterStart = i
    clusterEnd = layouts[i].event.end.getTime()
    clusterMaxCol = layouts[i].column
  }

  const totalColumns = clusterMaxCol + 1
  for (let j = clusterStart; j < layouts.length; j++) {
    layouts[j].totalColumns = totalColumns
  }

  return layouts
}

const weekdayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short' })
const monthDayFmt = new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric' })
const monthYearFmt = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
const fullDateFmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

export function formatWeekday(date: Date): string {
  return weekdayFmt.format(date)
}

/** Local calendar date as `YYYY-MM-DD` (not UTC). */
export function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatMonthDay(date: Date): string {
  return monthDayFmt.format(date)
}

export function formatMonthYear(date: Date): string {
  return monthYearFmt.format(date)
}

export function formatTime(date: Date): string {
  return timeFmt.format(date)
}

export function formatTimeRange(start: Date, end: Date): string {
  return `${formatTime(start)} – ${formatTime(end)}`
}

export function formatFullDate(date: Date): string {
  return fullDateFmt.format(date)
}

export function formatHeaderLabel(date: Date, mode: 'day' | 'week'): string {
  if (mode === 'day') return formatFullDate(date)
  const weekStart = startOfWeek(date)
  const weekEnd = addDays(weekStart, 6)
  if (weekStart.getMonth() === weekEnd.getMonth()) {
    return `${weekStart.toLocaleDateString(undefined, { month: 'long' })} ${weekStart.getDate()} – ${weekEnd.getDate()}, ${weekStart.getFullYear()}`
  }
  return `${formatMonthDay(weekStart)} – ${formatMonthDay(weekEnd)}, ${weekEnd.getFullYear()}`
}

export function nowLinePercent(): number {
  return (minutesSinceMidnight(new Date()) / MINUTES_PER_DAY) * 100
}
