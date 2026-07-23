import { apiClient } from './client'
import type { SmartTimeParseResult } from '../types/smartTimeParse'

interface SmartTimeParseResponse {
  description: string
  durationMinutes: number
  matchedProjectId: string | null
  matchedProjectTaskId: string | null
  matchedTagIds: string[]
  isBillable: boolean
  startTime: string | null
  endTime: string | null
  entryDate: string | null
  confidenceScore: number
}

function toSmartTimeParseResult(response: SmartTimeParseResponse): SmartTimeParseResult {
  return {
    description: response.description,
    durationMinutes: response.durationMinutes,
    matchedProjectId: response.matchedProjectId,
    matchedProjectTaskId: response.matchedProjectTaskId,
    matchedTagIds: response.matchedTagIds ?? [],
    isBillable: response.isBillable,
    startTime: response.startTime,
    endTime: response.endTime,
    entryDate: response.entryDate,
    confidenceScore: response.confidenceScore,
  }
}

export function parseSmartTimeEntry(text: string): Promise<SmartTimeParseResult> {
  return apiClient
    .post<SmartTimeParseResponse>('/time-entries/smart-parse', { text })
    .then(toSmartTimeParseResult)
}
