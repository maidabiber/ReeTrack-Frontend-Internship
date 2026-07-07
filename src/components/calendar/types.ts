export type EventColor = 'purple' | 'orange' | 'green' | 'yellow'

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  start: Date
  end: Date
  location?: string
  color?: EventColor
}

export interface EventLayout {
  event: CalendarEvent
  column: number
  totalColumns: number
}

export type CalendarViewMode = 'day' | 'week'
