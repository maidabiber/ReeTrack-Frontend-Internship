import type { ActiveTimer, TimeEntry } from '../types/timeEntry'
import { apiClient } from './client'

interface TimeEntryResponse {
  id: string
  description: string | null
  isBillable: boolean
  mode: string
  startedAtUtc: string | null
  endedAtUtc: string | null
  durationSeconds: number
  isRunning: boolean
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

export function stopTimer(description?: string): Promise<TimeEntry> {
  return apiClient
    .post<TimeEntryResponse>('/time-entries/timer/stop', { description })
    .then(toTimeEntry)
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

export function timeEntryApiErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'body' in error) {
    const body = (error as { body: unknown }).body
    if (body && typeof body === 'object' && 'message' in body) {
      const message = (body as { message: unknown }).message
      if (typeof message === 'string' && message.length > 0) return message
    }
  }
  return fallback
}
