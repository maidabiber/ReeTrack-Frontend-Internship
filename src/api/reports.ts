import { downloadBlob } from '../lib/download'
import { toReportSearchParams } from '../lib/reportQuery'
import type {
  DayOfWeekHours,
  DetailedEntry,
  DetailedGroup,
  DetailedReport,
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

interface DetailedReportResponse {
  kpis: ReportKpisResponse
  basis: ReportBasisResponse
  generatedAtUtc: string
  generatedByName: string | null
  firstEntryDate: string | null
  filterFromDate: string | null
  filterToDate: string | null
  entries: DetailedEntryResponse[]
  page: number
  pageSize: number
  totalCount: number
  groups: DetailedGroupResponse[]
}

interface DetailedEntryResponse {
  entryId: string
  entryDate: string
  startedAtUtc: string | null
  endedAtUtc: string | null
  userId: string
  displayName: string
  clientId: string | null
  clientName: string | null
  projectId: string | null
  projectName: string | null
  taskId: string | null
  taskName: string | null
  tags: string[]
  description: string | null
  isBillable: boolean
  durationSeconds: number
  currencyCode: string | null
  calculatedCost: number
  normalCost: number
  weekendCost: number
  holidayCost: number
  overtimeCost: number
  overtimeHours: number
  weekendHours: number
  holidayHours: number
  isWeekend: boolean
  isHoliday: boolean
}

interface DetailedGroupResponse {
  label: string
  keys: string[]
  totalSeconds: number
  calculatedCost: number
  entryCount: number
  startIndex: number
  endIndexExclusive: number
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

function toDetailedEntry(response: DetailedEntryResponse): DetailedEntry {
  return {
    entryId: response.entryId,
    entryDate: response.entryDate,
    startedAtUtc: response.startedAtUtc,
    endedAtUtc: response.endedAtUtc,
    userId: response.userId,
    displayName: response.displayName,
    clientId: response.clientId,
    clientName: response.clientName,
    projectId: response.projectId,
    projectName: response.projectName,
    taskId: response.taskId,
    taskName: response.taskName,
    tags: response.tags ?? [],
    description: response.description,
    isBillable: response.isBillable,
    durationSeconds: response.durationSeconds,
    currencyCode: response.currencyCode,
    calculatedCost: response.calculatedCost,
    normalCost: response.normalCost,
    weekendCost: response.weekendCost,
    holidayCost: response.holidayCost,
    overtimeCost: response.overtimeCost,
    overtimeHours: response.overtimeHours,
    weekendHours: response.weekendHours,
    holidayHours: response.holidayHours,
    isWeekend: response.isWeekend,
    isHoliday: response.isHoliday,
  }
}

function toDetailedGroup(response: DetailedGroupResponse): DetailedGroup {
  return {
    label: response.label,
    keys: response.keys ?? [],
    totalSeconds: response.totalSeconds,
    calculatedCost: response.calculatedCost,
    entryCount: response.entryCount,
    startIndex: response.startIndex,
    endIndexExclusive: response.endIndexExclusive,
  }
}

function toDetailedReport(response: DetailedReportResponse): DetailedReport {
  return {
    kpis: toKpis(response.kpis),
    basis: {
      weekendPremium: response.basis.weekendPremium,
      holidayPremium: response.basis.holidayPremium,
      overtimePremium: response.basis.overtimePremium,
      weeklyOvertimeThresholdHours: response.basis.weeklyOvertimeThresholdHours,
    },
    generatedAtUtc: response.generatedAtUtc,
    generatedByName: response.generatedByName,
    firstEntryDate: response.firstEntryDate,
    filterFromDate: response.filterFromDate ?? null,
    filterToDate: response.filterToDate ?? null,
    entries: (response.entries ?? []).map(toDetailedEntry),
    page: response.page,
    pageSize: response.pageSize,
    totalCount: response.totalCount,
    groups: (response.groups ?? []).map(toDetailedGroup),
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

const DETAILED_EXPORT_FALLBACK: Record<ReportExportFormat, string> = {
  csv: 'reetrack-detailed.csv',
  xlsx: 'reetrack-detailed.xlsx',
  pdf: 'reetrack-detailed.pdf',
}

/** Admin detailed audit report — GET /api/reports/detailed. */
export function getDetailedReport(
  query: ReportQuery,
  options?: RequestOptions & { page?: number; pageSize?: number },
): Promise<DetailedReport> {
  const { page = 1, pageSize = 50, ...request } = options ?? {}
  return apiClient
    .get<DetailedReportResponse>(
      reportPath('/reports/detailed', query, {
        page: String(page),
        pageSize: String(pageSize),
      }),
      request,
    )
    .then(toDetailedReport)
}

/** Downloads the detailed report as CSV / Excel / PDF (full filtered set). */
export async function downloadDetailedReport(
  format: ReportExportFormat,
  query: ReportQuery,
): Promise<void> {
  const { blob, filename } = await requestBlob(
    reportPath('/reports/detailed/export', query, { format }),
  )
  downloadBlob(filename ?? DETAILED_EXPORT_FALLBACK[format], blob)
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
