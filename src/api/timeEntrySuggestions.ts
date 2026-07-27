import type { TimeEntrySuggestion } from '../types/timeEntrySuggestion'
import type { TimeEntryTemplate } from '../types/timeEntryTemplate'
import { apiClient, apiErrorMessage } from './client'

/** Mirrors backend TimeEntrySuggestionResponse. */
interface TimeEntrySuggestionResponse {
  clientId: string | null
  projectId: string | null
  projectTaskId: string | null
  isBillable: boolean
  suggestedDescription: string | null
  suggestedStartTimeUtc: string | null
  suggestedEndTimeUtc: string | null
  durationSeconds: number
  score: number
  projectName?: string | null
  projectColor?: string | null
  projectTaskName?: string | null
}

function toSuggestion(response: TimeEntrySuggestionResponse): TimeEntrySuggestion {
  return {
    clientId: response.clientId,
    projectId: response.projectId,
    projectTaskId: response.projectTaskId,
    isBillable: response.isBillable,
    suggestedDescription: response.suggestedDescription,
    suggestedStartTimeUtc: response.suggestedStartTimeUtc,
    suggestedEndTimeUtc: response.suggestedEndTimeUtc,
    durationSeconds: response.durationSeconds,
    score: response.score,
    projectName: response.projectName ?? null,
    projectColor: response.projectColor ?? null,
    projectTaskName: response.projectTaskName ?? null,
  }
}

/** Stable synthetic id so suggestion cards can share selection state with favourites. */
export function suggestionCardId(suggestion: TimeEntrySuggestion): string {
  return [
    'suggestion',
    suggestion.clientId ?? '',
    suggestion.projectId ?? '',
    suggestion.projectTaskId ?? '',
    suggestion.isBillable ? '1' : '0',
    suggestion.suggestedDescription ?? '',
  ].join(':')
}

/** Map a suggestion into the shape expected by TimeEntryTemplateCard / applyDraftTemplate. */
export function suggestionToTemplateCard(suggestion: TimeEntrySuggestion): TimeEntryTemplate {
  return {
    id: suggestionCardId(suggestion),
    timeEntryId: '',
    projectId: suggestion.projectId,
    projectTaskId: suggestion.projectTaskId,
    description: suggestion.suggestedDescription,
    isBillable: suggestion.isBillable,
    startTimeUtc: suggestion.suggestedStartTimeUtc,
    endTimeUtc: suggestion.suggestedEndTimeUtc,
    durationSeconds: suggestion.durationSeconds,
    createdAtUtc: '',
    projectName: suggestion.projectName,
    projectColor: suggestion.projectColor,
    taskName: suggestion.projectTaskName,
    tags: [],
    isFavourite: false,
    lastUsedAtUtc: '',
  }
}

export function listTimeEntrySuggestions(): Promise<TimeEntrySuggestion[]> {
  return apiClient
    .get<TimeEntrySuggestionResponse[]>('/time-entry-suggestions')
    .then((items) => items.map(toSuggestion))
}

export function timeEntrySuggestionApiErrorMessage(error: unknown, fallback: string): string {
  return apiErrorMessage(error, fallback)
}
