import type { PagedResult } from '../types/paged'
import type {
  ActiveTimer,
  TimeEntry,
  TimeEntryParticipant,
  TimeEntryTag,
} from '../types/timeEntry'
import { apiClient } from './client'
import { appendListQueryParams, toPagedResult } from './pagination'

export type TimeEntrySort = 'newest' | 'oldest'

export interface ListTimeEntriesOptions {
  page?: number
  pageSize?: number
  /** Local calendar day as yyyy-MM-dd, or omit for all dates. */
  date?: string | null
  sort?: TimeEntrySort
  /** `Date#getTimezoneOffset()` so `date` maps to the correct local day. */
  utcOffsetMinutes?: number
}

// ---------------------------------------------------------------------------
// Single request type matching the backend TimeEntryRequest
// ---------------------------------------------------------------------------

export interface TimeEntryRequest {
  description?: string
  isBillable?: boolean
  startedAtUtc?: string
  endedAtUtc?: string
  entryDateUtc?: string
  durationSeconds?: number
  projectId?: string | null
  projectTaskId?: string | null
  tagIds?: string[]
  assigneeUserIds?: string[]
  /** `Date#getTimezoneOffset()` so daily budget uses the local calendar day. */
  utcOffsetMinutes?: number
}

/** Attach the client's current timezone offset for local-day daily budget checks. */
function withUtcOffset(request: TimeEntryRequest = {}): TimeEntryRequest {
  return {
    ...request,
    utcOffsetMinutes: new Date().getTimezoneOffset(),
  }
}

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

interface TimeEntryParticipantResponse {
  userId: string
  displayName: string
  email: string
  role: string
}

interface TimeEntryTagResponse {
  id: string
  name: string
  color: string | null
}

interface TimeEntryResponse {
  id: string
  description: string | null
  isBillable: boolean
  mode: string
  startedAtUtc: string | null
  endedAtUtc: string | null
  durationSeconds: number
  isRunning: boolean
  status: string
  submittedByUserId: string | null
  submittedByDisplayName: string | null
  assigneeUserId: string | null
  assigneeDisplayName: string | null
  shareGroupId: string | null
  participants: TimeEntryParticipantResponse[]
  projectId?: string | null
  projectName?: string | null
  projectColor?: string | null
  projectTaskId?: string | null
  projectTaskName?: string | null
  tags?: TimeEntryTagResponse[]
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function toParticipant(response: TimeEntryParticipantResponse): TimeEntryParticipant {
  return {
    userId: response.userId,
    displayName: response.displayName,
    email: response.email,
    role: response.role as TimeEntryParticipant['role'],
  }
}

function toTag(response: TimeEntryTagResponse): TimeEntryTag {
  return {
    id: response.id,
    name: response.name,
    color: response.color,
  }
}

function toTimeEntry(response: TimeEntryResponse): TimeEntry {
  return {
    id: response.id,
    description: response.description,
    isBillable: response.isBillable,
    mode: response.mode as TimeEntry['mode'],
    startedAtUtc: response.startedAtUtc,
    endedAtUtc: response.endedAtUtc,
    durationSeconds: response.durationSeconds,
    isRunning: response.isRunning,
    status: (response.status as TimeEntry['status']) ?? 'Confirmed',
    submittedByUserId: response.submittedByUserId,
    submittedByDisplayName: response.submittedByDisplayName,
    assigneeUserId: response.assigneeUserId,
    assigneeDisplayName: response.assigneeDisplayName,
    shareGroupId: response.shareGroupId,
    participants: (response.participants ?? []).map(toParticipant),
    projectId: response.projectId ?? null,
    projectName: response.projectName ?? null,
    projectColor: response.projectColor ?? null,
    projectTaskId: response.projectTaskId ?? null,
    projectTaskName: response.projectTaskName ?? null,
    tags: (response.tags ?? []).map(toTag),
  }
}

function toActiveTimer(response: TimeEntryResponse): ActiveTimer {
  const entry = toTimeEntry(response)
  if (!entry.isRunning || !entry.startedAtUtc) {
    throw new Error('Response is not an active timer.')
  }

  return {
    ...entry,
    startedAtUtc: entry.startedAtUtc,
    isRunning: true,
  }
}

function extractEntries(response: Record<string, unknown>): TimeEntry[] {
  const entries = response.entries ?? response.Entries
  if (Array.isArray(entries)) return (entries as TimeEntryResponse[]).map(toTimeEntry)
  throw new Error('Shared entry response did not include an entries array.')
}

export interface OverlapEntry {
  id: string
  description: string | null
  startedAtUtc: string
  endedAtUtc: string | null
}

export interface StopTimerResult {
  entry: TimeEntry
  hasOverlap: boolean
  overlapMessage: string | null
  suggestedClipEndedAtUtc: string | null
  overlappingEntries: OverlapEntry[]
}

interface OverlapEntryResponse {
  id: string
  description: string | null
  startedAtUtc: string
  endedAtUtc: string | null
}

interface StopTimerResponse {
  entry: TimeEntryResponse
  hasOverlap: boolean
  overlapMessage: string | null
  suggestedClipEndedAtUtc: string | null
  overlappingEntries?: OverlapEntryResponse[]
}

function toStopTimerResult(response: StopTimerResponse): StopTimerResult {
  return {
    entry: toTimeEntry(response.entry),
    hasOverlap: Boolean(response.hasOverlap),
    overlapMessage: response.overlapMessage ?? null,
    suggestedClipEndedAtUtc: response.suggestedClipEndedAtUtc ?? null,
    overlappingEntries: (response.overlappingEntries ?? []).map((item) => ({
      id: item.id,
      description: item.description,
      startedAtUtc: item.startedAtUtc,
      endedAtUtc: item.endedAtUtc,
    })),
  }
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export function listTimeEntries(
  options: ListTimeEntriesOptions = {},
): Promise<PagedResult<TimeEntry>> {
  const params = new URLSearchParams()
  appendListQueryParams(params, {
    page: options.page,
    pageSize: options.pageSize,
  })
  if (options.date?.trim()) params.set('date', options.date.trim())
  if (options.sort) params.set('sort', options.sort)
  if (options.utcOffsetMinutes != null) {
    params.set('utcOffsetMinutes', String(options.utcOffsetMinutes))
  }
  const qs = params.toString()
  const path = qs ? `/time-entries?${qs}` : '/time-entries'
  return apiClient
    .get<PagedResult<TimeEntryResponse>>(path)
    .then((result) => toPagedResult(result, toTimeEntry))
}

export async function getActiveTimer(): Promise<ActiveTimer | null> {
  const response = await apiClient.get<TimeEntryResponse | null>('/time-entries/timer/active')
  if (!response || !response.isRunning || !response.startedAtUtc) return null
  return toActiveTimer(response)
}

export function startTimer(request?: TimeEntryRequest): Promise<ActiveTimer> {
  return apiClient
    .post<TimeEntryResponse>('/time-entries/timer/start', withUtcOffset(request))
    .then(toActiveTimer)
}

export function stopTimer(request?: TimeEntryRequest): Promise<StopTimerResult> {
  return apiClient
    .post<StopTimerResponse>('/time-entries/timer/stop', withUtcOffset(request))
    .then(toStopTimerResult)
}

export function createTimeEntry(request: TimeEntryRequest): Promise<TimeEntry> {
  return apiClient
    .post<TimeEntryResponse>('/time-entries', withUtcOffset(request))
    .then(toTimeEntry)
}

/** A batch row the server refused to create because its range collides with something. */
export interface BatchEntryConflict {
  /** Zero-based position of the row in the submitted batch. */
  index: number
  message: string
  /** Already-saved entries this row collides with. */
  overlappingEntries: OverlapEntry[]
  /** Other rows of the same batch this row collides with, zero-based. */
  overlappingEntryIndexes: number[]
}

export interface BatchCreateResult {
  created: TimeEntry[]
  conflicts: BatchEntryConflict[]
}

interface BatchEntryConflictResponse {
  index: number
  message: string
  overlappingEntries?: OverlapEntryResponse[]
  overlappingEntryIndexes?: number[]
}

interface CreateTimeEntriesBatchResponse {
  created?: TimeEntryResponse[]
  conflicts?: BatchEntryConflictResponse[]
}

/**
 * Creates several entries as one unit. Overlaps come back as `conflicts` rather than a 409:
 * the caller drafted a batch and needs to know which rows are the problem. With
 * `skipOverlapping` false (the default) a single conflict means nothing was written at all.
 */
export function createTimeEntriesBatch(
  entries: TimeEntryRequest[],
  options: { skipOverlapping?: boolean } = {},
): Promise<BatchCreateResult> {
  if (entries.length === 0) {
    return Promise.reject(new Error('At least one time entry is required.'))
  }

  return apiClient
    .post<CreateTimeEntriesBatchResponse>('/time-entries/batch', {
      entries: entries.map((entry) => withUtcOffset(entry)),
      skipOverlapping: options.skipOverlapping ?? false,
    })
    .then((response) => {
      if (!response || typeof response !== 'object') {
        throw new Error('Unexpected response when creating time entries.')
      }
      return {
        created: (response.created ?? []).map(toTimeEntry),
        conflicts: (response.conflicts ?? []).map((conflict) => ({
          index: conflict.index,
          message: conflict.message,
          overlappingEntries: conflict.overlappingEntries ?? [],
          overlappingEntryIndexes: conflict.overlappingEntryIndexes ?? [],
        })),
      }
    })
}

export function updateTimeEntry(id: string, request: TimeEntryRequest): Promise<TimeEntry> {
  return apiClient
    .put<TimeEntryResponse>(`/time-entries/${id}`, withUtcOffset(request))
    .then(toTimeEntry)
}

export function deleteTimeEntry(id: string): Promise<void> {
  return apiClient.delete(`/time-entries/${id}`).then(() => undefined)
}

export function createSharedTimeEntry(request: TimeEntryRequest): Promise<TimeEntry[]> {
  return apiClient
    .post<Record<string, unknown>>('/time-entries/shared', withUtcOffset(request))
    .then(extractEntries)
}

export function shareExistingTimeEntry(
  entryId: string,
  request: TimeEntryRequest,
): Promise<TimeEntry[]> {
  return apiClient
    .post<Record<string, unknown>>(`/time-entries/${entryId}/share`, withUtcOffset(request))
    .then(extractEntries)
}

export function listPendingTimeEntries(): Promise<TimeEntry[]> {
  return apiClient
    .get<TimeEntryResponse[]>('/time-entries/pending')
    .then((entries) => entries.map(toTimeEntry))
}

export function updatePendingTimeEntry(
  id: string,
  request: TimeEntryRequest,
): Promise<TimeEntry> {
  return apiClient
    .put<TimeEntryResponse>(`/time-entries/pending/${id}`, withUtcOffset(request))
    .then(toTimeEntry)
}

export function approvePendingTimeEntry(
  id: string,
  request?: TimeEntryRequest,
): Promise<TimeEntry> {
  return apiClient
    .post<TimeEntryResponse>(`/time-entries/pending/${id}/approve`, withUtcOffset(request))
    .then(toTimeEntry)
}

export function rejectPendingTimeEntry(id: string): Promise<void> {
  return apiClient.post(`/time-entries/pending/${id}/reject`).then(() => undefined)
}
