/** Domain types for the admin portfolio Summary Report (RT-50). */

export interface ReportKpis {
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

export interface DayOfWeekHours {
  dayOfWeek: string
  totalSeconds: number
}

export interface TrendPoint {
  weekStartDate: string
  totalSeconds: number
}

export interface ProjectSummary {
  projectId: string
  name: string
  currencyCode: string
  totalSeconds: number
  calculatedCost: number
  overtimeHours: number
  weekendHours: number
  holidayHours: number
}

export interface MemberHours {
  userId: string
  displayName: string
  totalSeconds: number
}

export interface SummaryReport {
  kpis: ReportKpis
  activity: DayOfWeekHours[]
  weeklyTrend: TrendPoint[]
  projects: ProjectSummary[]
  members: MemberHours[]
  generatedAtUtc: string
}
