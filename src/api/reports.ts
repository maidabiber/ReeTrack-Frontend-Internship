import { downloadBlob } from '../lib/download'
import { toReportSearchParams } from '../lib/reportQuery'
import type {
  DayOfWeekHours,
  MemberHours,
  ProjectSummary,
  ReportKpis,
  SummaryReport,
  TrendPoint,
} from '../types/report'
import type { ReportFilterSet, ReportGroupBy, ReportQuery } from '../types/reportQuery'
import type { PagedResult } from '../types/paged'
import { apiClient, requestBlob, type RequestOptions } from './client'
import { appendListQueryParams, toPagedResult, type ListQueryOptions } from './pagination'

/** Mirrors backend SummaryReportResponse (camelCase JSON). */
interface SummaryReportResponse {
  kpis: ReportKpisResponse
  activity: DayOfWeekHoursResponse[]
  weeklyTrend: TrendPointResponse[]
  projects: ProjectSummaryResponse[]
  members: MemberHoursResponse[]
  generatedAtUtc: string
  firstEntryDate: string | null
  filterFromDate: string | null
  filterToDate: string | null
  generatedByName: string | null
  basis: ReportBasisResponse
}

interface ReportBasisResponse {
  weekendPremium: number
  holidayPremium: number
  overtimePremium: number
  weeklyOvertimeThresholdHours: number
}

interface ReportKpisResponse {
  totalSeconds: number
  billableSeconds: number
  nonBillableSeconds: number
  billablePct: number
  entryCount: number
  activeMembers: number
  activeProjects: number
  overtimeHours: number
  weekendHours: number
  holidayHours: number
  unassignedSeconds: number
}

interface DayOfWeekHoursResponse {
  dayOfWeek: string
  totalSeconds: number
}

interface TrendPointResponse {
  weekStartDate: string
  totalSeconds: number
}

interface ProjectSummaryResponse {
  projectId: string
  name: string
  currencyCode: string
  totalSeconds: number
  calculatedCost: number
  normalCost: number
  weekendCost: number
  holidayCost: number
  overtimeCost: number
  overtimeHours: number
  weekendHours: number
  holidayHours: number
  clientName: string
  status: string
  hourlyRate: number | null
  fixedFeeAmount: number | null
  timeEstimateHours: number | null
  estimateUsedPct: number | null
  fixedFeeMargin: number | null
}

interface MemberHoursResponse {
  userId: string
  displayName: string
  totalSeconds: number
}

interface ReportFilterSetResponse {
  id: string
  name: string
  query: ReportQueryResponse
  schemaVersion: number
  createdAtUtc: string
  updatedAtUtc: string
}

interface ReportQueryResponse {
  userIds: string[]
  projectIds: string[]
  clientIds: string[]
  taskIds: string[]
  tagIds: string[]
  billable: boolean | null
  from: string | null
  to: string | null
  groupBy: string[]
}

export type ReportExportFormat = 'csv' | 'xlsx' | 'pdf'

function toKpis(response: ReportKpisResponse): ReportKpis {
  return {
    totalSeconds: response.totalSeconds,
    billableSeconds: response.billableSeconds,
    nonBillableSeconds: response.nonBillableSeconds,
    billablePct: response.billablePct,
    entryCount: response.entryCount,
    activeMembers: response.activeMembers,
    activeProjects: response.activeProjects,
    overtimeHours: response.overtimeHours,
    weekendHours: response.weekendHours,
    holidayHours: response.holidayHours,
    unassignedSeconds: response.unassignedSeconds,
  }
}

function toActivity(response: DayOfWeekHoursResponse): DayOfWeekHours {
  return {
    dayOfWeek: response.dayOfWeek,
    totalSeconds: response.totalSeconds,
  }
}

function toTrendPoint(response: TrendPointResponse): TrendPoint {
  return {
    weekStartDate: response.weekStartDate,
    totalSeconds: response.totalSeconds,
  }
}

function toProjectSummary(response: ProjectSummaryResponse): ProjectSummary {
  return {
    projectId: response.projectId,
    name: response.name,
    currencyCode: response.currencyCode,
    totalSeconds: response.totalSeconds,
    calculatedCost: response.calculatedCost,
    normalCost: response.normalCost,
    weekendCost: response.weekendCost,
    holidayCost: response.holidayCost,
    overtimeCost: response.overtimeCost,
    overtimeHours: response.overtimeHours,
    weekendHours: response.weekendHours,
    holidayHours: response.holidayHours,
    clientName: response.clientName,
    status: response.status,
    hourlyRate: response.hourlyRate,
    fixedFeeAmount: response.fixedFeeAmount,
    timeEstimateHours: response.timeEstimateHours,
    estimateUsedPct: response.estimateUsedPct,
    fixedFeeMargin: response.fixedFeeMargin,
  }
}

function toMemberHours(response: MemberHoursResponse): MemberHours {
  return {
    userId: response.userId,
    displayName: response.displayName,
    totalSeconds: response.totalSeconds,
  }
}

function toReportQuery(response: ReportQueryResponse): ReportQuery {
  return {
    userIds: response.userIds ?? [],
    projectIds: response.projectIds ?? [],
    clientIds: response.clientIds ?? [],
    taskIds: response.taskIds ?? [],
    tagIds: response.tagIds ?? [],
    billable: response.billable ?? null,
    from: response.from ?? null,
    to: response.to ?? null,
    groupBy: (response.groupBy ?? []).map((value) => value as ReportGroupBy),
  }
}

function toSummaryReport(response: SummaryReportResponse): SummaryReport {
  return {
    kpis: toKpis(response.kpis),
    activity: response.activity.map(toActivity),
    weeklyTrend: response.weeklyTrend.map(toTrendPoint),
    projects: response.projects.map(toProjectSummary),
    members: response.members.map(toMemberHours),
    generatedAtUtc: response.generatedAtUtc,
    firstEntryDate: response.firstEntryDate,
    filterFromDate: response.filterFromDate ?? null,
    filterToDate: response.filterToDate ?? null,
    generatedByName: response.generatedByName,
    basis: {
      weekendPremium: response.basis.weekendPremium,
      holidayPremium: response.basis.holidayPremium,
      overtimePremium: response.basis.overtimePremium,
      weeklyOvertimeThresholdHours: response.basis.weeklyOvertimeThresholdHours,
    },
  }
}

function toFilterSet(response: ReportFilterSetResponse): ReportFilterSet {
  return {
    id: response.id,
    name: response.name,
    query: toReportQuery(response.query),
    schemaVersion: response.schemaVersion,
    createdAtUtc: response.createdAtUtc,
    updatedAtUtc: response.updatedAtUtc,
  }
}

function reportPath(base: string, query: ReportQuery, extra?: Record<string, string>): string {
  const params = toReportSearchParams(query)
  if (extra) {
    for (const [key, value] of Object.entries(extra)) params.set(key, value)
  }
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}

/** Admin portfolio summary — GET /api/reports/summary. */
export function getSummaryReport(
  query: ReportQuery,
  options?: RequestOptions,
): Promise<SummaryReport> {
  return apiClient
    .get<SummaryReportResponse>(reportPath('/reports/summary', query), options)
    .then(toSummaryReport)
}

const EXPORT_FALLBACK_NAME: Record<ReportExportFormat, string> = {
  csv: 'reetrack-summary.csv',
  xlsx: 'reetrack-summary.xlsx',
  pdf: 'reetrack-summary.pdf',
}

/** Downloads the summary report as CSV / Excel / PDF with the same applied filters. */
export async function downloadSummaryReport(
  format: ReportExportFormat,
  query: ReportQuery,
): Promise<void> {
  const { blob, filename } = await requestBlob(
    reportPath('/reports/summary/export', query, { format }),
  )
  downloadBlob(filename ?? EXPORT_FALLBACK_NAME[format], blob)
}

export function listReportFilterSets(
  options: ListQueryOptions = {},
): Promise<PagedResult<ReportFilterSet>> {
  const params = new URLSearchParams()
  appendListQueryParams(params, options)
  const qs = params.toString()
  return apiClient
    .get<PagedResult<ReportFilterSetResponse>>(
      `/reports/filter-sets${qs ? `?${qs}` : ''}`,
    )
    .then((result) => toPagedResult(result, toFilterSet))
}

export function createReportFilterSet(
  name: string,
  query: ReportQuery,
): Promise<ReportFilterSet> {
  return apiClient
    .post<ReportFilterSetResponse>('/reports/filter-sets', { name, query })
    .then(toFilterSet)
}

export function updateReportFilterSet(
  id: string,
  name: string,
  query: ReportQuery,
): Promise<ReportFilterSet> {
  return apiClient
    .put<ReportFilterSetResponse>(`/reports/filter-sets/${id}`, { name, query })
    .then(toFilterSet)
}

export function deleteReportFilterSet(id: string): Promise<void> {
  return apiClient.delete(`/reports/filter-sets/${id}`).then(() => undefined)
}
