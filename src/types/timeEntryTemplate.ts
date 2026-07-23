import type { TimeEntryTag } from './timeEntry'

/**
 * Mirrors backend TimeEntryTemplate / TimeEntryTemplateResponse, plus display
 * helpers and a mock-only favourite flag.
 */
export interface TimeEntryTemplate {
  id: string
  timeEntryId: string
  projectId: string | null
  projectTaskId: string | null
  description: string | null
  isBillable: boolean
  /** Time-of-day as HH:mm:ss, or null for duration-only templates. */
  startTimeUtc: string | null
  /** Time-of-day as HH:mm:ss, or null for duration-only templates. */
  endTimeUtc: string | null
  durationSeconds: number
  createdAtUtc: string

  /** Display helpers (joined from Project / ProjectTask). */
  projectName: string | null
  projectColor: string | null
  taskName: string | null
  tags: TimeEntryTag[]

  /** Mock-only — not on the backend entity yet. */
  isFavourite: boolean
  lastUsedAtUtc: string
}
