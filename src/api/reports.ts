import { downloadBlob } from '../lib/download'
import type {
  DayOfWeekHours,
  MemberHours,
  ProjectSummary,
  ReportKpis,
  SummaryReport,
  TrendPoint,
} from '../types/report'
import { apiClient, requestBlob } from './client'

/** Mirrors backend SummaryReportResponse (camelCase JSON). */
interface SummaryReportResponse {
  kpis: ReportKpisResponse
  activity: DayOfWeekHoursResponse[]
  weeklyTrend: TrendPointResponse[]
  projects: ProjectSummaryResponse[]
  members: MemberHoursResponse[]
  generatedAtUtc: string
  firstEntryDate: string | null
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

function toSummaryReport(response: SummaryReportResponse): SummaryReport {
  return {
    kpis: toKpis(response.kpis),
    activity: response.activity.map(toActivity),
    weeklyTrend: response.weeklyTrend.map(toTrendPoint),
    projects: response.projects.map(toProjectSummary),
    members: response.members.map(toMemberHours),
    generatedAtUtc: response.generatedAtUtc,
    firstEntryDate: response.firstEntryDate,
    generatedByName: response.generatedByName,
    basis: {
      weekendPremium: response.basis.weekendPremium,
      holidayPremium: response.basis.holidayPremium,
      overtimePremium: response.basis.overtimePremium,
      weeklyOvertimeThresholdHours: response.basis.weeklyOvertimeThresholdHours,
    },
  }
}

/** Admin portfolio summary — GET /api/reports/summary. */
export function getSummaryReport(): Promise<SummaryReport> {
  return apiClient.get<SummaryReportResponse>('/reports/summary').then(toSummaryReport)
}

const EXPORT_FALLBACK_NAME: Record<ReportExportFormat, string> = {
  csv: 'reetrack-summary.csv',
  xlsx: 'reetrack-summary.xlsx',
  pdf: 'reetrack-summary.pdf',
}

/** Downloads the summary report as CSV / Excel / PDF. */
export async function downloadSummaryReport(format: ReportExportFormat): Promise<void> {
  const { blob, filename } = await requestBlob(`/reports/summary/export?format=${format}`)
  downloadBlob(filename ?? EXPORT_FALLBACK_NAME[format], blob)
}
