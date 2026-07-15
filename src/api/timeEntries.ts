import type { ActiveTimer, TimeEntry, TimeEntryParticipant } from '../types/timeEntry'
import { apiClient } from './client'

interface TimeEntryParticipantResponse {
  userId: string
  displayName: string
  email: string
  role: string
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
}

function toParticipant(response: TimeEntryParticipantResponse): TimeEntryParticipant {
  return {
    userId: response.userId,
    displayName: response.displayName,
    email: response.email,
    role: response.role as TimeEntryParticipant['role'],
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
    projectId: null, 
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

export function startTimer(description?: string, isBillable = true): Promise<ActiveTimer> {
  return apiClient
    .post<TimeEntryResponse>('/time-entries/timer/start', { description, isBillable })
    .then(toActiveTimer)
}

export interface StopTimerParams {
  description?: string
  assigneeUserIds?: string[]
  confirmOverlap?: boolean
}

export type StopTimerResult =
  | { kind: 'single'; entry: TimeEntry }
  | { kind: 'shared'; entries: TimeEntry[]; overlapWarning: string | null }

export function stopTimer(params?: StopTimerParams): Promise<StopTimerResult> {
  const hasAssignees = Boolean(params?.assigneeUserIds?.length)

  return apiClient
    .post<TimeEntryResponse | Record<string, unknown>>('/time-entries/timer/stop', {
      description: params?.description,
      ...(hasAssignees
        ? {
            assigneeUserIds: params!.assigneeUserIds,
            confirmOverlap: params?.confirmOverlap ?? false,
          }
        : {}),
    })
    .then((response) => {
      if (hasAssignees) {
        const sharedResponse = response as Record<string, unknown>
        return {
          kind: 'shared' as const,
          entries: sharedManualEntryResponses(sharedResponse).map(toTimeEntry),
          overlapWarning:
            (sharedResponse.overlapWarning as string | null | undefined) ??
            (sharedResponse.OverlapWarning as string | null | undefined) ??
            null,
        }
      }

      return {
        kind: 'single' as const,
        entry: toTimeEntry(response as TimeEntryResponse),
      }
    })
}

export interface CreateManualEntryParams {
  description?: string
  startedAtUtc: string
  endedAtUtc: string
  isBillable?: boolean
  confirmOverlap?: boolean
}

export interface CreateManualEntryResult {
  entry: TimeEntry
  overlapWarning: string | null
}

export function createManualEntry(params: CreateManualEntryParams): Promise<CreateManualEntryResult> {
  return apiClient
    .post<{ entry: TimeEntryResponse; overlapWarning?: string | null }>('/time-entries/manual', {
      description: params.description,
      startedAtUtc: params.startedAtUtc,
      endedAtUtc: params.endedAtUtc,
      isBillable: params.isBillable ?? true,
      confirmOverlap: params.confirmOverlap ?? false,
    })
    .then((response) => ({
      entry: toTimeEntry(response.entry),
      overlapWarning: response.overlapWarning ?? null,
    }))
}

export interface CreateDurationOnlyEntryParams {
  description?: string
  entryDateUtc: string
  durationSeconds: number
  isBillable?: boolean
}

export function createDurationOnlyEntry(
  params: CreateDurationOnlyEntryParams,
): Promise<CreateManualEntryResult> {
  return apiClient
    .post<{ entry: TimeEntryResponse; overlapWarning?: string | null }>('/time-entries/duration', {
      description: params.description,
      entryDateUtc: params.entryDateUtc,
      durationSeconds: params.durationSeconds,
      isBillable: params.isBillable ?? true,
    })
    .then((response) => ({
      entry: toTimeEntry(response.entry),
      overlapWarning: response.overlapWarning ?? null,
    }))
}

export interface UpdateTimeEntryParams {
  description?: string
  startedAtUtc: string
  endedAtUtc: string
  isBillable?: boolean
  confirmOverlap?: boolean
}

export interface UpdateTimeEntryResult {
  entry: TimeEntry
  overlapWarning: string | null
}

export function updateTimeEntry(id: string, params: UpdateTimeEntryParams): Promise<UpdateTimeEntryResult> {
  return apiClient
    .put<{ entry: TimeEntryResponse; overlapWarning?: string | null }>(`/time-entries/${id}`, {
      description: params.description,
      startedAtUtc: params.startedAtUtc,
      endedAtUtc: params.endedAtUtc,
      isBillable: params.isBillable ?? true,
      confirmOverlap: params.confirmOverlap ?? false,
    })
    .then((response) => ({
      entry: toTimeEntry(response.entry),
      overlapWarning: response.overlapWarning ?? null,
    }))
}

export interface UpdateDurationOnlyEntryParams {
  description?: string
  entryDateUtc: string
  durationSeconds: number
  isBillable?: boolean
}

export function updateDurationOnlyEntry(
  id: string,
  params: UpdateDurationOnlyEntryParams,
): Promise<UpdateTimeEntryResult> {
  return apiClient
    .put<{ entry: TimeEntryResponse; overlapWarning?: string | null }>(`/time-entries/${id}/duration`, {
      description: params.description,
      entryDateUtc: params.entryDateUtc,
      durationSeconds: params.durationSeconds,
      isBillable: params.isBillable ?? true,
    })
    .then((response) => ({
      entry: toTimeEntry(response.entry),
      overlapWarning: response.overlapWarning ?? null,
    }))
}

export interface CreateSharedManualEntryParams extends CreateManualEntryParams {
  assigneeUserIds: string[]
}

export interface CreateSharedManualEntryResult {
  entries: TimeEntry[]
  overlapWarning: string | null
}

function sharedManualEntryResponses(
  response: Record<string, unknown>,
): TimeEntryResponse[] {
  const entries = response.entries ?? response.Entries
  if (Array.isArray(entries)) return entries as TimeEntryResponse[]

  const single = response.entry ?? response.Entry
  if (single && typeof single === 'object') return [single as TimeEntryResponse]

  throw new Error('Shared manual entry response did not include any entries.')
}

export function createSharedManualEntry(
  params: CreateSharedManualEntryParams,
): Promise<CreateSharedManualEntryResult> {
  return apiClient
    .post<Record<string, unknown>>('/time-entries/shared/manual', {
      assigneeUserIds: params.assigneeUserIds,
      description: params.description,
      startedAtUtc: params.startedAtUtc,
      endedAtUtc: params.endedAtUtc,
      isBillable: params.isBillable ?? true,
      confirmOverlap: params.confirmOverlap ?? false,
    })
    .then((response) => ({
      entries: sharedManualEntryResponses(response).map(toTimeEntry),
      overlapWarning:
        (response.overlapWarning as string | null | undefined) ??
        (response.OverlapWarning as string | null | undefined) ??
        null,
    }))
}

export interface ShareExistingEntryParams {
  assigneeUserIds: string[]
  confirmOverlap?: boolean
}

export function shareExistingTimeEntry(
  entryId: string,
  params: ShareExistingEntryParams,
): Promise<CreateSharedManualEntryResult> {
  return apiClient
    .post<Record<string, unknown>>(`/time-entries/${entryId}/share`, {
      assigneeUserIds: params.assigneeUserIds,
      confirmOverlap: params.confirmOverlap ?? false,
    })
    .then((response) => ({
      entries: sharedManualEntryResponses(response).map(toTimeEntry),
      overlapWarning:
        (response.overlapWarning as string | null | undefined) ??
        (response.OverlapWarning as string | null | undefined) ??
        null,
    }))
}

export function listPendingTimeEntries(): Promise<TimeEntry[]> {
  return apiClient
    .get<TimeEntryResponse[]>('/time-entries/pending')
    .then((entries) => entries.map(toTimeEntry))
}

export function updatePendingTimeEntry(
  id: string,
  params: UpdateTimeEntryParams,
): Promise<UpdateTimeEntryResult> {
  return apiClient
    .put<{ entry: TimeEntryResponse; overlapWarning?: string | null }>(`/time-entries/pending/${id}`, {
      description: params.description,
      startedAtUtc: params.startedAtUtc,
      endedAtUtc: params.endedAtUtc,
      isBillable: params.isBillable ?? true,
      confirmOverlap: params.confirmOverlap ?? false,
    })
    .then((response) => ({
      entry: toTimeEntry(response.entry),
      overlapWarning: response.overlapWarning ?? null,
    }))
}

export function approvePendingTimeEntry(id: string): Promise<TimeEntry> {
  return apiClient
    .post<TimeEntryResponse>(`/time-entries/pending/${id}/approve`)
    .then(toTimeEntry)
}

export function timeEntryApiErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'body' in error) {
    const body = (error as { body: unknown }).body
    if (typeof body === 'string' && body.length > 0) return body

    if (body && typeof body === 'object') {
      for (const key of ['message', 'title', 'detail'] as const) {
        const value = (body as Record<string, unknown>)[key]
        if (typeof value === 'string' && value.length > 0) return value
      }
    }
  }

  if (error instanceof Error && error.message) {
    if (error.message === 'Failed to fetch') {
      return 'Could not reach the server. Make sure the backend is running.'
    }

    return error.message
  }

  return fallback
}
