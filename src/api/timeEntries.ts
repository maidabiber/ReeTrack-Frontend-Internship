import type {
  ActiveTimer,
  TimeEntry,
  TimeEntryParticipant,
  TimeEntryTag,
} from '../types/timeEntry'
import { apiClient } from './client'

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

export function listTimeEntries(): Promise<TimeEntry[]> {
  return apiClient
    .get<TimeEntryResponse[]>('/time-entries')
    .then((entries) => entries.map(toTimeEntry))
}

export async function getActiveTimer(): Promise<ActiveTimer | null> {
  const response = await apiClient.get<TimeEntryResponse | null>('/time-entries/timer/active')
  if (!response || !response.isRunning || !response.startedAtUtc) return null
  return toActiveTimer(response)
}

export function startTimer(request?: TimeEntryRequest): Promise<ActiveTimer> {
  return apiClient
    .post<TimeEntryResponse>('/time-entries/timer/start', request)
    .then(toActiveTimer)
}

export function stopTimer(request?: TimeEntryRequest): Promise<StopTimerResult> {
  return apiClient
    .post<StopTimerResponse>('/time-entries/timer/stop', request ?? {})
    .then(toStopTimerResult)
}

export function createTimeEntry(request: TimeEntryRequest): Promise<TimeEntry> {
  return apiClient
    .post<TimeEntryResponse>('/time-entries', request)
    .then(toTimeEntry)
}

export function updateTimeEntry(id: string, request: TimeEntryRequest): Promise<TimeEntry> {
  return apiClient
    .put<TimeEntryResponse>(`/time-entries/${id}`, request)
    .then(toTimeEntry)
}

export function deleteTimeEntry(id: string): Promise<void> {
  return apiClient.delete(`/time-entries/${id}`).then(() => undefined)
}

export function createSharedTimeEntry(request: TimeEntryRequest): Promise<TimeEntry[]> {
  return apiClient
    .post<Record<string, unknown>>('/time-entries/shared', request)
    .then(extractEntries)
}

export function shareExistingTimeEntry(
  entryId: string,
  request: TimeEntryRequest,
): Promise<TimeEntry[]> {
  return apiClient
    .post<Record<string, unknown>>(`/time-entries/${entryId}/share`, request)
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
    .put<TimeEntryResponse>(`/time-entries/pending/${id}`, request)
    .then(toTimeEntry)
}

export function approvePendingTimeEntry(
  id: string,
  request?: TimeEntryRequest,
): Promise<TimeEntry> {
  return apiClient
    .post<TimeEntryResponse>(`/time-entries/pending/${id}/approve`, request)
    .then(toTimeEntry)
}

export function rejectPendingTimeEntry(id: string): Promise<void> {
  return apiClient.post(`/time-entries/pending/${id}/reject`).then(() => undefined)
}
