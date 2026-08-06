import { apiClient } from './client'
import type {
  ApiMessageResponse,
  CalendarConnection,
  CalendarEventsQuery,
  CalendarProviderType,
  CalendarSyncStatus,
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

const PROVIDER_LABELS: Record<CalendarProviderType, string> = {
  Google: 'Google Calendar',
}

const SYNC_STATUS_LABELS: Record<CalendarSyncStatus, string> = {
  Idle: 'Connected',
  Syncing: 'Syncing',
  Error: 'Error',
}

export function calendarProviderLabel(providerType: CalendarProviderType): string {
  return PROVIDER_LABELS[providerType] ?? 'Calendar'
}

export function calendarSyncStatusLabel(status: CalendarSyncStatus): string {
  return SYNC_STATUS_LABELS[status] ?? 'Connected'
}
