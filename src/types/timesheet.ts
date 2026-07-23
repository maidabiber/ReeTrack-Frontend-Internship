/** Weekly timesheet domain types (RT-71/RT-72), mirroring TimesheetContracts.cs. */

export type TimesheetStatus = 'Submitted' | 'Approved' | 'Rejected'

/** Week status in summaries: "None" when the week has no timesheet row. */
export type WeekStatus = TimesheetStatus | 'None'

export interface Timesheet {
  id: string
  userId: string
  /** UTC Monday of the week, "yyyy-MM-dd". */
  weekStartDate: string
  status: TimesheetStatus
  submittedAtUtc: string
  reviewedByUserId: string | null
  reviewedByDisplayName: string | null
  reviewedAtUtc: string | null
  reviewComment: string | null
}

/**
 * Slim time-entry shape for timesheet views; unlike TimeEntry it carries
 * project/client names (nullable — entries may not be wired to a project yet).
 */
export interface TimesheetEntry {
  id: string
  description: string | null
  isBillable: boolean
  mode: string
  startedAtUtc: string | null
  endedAtUtc: string | null
  durationSeconds: number
  isRunning: boolean
  status: string
  projectName: string | null
  clientName: string | null
}

export interface MyWeekTimesheet {
  /** Null when the week has never been submitted ("draft"). */
  timesheet: Timesheet | null
  entries: TimesheetEntry[]
  canSubmit: boolean
  /** Reasons submit is currently disabled; empty when canSubmit. */
  blockers: string[]
}

export interface WeekSummary {
  weekStartDate: string
  totalSeconds: number
  billableSeconds: number
  status: WeekStatus
  timesheetId: string | null
}

export interface AdminTimesheetListItem {
  id: string
  userId: string
  userDisplayName: string | null
  userEmail: string
  weekStartDate: string
  status: TimesheetStatus
  submittedAtUtc: string
  totalSeconds: number
  entryCount: number
}

export interface AdminTimesheetDetail {
  timesheet: Timesheet
  userDisplayName: string | null
  userEmail: string
  entries: TimesheetEntry[]
  totalSeconds: number
  billableSeconds: number
}

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
}
