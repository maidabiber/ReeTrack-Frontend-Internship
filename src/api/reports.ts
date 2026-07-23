import type {
  DayOfWeekHours,
  MemberHours,
  ProjectSummary,
  ReportKpis,
  SummaryReport,
  TrendPoint,
} from '../types/report'
import { apiClient } from './client'

/** Mirrors backend SummaryReportResponse (camelCase JSON). */
interface SummaryReportResponse {
  kpis: ReportKpisResponse
  activity: DayOfWeekHoursResponse[]
  weeklyTrend: TrendPointResponse[]
  projects: ProjectSummaryResponse[]
  members: MemberHoursResponse[]
  generatedAtUtc: string
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
  overtimeHours: number
  weekendHours: number
  holidayHours: number
}

interface MemberHoursResponse {
  userId: string
  displayName: string
  totalSeconds: number
}

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
    overtimeHours: response.overtimeHours,
    weekendHours: response.weekendHours,
    holidayHours: response.holidayHours,
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
  }
}

/** Admin portfolio summary — GET /api/reports/summary. */
export function getSummaryReport(): Promise<SummaryReport> {
  return apiClient.get<SummaryReportResponse>('/reports/summary').then(toSummaryReport)
}
