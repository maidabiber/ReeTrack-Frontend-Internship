import { formatDurationHms } from './formatDuration'

export const MAX_MANUAL_DURATION_SECONDS = 24 * 60 * 60

export const MANUAL_ENTRY_MESSAGES = {
  endBeforeStart: 'End time must be later than the start time.',
  durationOver24Hours:
    'Are you sure? This entry is longer than 24 hours. Please double-check your times.',
  overlap: 'Note: This time entry overlaps with an existing record.',
} as const

export type ManualEntryField = 'start' | 'end' | 'duration'

export interface ManualEntryState {
  start: Date
  end: Date
  durationSeconds: number
}

export interface ManualEntryValidation {
  error: string | null
  durationWarning: string | null
  overlapWarning: string | null
  isScheduledFuture: boolean
}

export function createManualEntryFromTimeEntry(entry: {
  startedAtUtc: string | null
  endedAtUtc: string | null
  durationSeconds: number
}): ManualEntryState {
  const start = entry.startedAtUtc ? new Date(entry.startedAtUtc) : new Date()
  const end = entry.endedAtUtc ? new Date(entry.endedAtUtc) : new Date(start.getTime() + entry.durationSeconds * 1000)
  return {
    start,
    end,
    durationSeconds: entry.durationSeconds,
  }
}

export function createManualEntryFromCalendarEvent(event: {
  start: Date
  end: Date
}): ManualEntryState {
  const start = event.start
  let end = event.end

  if (end <= start) {
    end = new Date(start.getTime() + 60 * 60 * 1000)
  }

  let durationSeconds = Math.floor((end.getTime() - start.getTime()) / 1000)
  if (durationSeconds > MAX_MANUAL_DURATION_SECONDS) {
    durationSeconds = MAX_MANUAL_DURATION_SECONDS
    end = new Date(start.getTime() + durationSeconds * 1000)
  }

  return { start, end, durationSeconds }
}

export function createDefaultManualEntry(now = new Date()): ManualEntryState {
  const end = roundToMinute(now)
  const start = new Date(end.getTime() - 60 * 60 * 1000)
  return {
    start,
    end,
    durationSeconds: Math.floor((end.getTime() - start.getTime()) / 1000),
  }
}

export function applyManualFieldChange(
  current: ManualEntryState,
  field: ManualEntryField,
  value: Date | number,
): ManualEntryState {
  if (field === 'start') {
    const start = value as Date
    if (current.end > start) {
      return {
        start,
        end: current.end,
        durationSeconds: Math.floor((current.end.getTime() - start.getTime()) / 1000),
      }
    }

    const durationSeconds = current.durationSeconds > 0 ? current.durationSeconds : 60
    const end = new Date(start.getTime() + durationSeconds * 1000)
    return { start, end, durationSeconds }
  }

  if (field === 'end') {
    const end = value as Date
    if (end <= current.start) {
      const durationSeconds = current.durationSeconds > 0 ? current.durationSeconds : 60
      const start = new Date(end.getTime() - durationSeconds * 1000)
      return { start, end, durationSeconds }
    }

    return {
      start: current.start,
      end,
      durationSeconds: Math.floor((end.getTime() - current.start.getTime()) / 1000),
    }
  }

  const durationSeconds = Math.max(1, value as number)
  const end = new Date(current.start.getTime() + durationSeconds * 1000)
  return {
    start: current.start,
    end,
    durationSeconds,
  }
}

export function toDatetimeLocalValue(date: Date): string {
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function parseDatetimeLocal(value: string): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function parseDurationInput(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const parts = trimmed.split(':').map((part) => Number.parseInt(part, 10))
  if (parts.some((part) => Number.isNaN(part) || part < 0)) return null

  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 3600 + parts[1] * 60
  if (parts.length === 1) return parts[0] * 60

  return null
}

interface OverlapEntry {
  id: string
  description: string | null
  startedAtUtc: string | null
  endedAtUtc: string | null
  isRunning: boolean
}

export function validateDurationOnlyEntry(durationSeconds: number): string | null {
  if (durationSeconds <= 0) return 'Duration must be greater than zero'

  if (durationSeconds > MAX_MANUAL_DURATION_SECONDS) {
    return MANUAL_ENTRY_MESSAGES.durationOver24Hours
  }

  return null
}

export function toDateInputValue(date: Date): string {
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseDateInput(value: string): Date | null {
  if (!value) return null

  const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10))
  if (!year || !month || !day) return null

  const parsed = new Date(year, month - 1, day)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function dateInputToUtcIso(value: string): string | null {
  const parsed = parseDateInput(value)
  if (!parsed) return null

  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0).toISOString()
}

export function entryDateToDateInputValue(iso: string | null | undefined, fallback = new Date()): string {
  if (!iso) return toDateInputValue(fallback)
  return toDateInputValue(new Date(iso))
}

export function formatEntryDate(iso: string): string {
  return new Date(iso).toLocaleDateString()
}

export function validateManualEntry(
  state: ManualEntryState,
  existingEntries: OverlapEntry[],
  activeTimer: { id: string; startedAtUtc: string; description: string | null } | null,
  now = new Date(),
  excludeEntryId?: string,
): ManualEntryValidation {
  if (state.end <= state.start) {
    return {
      error: MANUAL_ENTRY_MESSAGES.endBeforeStart,
      durationWarning: null,
      overlapWarning: null,
      isScheduledFuture: false,
    }
  }

  if (state.durationSeconds <= 0) {
    return {
      error: 'Duration must be greater than zero',
      durationWarning: null,
      overlapWarning: null,
      isScheduledFuture: false,
    }
  }

  const durationWarning =
    state.durationSeconds > MAX_MANUAL_DURATION_SECONDS
      ? MANUAL_ENTRY_MESSAGES.durationOver24Hours
      : null

  const isScheduledFuture = state.start.getTime() > now.getTime()
  const overlapWarning = detectOverlapWarning(state, existingEntries, activeTimer, now, excludeEntryId)

  return { error: null, durationWarning, overlapWarning, isScheduledFuture }
}

function detectOverlapWarning(
  state: ManualEntryState,
  existingEntries: OverlapEntry[],
  activeTimer: { id: string; startedAtUtc: string; description: string | null } | null,
  now: Date,
  excludeEntryId?: string,
): string | null {
  const startMs = state.start.getTime()
  const endMs = state.end.getTime()
  const overlaps: string[] = []

  for (const entry of existingEntries) {
    if (excludeEntryId && entry.id === excludeEntryId) continue
    if (!entry.startedAtUtc) continue
    const entryStart = Date.parse(entry.startedAtUtc)
    const entryEnd = entry.endedAtUtc ? Date.parse(entry.endedAtUtc) : now.getTime()
    if (entryStart < endMs && entryEnd > startMs) {
      overlaps.push(entry.description?.trim() || 'Untitled entry')
    }
  }

  if (activeTimer) {
    const entryStart = Date.parse(activeTimer.startedAtUtc)
    const entryEnd = now.getTime()
    if (entryStart < endMs && entryEnd > startMs) {
      overlaps.push(activeTimer.description?.trim() || 'Running timer')
    }
  }

  if (overlaps.length === 0) return null

  return MANUAL_ENTRY_MESSAGES.overlap
}

export function formatManualDurationInput(durationSeconds: number): string {
  return formatDurationHms(durationSeconds)
}

function roundToMinute(date: Date): Date {
  const rounded = new Date(date)
  rounded.setSeconds(0, 0)
  return rounded
}
