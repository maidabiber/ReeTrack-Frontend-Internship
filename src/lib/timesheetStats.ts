/**
 * Pure aggregation helpers for the timesheet page charts and stat tiles.
 * All bucketing is by the entry's local start date so the charts line up with
 * the calendar, which also renders entries in local time.
 */
import { formatWeekday, isSameDay } from '../components/calendar/dateUtils'
import type { WeekDayHours } from '../components/charts/WeekHoursBarChart'
import type { ProjectHours } from '../components/charts/ProjectBreakdown'
import type { TimesheetEntry } from '../types/timesheet'

export const NO_PROJECT_LABEL = 'No project'

/** Seconds logged per day of the week, one bucket per weekDays entry (in order). */
export function hoursPerDay(entries: TimesheetEntry[], weekDays: Date[]): WeekDayHours[] {
  return weekDays.map((day) => {
    let seconds = 0
    for (const entry of entries) {
      if (!entry.startedAtUtc) continue
      if (isSameDay(new Date(entry.startedAtUtc), day)) seconds += entry.durationSeconds
    }
    return { day: formatWeekday(day), seconds }
  })
}

export interface BillableSplit {
  billableSeconds: number
  nonBillableSeconds: number
  totalSeconds: number
  /** Rounded percentage of total time that is billable; 0 for an empty week. */
  billablePct: number
}

export function billableSplit(entries: TimesheetEntry[]): BillableSplit {
  let billableSeconds = 0
  let nonBillableSeconds = 0
  for (const entry of entries) {
    if (entry.isBillable) billableSeconds += entry.durationSeconds
    else nonBillableSeconds += entry.durationSeconds
  }
  const totalSeconds = billableSeconds + nonBillableSeconds
  return {
    billableSeconds,
    nonBillableSeconds,
    totalSeconds,
    billablePct: totalSeconds === 0 ? 0 : Math.round((billableSeconds / totalSeconds) * 100),
  }
}

/** Seconds per project, largest first; entries without a project bucket as "No project". */
export function projectTotals(entries: TimesheetEntry[]): ProjectHours[] {
  const totals = new Map<string, number>()
  for (const entry of entries) {
    const name = entry.projectName ?? NO_PROJECT_LABEL
    totals.set(name, (totals.get(name) ?? 0) + entry.durationSeconds)
  }
  return [...totals.entries()]
    .map(([name, seconds]) => ({ name, seconds }))
    .sort((a, b) => b.seconds - a.seconds)
}
