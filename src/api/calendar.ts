import { apiClient } from './client'
import type { SyncedCalendarEvent } from '../types/integrations'
import type { TimeEntry } from '../types/timeEntry'

export interface CalendarView {
  timeEntries: TimeEntry[]
  calendarEvents: SyncedCalendarEvent[]
}

export interface CalendarViewQuery {
  from?: string
  to?: string
}

export function getCalendarView(query: CalendarViewQuery = {}): Promise<CalendarView> {
  const params = new URLSearchParams()
  if (query.from) params.set('from', query.from)
  if (query.to) params.set('to', query.to)

  const qs = params.toString()
  const path = qs ? `/calendar/view?${qs}` : '/calendar/view'
  return apiClient.get<CalendarView>(path)
}
