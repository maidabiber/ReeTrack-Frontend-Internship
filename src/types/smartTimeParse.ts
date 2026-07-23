export interface SmartTimeParseResult {
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

export type SmartParseEntryVariant = 'range' | 'duration'

export interface SmartParseSeed {
  nonce: number
  variant: SmartParseEntryVariant
  durationMinutes: number
  startTime: string | null
  endTime: string | null
  entryDate: string | null
}
