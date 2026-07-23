import type { TimeEntryTemplate } from '../types/timeEntryTemplate'
import type { TimeEntryTag } from '../types/timeEntry'
import type { PagedResult } from '../types/paged'
import { apiClient, apiErrorMessage } from './client'
import { appendListQueryParams, toPagedResult } from './pagination'

/** Mirrors backend TimeEntryTemplateResponse. */
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
  projectName?: string | null
  projectColor?: string | null
  projectTaskName?: string | null
  tags?: TimeEntryTag[]
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
    projectName: response.projectName ?? null,
    projectColor: response.projectColor ?? null,
    taskName: response.projectTaskName ?? null,
    tags: (response.tags ?? []).map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
    })),
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
