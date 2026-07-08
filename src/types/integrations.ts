/** Mirrors backend CalendarProviderType enum (serialized as number). */
export enum CalendarProviderType {
  Google = 0,
}

/** Mirrors backend CalendarSyncStatus enum (serialized as number). */
export enum CalendarSyncStatus {
  Idle = 0,
  Syncing = 1,
  Error = 2,
}

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
