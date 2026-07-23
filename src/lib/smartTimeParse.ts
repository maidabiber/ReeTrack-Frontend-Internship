import type { ManualEntryState } from './manualEntry'
import type { SmartParseSeed, SmartTimeParseResult } from '../types/smartTimeParse'

/** Smart parse always uses single-day date + duration (no start/end datetime fields). */
export function resolveSmartParseVariant(parsed: SmartTimeParseResult): 'duration' | null {
  if (getEffectiveDurationMinutes(parsed) > 0) return 'duration'
  return null
}

export function getEffectiveDurationMinutes(parsed: SmartTimeParseResult): number {
  if (parsed.durationMinutes > 0) return parsed.durationMinutes

  if (!parsed.startTime || !parsed.endTime) return 0

  const [startHours, startMinutes] = parsed.startTime.split(':').map((part) => Number.parseInt(part, 10))
  const [endHours, endMinutes] = parsed.endTime.split(':').map((part) => Number.parseInt(part, 10))
  if (
    Number.isNaN(startHours) ||
    Number.isNaN(startMinutes) ||
    Number.isNaN(endHours) ||
    Number.isNaN(endMinutes)
  ) {
    return 0
  }

  const startTotal = startHours * 60 + startMinutes
  const endTotal = endHours * 60 + endMinutes
  if (endTotal <= startTotal) return 0

  return endTotal - startTotal
}

function parseEntryDate(value: string | null, fallback = new Date()): Date {
  if (!value) return fallback
  const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10))
  if (!year || !month || !day) return fallback
  const parsed = new Date(year, month - 1, day)
  return Number.isNaN(parsed.getTime()) ? fallback : parsed
}

function combineDateAndTime(date: Date, time: string): Date | null {
  const [hours, minutes] = time.split(':').map((part) => Number.parseInt(part, 10))
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes)
}

export function createManualEntryFromSmartParse(parsed: SmartTimeParseResult): ManualEntryState | null {
  if (!parsed.startTime || !parsed.endTime) return null

  const entryDate = parseEntryDate(parsed.entryDate)
  const start = combineDateAndTime(entryDate, parsed.startTime)
  const end = combineDateAndTime(entryDate, parsed.endTime)
  if (!start || !end || end <= start) return null

  const durationSeconds = Math.floor((end.getTime() - start.getTime()) / 1000)
  return { start, end, durationSeconds }
}

export function createSmartParseSeed(parsed: SmartTimeParseResult, nonce: number): SmartParseSeed | null {
  const durationMinutes = getEffectiveDurationMinutes(parsed)
  if (durationMinutes <= 0) return null

  return {
    nonce,
    variant: 'duration',
    durationMinutes,
    startTime: null,
    endTime: null,
    entryDate: parsed.entryDate,
  }
}
