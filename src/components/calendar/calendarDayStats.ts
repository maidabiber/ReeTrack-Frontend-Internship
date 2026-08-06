import type { ActiveTimer, TimeEntry } from '../../types/timeEntry'
import { isSameDay } from './dateUtils'

/** Per-day logged seconds for calendar day headers. */
export function calendarDayTotalSeconds(
  day: Date,
  entries: TimeEntry[],
  activeTimer: ActiveTimer | null = null,
  elapsedSeconds = 0,
): number {
  let totalSeconds = 0

  for (const entry of entries) {
    if (!entry.startedAtUtc) continue
    if (!isSameDay(new Date(entry.startedAtUtc), day)) continue
    totalSeconds += entry.durationSeconds
  }

  if (activeTimer?.startedAtUtc && isSameDay(new Date(activeTimer.startedAtUtc), day)) {
    totalSeconds += elapsedSeconds
  }

  return totalSeconds
}
