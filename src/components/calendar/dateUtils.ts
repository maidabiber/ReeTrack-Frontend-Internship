import type { CalendarEvent, EventLayout } from './types'

const MINUTES_PER_DAY = 24 * 60

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

  // Expand totalColumns for overlapping clusters
  for (let i = 0; i < layouts.length; i++) {
    const a = layouts[i]
    let maxCol = a.column
    for (let j = 0; j < layouts.length; j++) {
      if (i === j) continue
      const b = layouts[j]
      if (eventsOverlap(a.event, b.event)) {
        maxCol = Math.max(maxCol, b.column)
      }
    }
    a.totalColumns = maxCol + 1
  }

  // Normalize totalColumns within overlap groups
  for (let i = 0; i < layouts.length; i++) {
    let groupMax = layouts[i].totalColumns
    for (let j = 0; j < layouts.length; j++) {
      if (eventsOverlap(layouts[i].event, layouts[j].event)) {
        groupMax = Math.max(groupMax, layouts[j].totalColumns)
      }
    }
    layouts[i].totalColumns = groupMax
  }

  return layouts
}

function eventsOverlap(a: CalendarEvent, b: CalendarEvent): boolean {
  return a.start < b.end && b.start < a.end
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
