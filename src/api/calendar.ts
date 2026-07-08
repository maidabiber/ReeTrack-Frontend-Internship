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

export function calendarApiErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'body' in error) {
    const body = (error as { body: unknown }).body
    if (body && typeof body === 'object' && 'message' in body) {
      const message = (body as { message: unknown }).message
      if (typeof message === 'string' && message.length > 0) return message
    }
  }
  return fallback
}
