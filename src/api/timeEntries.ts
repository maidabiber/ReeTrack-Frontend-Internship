import type {
  ActiveTimer,
  TimeEntry,
  TimeEntryAssociations,
  TimeEntryParticipant,
  TimeEntryTag,
} from '../types/timeEntry'
import { apiClient } from './client'

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

function associationBody(params?: TimeEntryAssociations) {
  return {
    ...(params?.projectId !== undefined ? { projectId: params.projectId } : {}),
    ...(params?.projectTaskId !== undefined ? { projectTaskId: params.projectTaskId } : {}),
    ...(params?.tagIds !== undefined ? { tagIds: params.tagIds } : {}),
    isBillable: params?.isBillable ?? true,
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

export function startTimer(
  description?: string,
  associations?: TimeEntryAssociations,
): Promise<ActiveTimer> {
  return apiClient
    .post<TimeEntryResponse>('/time-entries/timer/start', {
      description,
      ...associationBody(associations),
    })
    .then(toActiveTimer)
}

export interface StopTimerParams {
  description?: string
  assigneeUserIds?: string[]
  associations?: TimeEntryAssociations
}

export type StopTimerResult =
  | { kind: 'single'; entry: TimeEntry }
  | { kind: 'shared'; entries: TimeEntry[] }

export function stopTimer(params?: StopTimerParams): Promise<StopTimerResult> {
  const hasAssignees = Boolean(params?.assigneeUserIds?.length)

  return apiClient
    .post<TimeEntryResponse | Record<string, unknown>>('/time-entries/timer/stop', {
      description: params?.description,
      ...associationBody(params?.associations),
      ...(hasAssignees
        ? {
            assigneeUserIds: params!.assigneeUserIds,
          }
        : {}),
    })
    .then((response) => {
      if (hasAssignees) {
        const sharedResponse = response as Record<string, unknown>
        return {
          kind: 'shared' as const,
          entries: sharedManualEntryResponses(sharedResponse).map(toTimeEntry),
        }
      }

      return {
        kind: 'single' as const,
        entry: toTimeEntry(response as TimeEntryResponse),
      }
    })
}

export interface CreateManualEntryParams extends TimeEntryAssociations {
  description?: string
  startedAtUtc: string
  endedAtUtc: string
}

export interface CreateManualEntryResult {
  entry: TimeEntry
}

export function createManualEntry(params: CreateManualEntryParams): Promise<CreateManualEntryResult> {
  return apiClient
    .post<{ entry: TimeEntryResponse }>('/time-entries/manual', {
      description: params.description,
      startedAtUtc: params.startedAtUtc,
      endedAtUtc: params.endedAtUtc,
      ...associationBody(params),
    })
    .then((response) => ({
      entry: toTimeEntry(response.entry),
    }))
}

export interface CreateDurationOnlyEntryParams extends TimeEntryAssociations {
  description?: string
  entryDateUtc: string
  durationSeconds: number
}

export function createDurationOnlyEntry(
  params: CreateDurationOnlyEntryParams,
): Promise<CreateManualEntryResult> {
  return apiClient
    .post<{ entry: TimeEntryResponse }>('/time-entries/duration', {
      description: params.description,
      entryDateUtc: params.entryDateUtc,
      durationSeconds: params.durationSeconds,
      ...associationBody(params),
    })
    .then((response) => ({
      entry: toTimeEntry(response.entry),
    }))
}

export interface UpdateTimeEntryParams extends TimeEntryAssociations {
  description?: string
  startedAtUtc: string
  endedAtUtc: string
}

export interface UpdateTimeEntryResult {
  entry: TimeEntry
}

export function updateTimeEntry(id: string, params: UpdateTimeEntryParams): Promise<UpdateTimeEntryResult> {
  return apiClient
    .put<{ entry: TimeEntryResponse }>(`/time-entries/${id}`, {
      description: params.description,
      startedAtUtc: params.startedAtUtc,
      endedAtUtc: params.endedAtUtc,
      ...associationBody(params),
    })
    .then((response) => ({
      entry: toTimeEntry(response.entry),
    }))
}

export interface UpdateDurationOnlyEntryParams extends TimeEntryAssociations {
  description?: string
  entryDateUtc: string
  durationSeconds: number
}

export function updateDurationOnlyEntry(
  id: string,
  params: UpdateDurationOnlyEntryParams,
): Promise<UpdateTimeEntryResult> {
  return apiClient
    .put<{ entry: TimeEntryResponse }>(`/time-entries/${id}/duration`, {
      description: params.description,
      entryDateUtc: params.entryDateUtc,
      durationSeconds: params.durationSeconds,
      ...associationBody(params),
    })
    .then((response) => ({
      entry: toTimeEntry(response.entry),
    }))
}

export interface CreateSharedManualEntryParams extends CreateManualEntryParams {
  assigneeUserIds: string[]
}

export interface CreateSharedManualEntryResult {
  entries: TimeEntry[]
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
      ...associationBody(params),
    })
    .then((response) => ({
      entries: sharedManualEntryResponses(response).map(toTimeEntry),
      overlapWarning:
        (response.overlapWarning as string | null | undefined) ??
        (response.OverlapWarning as string | null | undefined) ??
        null,
    }))
}

export interface CreateSharedDurationOnlyEntryParams extends CreateDurationOnlyEntryParams {
  assigneeUserIds: string[]
}

export function createSharedDurationOnlyEntry(
  params: CreateSharedDurationOnlyEntryParams,
): Promise<CreateSharedManualEntryResult> {
  return apiClient
    .post<Record<string, unknown>>('/time-entries/shared/duration', {
      assigneeUserIds: params.assigneeUserIds,
      description: params.description,
      entryDateUtc: params.entryDateUtc,
      durationSeconds: params.durationSeconds,
      ...associationBody(params),
    })
    .then((response) => ({
      entries: sharedManualEntryResponses(response).map(toTimeEntry),
    }))
}

export interface ShareExistingEntryParams {
  assigneeUserIds: string[]
}

export function shareExistingTimeEntry(
  entryId: string,
  params: ShareExistingEntryParams,
): Promise<CreateSharedManualEntryResult> {
  return apiClient
    .post<Record<string, unknown>>(`/time-entries/${entryId}/share`, {
      assigneeUserIds: params.assigneeUserIds,
    })
    .then((response) => ({
      entries: sharedManualEntryResponses(response).map(toTimeEntry),
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
    .put<{ entry: TimeEntryResponse }>(`/time-entries/pending/${id}`, {
      description: params.description,
      startedAtUtc: params.startedAtUtc,
      endedAtUtc: params.endedAtUtc,
      ...associationBody(params),
    })
    .then((response) => ({
      entry: toTimeEntry(response.entry),
    }))
}

export function approvePendingTimeEntry(id: string): Promise<TimeEntry> {
  return apiClient
    .post<TimeEntryResponse>(`/time-entries/pending/${id}/approve`)
    .then(toTimeEntry)
}
