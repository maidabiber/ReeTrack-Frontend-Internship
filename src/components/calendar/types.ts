export type EventColor = `#${string}`

export type CalendarEventKind = 'timeEntry' | 'calendarEvent'

export interface CalendarEvent {
  id: string
  kind: CalendarEventKind
  title: string
  description?: string
  start: Date
  end: Date
  location?: string
  htmlLink?: string
  color?: EventColor
}

export interface EventLayout {
  event: CalendarEvent
  column: number
  totalColumns: number
}

export type CalendarViewMode = 'day' | 'week'
