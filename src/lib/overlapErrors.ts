import { ApiError } from '../api/client'
import { timeEntryApiErrorMessage } from '../api/timeEntries'

export const DURATION_LIMIT_MESSAGE =
  'Duration cannot exceed 24 hours. Please shorten the entry before saving.'

export function isOverlapConflictError(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 409) return false
  const message = timeEntryApiErrorMessage(error, '')
  return message.toLowerCase().includes('overlap')
}

export function isDurationLimitError(error: unknown): boolean {
  const message = timeEntryApiErrorMessage(error, '')
  return message.toLowerCase().includes('24 hour')
}
