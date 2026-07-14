import { endOfWeek, startOfWeek } from '../components/calendar/dateUtils'
import type { ActiveTimer, TimeEntry } from '../types/timeEntry'

export function useTimeTotals(
  entries: TimeEntry[],
  activeTimer: ActiveTimer | null,
  elapsedSeconds: number,
): {
  todayTotalSeconds: number
  weekTotalSeconds: number
} {
  const now = new Date()
  const weekStart = startOfWeek(now)
  const weekEnd = endOfWeek(now)

  const todayTotalSeconds = entries.reduce((total, entry) => {
    if (!entry.startedAtUtc) return total
    const started = new Date(entry.startedAtUtc)
    const isToday =
      started.getFullYear() === now.getFullYear() &&
      started.getMonth() === now.getMonth() &&
      started.getDate() === now.getDate()
    return isToday ? total + entry.durationSeconds : total
  }, 0)

  const weekTotalSeconds = entries.reduce((total, entry) => {
    if (!entry.startedAtUtc) return total
    const started = new Date(entry.startedAtUtc)
    if (started >= weekStart && started <= weekEnd) {
      return total + entry.durationSeconds
    }
    return total
  }, 0)

  let displayWeekTotalSeconds = weekTotalSeconds
  if (activeTimer?.startedAtUtc) {
    const started = new Date(activeTimer.startedAtUtc)
    if (started >= weekStart && started <= weekEnd) {
      displayWeekTotalSeconds += elapsedSeconds
    }
  }

  return {
    todayTotalSeconds,
    weekTotalSeconds: displayWeekTotalSeconds,
  }
}
