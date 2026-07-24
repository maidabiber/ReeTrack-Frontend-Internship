import type { ProjectHours } from '../components/charts/ProjectBreakdown'
import type { WeekTrendPoint } from '../components/charts/RecentWeeksTrend'
import type { WeekDayHours } from '../components/charts/WeekHoursBarChart'
import type { DayOfWeekHours, ProjectSummary, SummaryReport, TrendPoint } from '../types/report'

const DAY_SHORT: Record<string, string> = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
  Sunday: 'Sun',
}

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

/** Maps API Mon–Sun activity rows → WeekHoursBarChart data. */
export function toActivityChartData(activity: DayOfWeekHours[]): WeekDayHours[] {
  return activity.map((day) => ({
    day: DAY_SHORT[day.dayOfWeek] ?? day.dayOfWeek.slice(0, 3),
    seconds: day.totalSeconds,
  }))
}

/** Maps zero-filled weekly trend → RecentWeeksTrend data (status blank for portfolio). */
export function toWeeklyTrendChartData(trend: TrendPoint[]): WeekTrendPoint[] {
  return trend.map((point) => ({
    week: formatWeekLabel(point.weekStartDate),
    seconds: point.totalSeconds,
    status: '',
  }))
}

/**
 * Maps per-project hours → ProjectBreakdown bars, with time that has no project
 * folded in as its own bar so the chart accounts for all logged time.
 */
export function toProjectBreakdownData(
  projects: ProjectSummary[],
  unassignedSeconds = 0,
): ProjectHours[] {
  const bars = projects.map((project) => ({
    name: project.name,
    seconds: project.totalSeconds,
  }))

  if (unassignedSeconds > 0) bars.push({ name: 'Unassigned', seconds: unassignedSeconds })

  return bars.sort((a, b) => b.seconds - a.seconds)
}

/**
 * Money for report surfaces, matching the exports byte for byte.
 *
 * `projectFormat.formatMoney` follows the viewer's locale and drops trailing zeros,
 * which is fine for a project card but wrong here: the backend writes an invariant
 * "1,234.56 EUR" into the PDF and CSV, and the same figure must not read differently
 * on screen than in the document someone exported from it.
 */
export function formatReportMoney(amount: number, currencyCode: string): string {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
  const code = currencyCode.trim().toUpperCase()
  return code ? `${formatted} ${code}` : formatted
}

/** "2026-07-13" → "13 Jul". */
export function formatWeekLabel(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (!match) return isoDate
  const day = Number(match[3])
  const monthIndex = Number(match[2]) - 1
  if (monthIndex < 0 || monthIndex > 11) return isoDate
  return `${day} ${MONTH_SHORT[monthIndex]}`
}

/** "2026-07-13" → "13 Jul 2026". Used where a year-less label would be ambiguous. */
export function formatFullDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate)
  if (!match) return isoDate
  const monthIndex = Number(match[2]) - 1
  if (monthIndex < 0 || monthIndex > 11) return isoDate
  return `${Number(match[3])} ${MONTH_SHORT[monthIndex]} ${match[1]}`
}

/**
 * The window the report covers. Date filtering isn't built yet, so this is always
 * all-time — stated explicitly so lifetime totals aren't misread as recent figures.
 */
export function formatPeriodLabel(report: SummaryReport): string {
  if (!report.firstEntryDate) return 'All time'
  return `All time · ${formatFullDate(report.firstEntryDate)} – ${formatFullDate(report.generatedAtUtc)}`
}

/**
 * The rules behind the figures, mirroring ReportFormat.BasisLines on the server so the
 * page and the exports state the same caveats. Weekend / overtime money is not checkable
 * without the premiums that produced it.
 */
export function basisLines(report: SummaryReport): string[] {
  const { basis } = report
  const pct = (fraction: number) => `${Number((fraction * 100).toFixed(2))}%`
  const hours = Number(basis.weeklyOvertimeThresholdHours.toFixed(2))

  return [
    'Confirmed time entries only; pending and rejected time is excluded.',
    `Weekend +${pct(basis.weekendPremium)}, holiday +${pct(basis.holidayPremium)}, overtime +${pct(
      basis.overtimePremium,
    )} above ${hours}h per person per week.`,
    'Cost is internal labour cost from member hourly rates, not client revenue.',
    'Amounts are never summed across currencies.',
    'Days, weekends and holidays are determined in UTC.',
  ]
}

export interface TrendDelta {
  /** Seconds in the most recent complete window. */
  current: number
  /** Seconds in the window immediately before it. */
  previous: number
  /** Change as a percentage, or null when the previous window was empty. */
  pct: number | null
  weeks: number
}

/**
 * Compares the last `weeks` complete weeks against the `weeks` before them.
 *
 * The final trend point is the in-progress week; including it would compare a partial
 * week against full ones and report a decline every time, so it is dropped. Returns
 * null when there isn't enough history for two full windows.
 */
export function trendDelta(trend: TrendPoint[], weeks = 4): TrendDelta | null {
  const complete = trend.slice(0, -1)
  if (weeks < 1 || complete.length < weeks * 2) return null

  const sum = (points: TrendPoint[]) => points.reduce((total, point) => total + point.totalSeconds, 0)
  const current = sum(complete.slice(-weeks))
  const previous = sum(complete.slice(-weeks * 2, -weeks))

  return {
    current,
    previous,
    pct: previous === 0 ? null : ((current - previous) / previous) * 100,
    weeks,
  }
}

export interface AttentionItem {
  id: string
  label: string
  detail: string
}

const UNASSIGNED_SHARE_THRESHOLD = 5

/**
 * Things worth looking at, most actionable first. Empty when the portfolio is healthy —
 * the card should disappear rather than render a reassuring but empty shell.
 */
export function buildAttentionItems(report: SummaryReport): AttentionItem[] {
  const items: AttentionItem[] = []
  const { kpis, projects } = report

  // estimateUsedPct comes from the server (SummaryReportAnalytics), the same value the
  // exports use — recomputing it here is how the two would quietly drift apart.
  const overEstimate = projects.filter(
    (project) => project.estimateUsedPct !== null && project.estimateUsedPct > 100,
  )
  if (overEstimate.length > 0) {
    items.push({
      id: 'over-estimate',
      label: `${overEstimate.length} ${plural(overEstimate.length, 'project')} over time estimate`,
      detail: nameList(overEstimate.map((project) => project.name)),
    })
  }

  if (kpis.totalSeconds > 0 && kpis.unassignedSeconds > 0) {
    const share = (kpis.unassignedSeconds / kpis.totalSeconds) * 100
    if (share >= UNASSIGNED_SHARE_THRESHOLD) {
      items.push({
        id: 'unassigned',
        label: `${share.toFixed(1)}% of logged time has no project`,
        detail: 'Unlinked time is excluded from every per-project figure, including cost.',
      })
    }
  }

  const unpriced = projects.filter(
    (project) =>
      project.totalSeconds > 0 && project.hourlyRate === null && project.fixedFeeAmount === null,
  )
  if (unpriced.length > 0) {
    items.push({
      id: 'no-rate',
      label: `${unpriced.length} ${plural(unpriced.length, 'project')} with time but no rate set`,
      detail: nameList(unpriced.map((project) => project.name)),
    })
  }

  return items
}

function plural(count: number, word: string): string {
  return count === 1 ? word : `${word}s`
}

function nameList(names: string[], max = 3): string {
  if (names.length <= max) return names.join(', ')
  return `${names.slice(0, max).join(', ')} +${names.length - max} more`
}
