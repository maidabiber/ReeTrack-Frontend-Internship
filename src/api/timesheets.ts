import type {
  AdminTimesheetDetail,
  AdminTimesheetListItem,
  MyWeekTimesheet,
  PagedResult,
  Timesheet,
  TimesheetEntry,
  TimesheetStatus,
  WeekStatus,
  WeekSummary,
} from '../types/timesheet'
import { apiClient } from './client'

interface TimesheetResponse {
  id: string
  userId: string
  weekStartDate: string
  status: string
  submittedAtUtc: string
  reviewedByUserId: string | null
  reviewedByDisplayName: string | null
  reviewedAtUtc: string | null
  reviewComment: string | null
}

interface TimesheetEntryResponse {
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

interface MyWeekTimesheetResponse {
  timesheet: TimesheetResponse | null
  entries: TimesheetEntryResponse[]
  canSubmit: boolean
  blockers: string[]
}

interface WeekSummaryResponse {
  weekStartDate: string
  totalSeconds: number
  billableSeconds: number
  status: string
  timesheetId: string | null
}

interface AdminTimesheetListItemResponse {
  id: string
  userId: string
  userDisplayName: string | null
  userEmail: string
  weekStartDate: string
  status: string
  submittedAtUtc: string
  totalSeconds: number
  entryCount: number
}

interface AdminTimesheetDetailResponse {
  timesheet: TimesheetResponse
  userDisplayName: string | null
  userEmail: string
  entries: TimesheetEntryResponse[]
  totalSeconds: number
  billableSeconds: number
}

interface PagedResponse<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
}

function toTimesheet(response: TimesheetResponse): Timesheet {
  return {
    id: response.id,
    userId: response.userId,
    weekStartDate: response.weekStartDate,
    status: response.status as TimesheetStatus,
    submittedAtUtc: response.submittedAtUtc,
    reviewedByUserId: response.reviewedByUserId,
    reviewedByDisplayName: response.reviewedByDisplayName,
    reviewedAtUtc: response.reviewedAtUtc,
    reviewComment: response.reviewComment,
  }
}

function toTimesheetEntry(response: TimesheetEntryResponse): TimesheetEntry {
  return {
    id: response.id,
    description: response.description,
    isBillable: response.isBillable,
    mode: response.mode,
    startedAtUtc: response.startedAtUtc,
    endedAtUtc: response.endedAtUtc,
    durationSeconds: response.durationSeconds,
    isRunning: response.isRunning,
    status: response.status,
    projectName: response.projectName,
    clientName: response.clientName,
  }
}

function toWeekSummary(response: WeekSummaryResponse): WeekSummary {
  return {
    weekStartDate: response.weekStartDate,
    totalSeconds: response.totalSeconds,
    billableSeconds: response.billableSeconds,
    status: response.status as WeekStatus,
    timesheetId: response.timesheetId,
  }
}

function toAdminListItem(response: AdminTimesheetListItemResponse): AdminTimesheetListItem {
  return {
    id: response.id,
    userId: response.userId,
    userDisplayName: response.userDisplayName,
    userEmail: response.userEmail,
    weekStartDate: response.weekStartDate,
    status: response.status as TimesheetStatus,
    submittedAtUtc: response.submittedAtUtc,
    totalSeconds: response.totalSeconds,
    entryCount: response.entryCount,
  }
}

/** My week: timesheet status (if any), entries, and submit blockers. weekStart is "yyyy-MM-dd" (Monday). */
export function getMyWeekTimesheet(weekStart?: string): Promise<MyWeekTimesheet> {
  const query = weekStart ? `?weekStart=${weekStart}` : ''
  return apiClient
    .get<MyWeekTimesheetResponse>(`/timesheets/my/week${query}`)
    .then((response) => ({
      timesheet: response.timesheet ? toTimesheet(response.timesheet) : null,
      entries: (response.entries ?? []).map(toTimesheetEntry),
      canSubmit: response.canSubmit,
      blockers: response.blockers ?? [],
    }))
}

/** Per-week totals and statuses for the most recent weeks, newest first. */
export function listRecentWeeks(count = 8): Promise<WeekSummary[]> {
  return apiClient
    .get<WeekSummaryResponse[]>(`/timesheets/my/recent?count=${count}`)
    .then((summaries) => summaries.map(toWeekSummary))
}

export function submitTimesheet(weekStart: string): Promise<Timesheet> {
  return apiClient
    .post<TimesheetResponse>('/timesheets/my/submit', { weekStart })
    .then(toTimesheet)
}

export function withdrawTimesheet(id: string): Promise<void> {
  return apiClient.post<null>(`/timesheets/${id}/withdraw`).then(() => undefined)
}

/** Admin review queue; status defaults to Submitted on the server, "all" lists every status. */
export function listTimesheetsForReview(params?: {
  status?: TimesheetStatus | 'all'
  page?: number
  pageSize?: number
}): Promise<PagedResult<AdminTimesheetListItem>> {
  const query = new URLSearchParams()
  if (params?.status) query.set('status', params.status)
  if (params?.page) query.set('page', String(params.page))
  if (params?.pageSize) query.set('pageSize', String(params.pageSize))
  const suffix = query.size > 0 ? `?${query.toString()}` : ''

  return apiClient
    .get<PagedResponse<AdminTimesheetListItemResponse>>(`/timesheets/review${suffix}`)
    .then((result) => ({
      items: (result.items ?? []).map(toAdminListItem),
      totalCount: result.totalCount,
      page: result.page,
      pageSize: result.pageSize,
    }))
}

export function getTimesheetForReview(id: string): Promise<AdminTimesheetDetail> {
  return apiClient
    .get<AdminTimesheetDetailResponse>(`/timesheets/review/${id}`)
    .then((response) => ({
      timesheet: toTimesheet(response.timesheet),
      userDisplayName: response.userDisplayName,
      userEmail: response.userEmail,
      entries: (response.entries ?? []).map(toTimesheetEntry),
      totalSeconds: response.totalSeconds,
      billableSeconds: response.billableSeconds,
    }))
}

export function approveTimesheet(id: string, comment?: string): Promise<Timesheet> {
  return apiClient
    .post<TimesheetResponse>(`/timesheets/review/${id}/approve`, { comment: comment ?? null })
    .then(toTimesheet)
}

export function rejectTimesheet(id: string, comment?: string): Promise<Timesheet> {
  return apiClient
    .post<TimesheetResponse>(`/timesheets/review/${id}/reject`, { comment: comment ?? null })
    .then(toTimesheet)
}
