import { downloadBlob } from '../lib/download'
import { toReportSearchParams } from '../lib/reportQuery'
import type {
  CurrencyFinancialKpis,
  DayOfWeekHours,
  DetailedEntry,
  DetailedGroup,
  DetailedReport,
  MemberHours,
  MemberLabourCost,
  ProfitabilityReport,
  ProjectProfitability,
  ProjectSummary,
  ReportKpis,
  SummaryReport,
  TrendPoint,
  WeeklyFinancialTrend,
  WorkloadAllocation,
  WorkloadReport,
  WorkloadSchedule,
} from '../types/report'
import type { ReportFilterSet, ReportGroupBy, ReportQuery, ReportType } from '../types/reportQuery'
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

interface WorkloadReportResponse {
  kpis: ReportKpisResponse
  basis: ReportBasisResponse
  generatedAtUtc: string
  generatedByName: string | null
  firstEntryDate: string | null
  filterFromDate: string | null
  filterToDate: string | null
  allocations: WorkloadAllocationResponse[]
  grandTotalSeconds: number
  grandTotalBillableSeconds: number
  schedule: WorkloadScheduleResponse[]
}

interface WorkloadAllocationResponse {
  userId: string
  displayName: string
  clientId: string | null
  clientName: string
  projectId: string | null
  projectName: string
  totalSeconds: number
  billableSeconds: number
  pctOfMemberTotal: number
}

interface WorkloadScheduleResponse {
  label: string
  hours: number
  pctOfTotalHours: number
}

interface ProfitabilityReportResponse {
  kpis: ReportKpisResponse
  basis: ReportBasisResponse
  generatedAtUtc: string
  generatedByName: string | null
  firstEntryDate: string | null
  filterFromDate: string | null
  filterToDate: string | null
  byCurrency: CurrencyFinancialKpisResponse[]
  weeklyTrend: WeeklyFinancialTrendResponse[]
  projects: ProjectProfitabilityResponse[]
  members: MemberLabourCostResponse[]
  revenueBasisLines: string[]
}

interface CurrencyFinancialKpisResponse {
  currencyCode: string
  revenue: number
  cost: number
  margin: number
  marginPct: number | null
  billableHours: number
  totalSeconds: number
  projectCount: number
}

interface WeeklyFinancialTrendResponse {
  weekStartDate: string
  currencyCode: string
  revenue: number
  cost: number
  margin: number
}

interface ProjectProfitabilityResponse {
  projectId: string
  name: string
  currencyCode: string
  clientName: string
  status: string
  billingModel: string
  hourlyRate: number | null
  fixedFeeAmount: number | null
  timeEstimateHours: number | null
  estimateUsedPct: number | null
  totalSeconds: number
  billableSeconds: number
  revenue: number
  calculatedCost: number
  normalCost: number
  weekendCost: number
  holidayCost: number
  overtimeCost: number
  margin: number
  marginPct: number | null
}

interface MemberLabourCostResponse {
  userId: string
  displayName: string
  currencyCode: string
  totalSeconds: number
  labourCost: number
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

function toWorkloadAllocation(response: WorkloadAllocationResponse): WorkloadAllocation {
  return {
    userId: response.userId,
    displayName: response.displayName,
    clientId: response.clientId,
    clientName: response.clientName,
    projectId: response.projectId,
    projectName: response.projectName,
    totalSeconds: response.totalSeconds,
    billableSeconds: response.billableSeconds,
    pctOfMemberTotal: response.pctOfMemberTotal,
  }
}

function toWorkloadSchedule(response: WorkloadScheduleResponse): WorkloadSchedule {
  return {
    label: response.label,
    hours: response.hours,
    pctOfTotalHours: response.pctOfTotalHours,
  }
}

function toWorkloadReport(response: WorkloadReportResponse): WorkloadReport {
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
    allocations: (response.allocations ?? []).map(toWorkloadAllocation),
    grandTotalSeconds: response.grandTotalSeconds,
    grandTotalBillableSeconds: response.grandTotalBillableSeconds,
    schedule: (response.schedule ?? []).map(toWorkloadSchedule),
  }
}

function toCurrencyFinancial(response: CurrencyFinancialKpisResponse): CurrencyFinancialKpis {
  return {
    currencyCode: response.currencyCode,
    revenue: response.revenue,
    cost: response.cost,
    margin: response.margin,
    marginPct: response.marginPct,
    billableHours: response.billableHours,
    totalSeconds: response.totalSeconds,
    projectCount: response.projectCount,
  }
}

function toWeeklyFinancial(response: WeeklyFinancialTrendResponse): WeeklyFinancialTrend {
  return {
    weekStartDate: response.weekStartDate,
    currencyCode: response.currencyCode,
    revenue: response.revenue,
    cost: response.cost,
    margin: response.margin,
  }
}

function toProjectProfitability(response: ProjectProfitabilityResponse): ProjectProfitability {
  return {
    projectId: response.projectId,
    name: response.name,
    currencyCode: response.currencyCode,
    clientName: response.clientName,
    status: response.status,
    billingModel: response.billingModel,
    hourlyRate: response.hourlyRate,
    fixedFeeAmount: response.fixedFeeAmount,
    timeEstimateHours: response.timeEstimateHours,
    estimateUsedPct: response.estimateUsedPct,
    totalSeconds: response.totalSeconds,
    billableSeconds: response.billableSeconds,
    revenue: response.revenue,
    calculatedCost: response.calculatedCost,
    normalCost: response.normalCost,
    weekendCost: response.weekendCost,
    holidayCost: response.holidayCost,
    overtimeCost: response.overtimeCost,
    margin: response.margin,
    marginPct: response.marginPct,
  }
}

function toMemberLabourCost(response: MemberLabourCostResponse): MemberLabourCost {
  return {
    userId: response.userId,
    displayName: response.displayName,
    currencyCode: response.currencyCode,
    totalSeconds: response.totalSeconds,
    labourCost: response.labourCost,
  }
}

function toProfitabilityReport(response: ProfitabilityReportResponse): ProfitabilityReport {
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
    byCurrency: (response.byCurrency ?? []).map(toCurrencyFinancial),
    weeklyTrend: (response.weeklyTrend ?? []).map(toWeeklyFinancial),
    projects: (response.projects ?? []).map(toProjectProfitability),
    members: (response.members ?? []).map(toMemberLabourCost),
    revenueBasisLines: response.revenueBasisLines ?? [],
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

/** Admin workload matrix — GET /api/reports/workload. */
export function getWorkloadReport(
  query: ReportQuery,
  options?: RequestOptions,
): Promise<WorkloadReport> {
  return apiClient
    .get<WorkloadReportResponse>(reportPath('/reports/workload', query), options)
    .then(toWorkloadReport)
}

/** Admin profitability report — GET /api/reports/profitability. */
export function getProfitabilityReport(
  query: ReportQuery,
  options?: RequestOptions,
): Promise<ProfitabilityReport> {
  return apiClient
    .get<ProfitabilityReportResponse>(reportPath('/reports/profitability', query), options)
    .then(toProfitabilityReport)
}

const EXPORT_FALLBACK_NAME: Record<ReportType, Record<ReportExportFormat, string>> = {
  summary: { csv: 'reetrack-summary.csv', xlsx: 'reetrack-summary.xlsx', pdf: 'reetrack-summary.pdf' },
  detailed: { csv: 'reetrack-detailed.csv', xlsx: 'reetrack-detailed.xlsx', pdf: 'reetrack-detailed.pdf' },
  workload: { csv: 'reetrack-workload.csv', xlsx: 'reetrack-workload.xlsx', pdf: 'reetrack-workload.pdf' },
  profitability: {
    csv: 'reetrack-profitability.csv',
    xlsx: 'reetrack-profitability.xlsx',
    pdf: 'reetrack-profitability.pdf',
  },
}

/** Downloads a report export as CSV / Excel / PDF with the same applied filters. */
export async function downloadReport(
  kind: ReportType,
  format: ReportExportFormat,
  query: ReportQuery,
): Promise<void> {
  const { blob, filename } = await requestBlob(
    reportPath(`/reports/${kind}/export`, query, { format }),
  )
  downloadBlob(filename ?? EXPORT_FALLBACK_NAME[kind][format], blob)
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
