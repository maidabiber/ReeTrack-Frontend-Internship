export type CalendarProviderType = 'Google'

export type CalendarSyncStatus = 'Idle' | 'Syncing' | 'Error'

/** Mirrors backend CalendarConnectionDto. */
export interface CalendarConnection {
  id: string
  providerType: CalendarProviderType
  providerAccountId: string | null
  lastSyncedAtUtc: string | null
  syncStatus: CalendarSyncStatus
  lastSyncError: string | null
  createdAtUtc: string
}

/** Mirrors backend SyncedCalendarEventDto. */
export interface SyncedCalendarEvent {
  id: string
  connectionId: string
  externalEventId: string
  title: string
  description: string | null
  startAtUtc: string
  endAtUtc: string
  isAllDay: boolean
  location: string | null
  htmlLink: string | null
}

export interface CalendarEventsQuery {
  from?: string
  to?: string
}

export interface ApiMessageResponse {
  message: string
}
