import { apiClient } from './client'
import type {
  ApiMessageResponse,
  CalendarConnection,
  CalendarEventsQuery,
  SyncedCalendarEvent,
} from '../types/integrations'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

/** Full-page redirect to start Google Calendar OAuth (requires active session). */
export function googleCalendarConnectUrl(returnUrl: string): string {
  const params = new URLSearchParams({ returnUrl })
  return `${API_BASE_URL}/integrations/calendar/google/connect?${params.toString()}`
}

export function listCalendarConnections(): Promise<CalendarConnection[]> {
  return apiClient.get<CalendarConnection[]>('/integrations/calendar')
}

export function disconnectCalendarConnection(connectionId: string): Promise<void> {
  return apiClient.delete(`/integrations/calendar/${connectionId}`).then(() => undefined)
}

export function syncCalendarConnection(connectionId: string): Promise<ApiMessageResponse> {
  return apiClient.post<ApiMessageResponse>(`/integrations/calendar/${connectionId}/sync`)
}

export function listCalendarEvents(query: CalendarEventsQuery = {}): Promise<SyncedCalendarEvent[]> {
  const params = new URLSearchParams()
  if (query.from) params.set('from', query.from)
  if (query.to) params.set('to', query.to)

  const qs = params.toString()
  const path = qs ? `/calendar/events?${qs}` : '/calendar/events'
  return apiClient.get<SyncedCalendarEvent[]>(path)
}

export function getIntegrationErrorFromUrl(search: string): string | null {
  const value = new URLSearchParams(search).get('integrationError')
  return value && value.length > 0 ? value : null
}

export function calendarProviderLabel(providerType: number): string {
  switch (providerType) {
    case 0:
      return 'Google Calendar'
    default:
      return 'Calendar'
  }
}

export function calendarSyncStatusLabel(status: number): string {
  switch (status) {
    case 1:
      return 'Syncing'
    case 2:
      return 'Error'
    default:
      return 'Connected'
  }
}

export function integrationApiErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'body' in error) {
    const body = (error as { body: unknown }).body
    if (body && typeof body === 'object' && 'message' in body) {
      const message = (body as { message: unknown }).message
      if (typeof message === 'string' && message.length > 0) return message
    }
  }
  return fallback
}
