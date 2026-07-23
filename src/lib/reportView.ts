import type { ProjectHours } from '../components/charts/ProjectBreakdown'
import type { WeekTrendPoint } from '../components/charts/RecentWeeksTrend'
import type { WeekDayHours } from '../components/charts/WeekHoursBarChart'
import type { DayOfWeekHours, ProjectSummary, TrendPoint } from '../types/report'

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

/** Maps per-project hours → ProjectBreakdown bars. */
export function toProjectBreakdownData(projects: ProjectSummary[]): ProjectHours[] {
  return projects.map((project) => ({
    name: project.name,
    seconds: project.totalSeconds,
  }))
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
