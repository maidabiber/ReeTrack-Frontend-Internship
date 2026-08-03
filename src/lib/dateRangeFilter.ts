import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from '../components/calendar/dateUtils'

export type DateRangeKey = 'all' | 'today' | 'week' | 'month' | 'last30'

export const DATE_RANGE_OPTIONS: ReadonlyArray<{
  key: DateRangeKey
  label: string
  shortLabel: string
}> = [
  { key: 'all', label: 'All dates', shortLabel: 'All' },
  { key: 'today', label: 'Today', shortLabel: 'Today' },
  { key: 'week', label: 'This week', shortLabel: 'Week' },
  { key: 'month', label: 'This month', shortLabel: 'Month' },
  { key: 'last30', label: 'Last 30 days', shortLabel: '30d' },
]

/** Resolves a preset to a concrete window; null means "no bound" (All dates). */
export function resolveDateRange(key: DateRangeKey, now: Date = new Date()): { from: Date; to: Date } | null {
  switch (key) {
    case 'all':
      return null
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) }
    case 'week':
      return { from: startOfWeek(now), to: endOfWeek(now) }
    case 'month':
      return { from: startOfMonth(now), to: endOfMonth(now) }
    case 'last30':
      return { from: startOfDay(addDays(now, -29)), to: endOfDay(now) }
  }
}

/**
 * Entries with no start time can't be placed on a date, so a bounded range
 * excludes them — the same rule WeekEntriesList uses for its "No start time" group.
 */
export function filterEntriesByDateRange<T extends { startedAtUtc?: string | null }>(
  entries: T[],
  key: DateRangeKey,
  now: Date = new Date(),
): T[] {
  const range = resolveDateRange(key, now)
  if (!range) return entries

  return entries.filter((entry) => {
    if (!entry.startedAtUtc) return false
    const started = new Date(entry.startedAtUtc)
    return started >= range.from && started <= range.to
  })
}
