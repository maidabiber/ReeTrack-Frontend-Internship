import type { TimeEntryTemplate } from '../types/timeEntryTemplate'
import type { PagedResult } from '../types/paged'
import { apiClient, apiErrorMessage } from './client'
import { appendListQueryParams, toPagedResult } from './pagination'

/** Mirrors backend TimeEntryTemplateResponse (core fields only). */
interface TimeEntryTemplateResponse {
  id: string
  timeEntryId: string
  projectId: string | null
  projectTaskId: string | null
  description: string | null
  isBillable: boolean
  startTimeUtc: string | null
  endTimeUtc: string | null
  durationSeconds: number
  createdAtUtc: string
}

function toTemplate(response: TimeEntryTemplateResponse): TimeEntryTemplate {
  return {
    id: response.id,
    timeEntryId: response.timeEntryId,
    projectId: response.projectId,
    projectTaskId: response.projectTaskId,
    description: response.description,
    isBillable: response.isBillable,
    startTimeUtc: response.startTimeUtc,
    endTimeUtc: response.endTimeUtc,
    durationSeconds: response.durationSeconds,
    createdAtUtc: response.createdAtUtc,
    projectName: null,
    projectColor: null,
    taskName: null,
    isFavourite: true,
    lastUsedAtUtc: response.createdAtUtc,
  }
}

export function listTimeEntryTemplates(
  page = 1,
  pageSize = 50,
): Promise<PagedResult<TimeEntryTemplate>> {
  const params = new URLSearchParams()
  appendListQueryParams(params, { page, pageSize })

  return apiClient
    .get<PagedResult<TimeEntryTemplateResponse>>(`/time-entry-templates?${params}`)
    .then((result) => toPagedResult(result, toTemplate))
}

export function createTimeEntryTemplate(timeEntryId: string): Promise<TimeEntryTemplate> {
  return apiClient
    .post<TimeEntryTemplateResponse>('/time-entry-templates', { timeEntryId })
    .then(toTemplate)
}

export function deleteTimeEntryTemplate(templateId: string): Promise<void> {
  return apiClient.delete(`/time-entry-templates/${templateId}`).then(() => undefined)
}

export function timeEntryTemplateApiErrorMessage(error: unknown, fallback: string): string {
  return apiErrorMessage(error, fallback)
}

/** Fired after templates are created/deleted so panels can refetch. */
export const TIME_ENTRY_TEMPLATES_CHANGED_EVENT = 'time-entry-templates:changed'

export function notifyTimeEntryTemplatesChanged(): void {
  window.dispatchEvent(new Event(TIME_ENTRY_TEMPLATES_CHANGED_EVENT))
}
