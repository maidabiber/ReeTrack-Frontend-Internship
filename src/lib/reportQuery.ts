import type { ReportQuery } from '../types/reportQuery'

const FILTER_ARRAY_KEYS = [
  'userIds',
  'projectIds',
  'clientIds',
  'taskIds',
  'tagIds',
] as const

export function defaultReportQuery(now = new Date()): ReportQuery {
  const daysSinceMonday = (now.getUTCDay() + 6) % 7
  const monday = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - daysSinceMonday,
  ))
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)

  return {
    userIds: [],
    projectIds: [],
    clientIds: [],
    taskIds: [],
    tagIds: [],
    billable: null,
    from: utcDateOnly(monday),
    to: utcDateOnly(sunday),
    groupBy: [],
  }
}

export function cloneReportQuery(query: ReportQuery): ReportQuery {
  return {
    ...query,
    userIds: [...query.userIds],
    projectIds: [...query.projectIds],
    clientIds: [...query.clientIds],
    taskIds: [...query.taskIds],
    tagIds: [...query.tagIds],
    groupBy: [...query.groupBy],
  }
}

export function reportQueryKey(query: ReportQuery): string {
  const normalized = cloneReportQuery(query)
  for (const key of FILTER_ARRAY_KEYS) {
    normalized[key].sort()
  }
  return JSON.stringify(normalized)
}

export function queriesEqual(left: ReportQuery, right: ReportQuery): boolean {
  return reportQueryKey(left) === reportQueryKey(right)
}

export function toReportSearchParams(query: ReportQuery): URLSearchParams {
  const params = new URLSearchParams()
  for (const key of FILTER_ARRAY_KEYS) {
    for (const value of query[key]) {
      params.append(key, value)
    }
  }
  if (query.billable !== null) params.set('billable', String(query.billable))
  if (query.from) params.set('from', query.from)
  if (query.to) params.set('to', query.to)
  for (const group of query.groupBy) params.append('groupBy', group)
  return params
}

export type ReportDatePreset =
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisYear'
  | 'lastYear'
  | 'allTime'

/** UTC date range for a named preset. */
export function reportDatePreset(
  kind: ReportDatePreset,
  now = new Date(),
): { from: string | null; to: string | null } {
  if (kind === 'allTime') return { from: null, to: null }

  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  const d = now.getUTCDate()

  if (kind === 'thisWeek' || kind === 'lastWeek') {
    const daysSinceMonday = (now.getUTCDay() + 6) % 7
    const thisMonday = new Date(Date.UTC(y, m, d - daysSinceMonday))
    if (kind === 'thisWeek') {
      const sunday = new Date(thisMonday)
      sunday.setUTCDate(thisMonday.getUTCDate() + 6)
      return { from: utcDateOnly(thisMonday), to: utcDateOnly(sunday) }
    }
    const lastMonday = new Date(thisMonday)
    lastMonday.setUTCDate(thisMonday.getUTCDate() - 7)
    const lastSunday = new Date(lastMonday)
    lastSunday.setUTCDate(lastMonday.getUTCDate() + 6)
    return { from: utcDateOnly(lastMonday), to: utcDateOnly(lastSunday) }
  }

  if (kind === 'thisMonth') {
    const from = new Date(Date.UTC(y, m, 1))
    const to = new Date(Date.UTC(y, m + 1, 0))
    return { from: utcDateOnly(from), to: utcDateOnly(to) }
  }

  if (kind === 'lastMonth') {
    const from = new Date(Date.UTC(y, m - 1, 1))
    const to = new Date(Date.UTC(y, m, 0))
    return { from: utcDateOnly(from), to: utcDateOnly(to) }
  }

  if (kind === 'thisYear') {
    return {
      from: utcDateOnly(new Date(Date.UTC(y, 0, 1))),
      to: utcDateOnly(new Date(Date.UTC(y, 11, 31))),
    }
  }

  // lastYear
  return {
    from: utcDateOnly(new Date(Date.UTC(y - 1, 0, 1))),
    to: utcDateOnly(new Date(Date.UTC(y - 1, 11, 31))),
  }
}

/** Returns the preset that matches from/to exactly, or null when custom. */
export function matchReportDatePreset(
  from: string | null,
  to: string | null,
  now = new Date(),
): ReportDatePreset | null {
  const kinds: ReportDatePreset[] = [
    'thisWeek',
    'lastWeek',
    'thisMonth',
    'lastMonth',
    'thisYear',
    'lastYear',
    'allTime',
  ]
  for (const kind of kinds) {
    const range = reportDatePreset(kind, now)
    if (range.from === from && range.to === to) return kind
  }
  return null
}

function utcDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}
