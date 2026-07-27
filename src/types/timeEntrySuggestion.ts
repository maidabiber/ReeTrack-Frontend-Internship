/**
 * Mirrors backend TimeEntrySuggestionResponse.
 */
export interface TimeEntrySuggestion {
  clientId: string | null
  projectId: string | null
  projectTaskId: string | null
  isBillable: boolean
  suggestedDescription: string | null
  suggestedStartTimeUtc: string | null
  suggestedEndTimeUtc: string | null
  durationSeconds: number
  score: number
  projectName: string | null
  projectColor: string | null
  projectTaskName: string | null
}
