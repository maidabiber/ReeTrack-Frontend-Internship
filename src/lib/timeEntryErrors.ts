import { ApiError } from '../api/client'

export const DURATION_LIMIT_MESSAGE =
  'Duration cannot exceed 24 hours. Please shorten the entry before saving.'

/** Machine-readable error code from an RFC 7807 ProblemDetails body (see backend ErrorCode enum). */
function errorCode(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null
  const body = error.body
  if (body && typeof body === 'object' && 'code' in body) {
    const code = (body as { code: unknown }).code
    if (typeof code === 'string') return code
  }
  return null
}

export function isOverlapConflictError(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 409) return false
  return errorCode(error) === 'EntryOverlap'
}

export function isDurationLimitError(error: unknown): boolean {
  return errorCode(error) === 'DurationLimitExceeded'
}