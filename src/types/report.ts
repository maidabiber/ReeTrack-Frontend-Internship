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
  /**
   * Confirmed time not linked to a project. Excluded from `projects` by definition,
   * so project rows only reconcile to `totalSeconds` once this is added back.
   */
  unassignedSeconds: number
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
  normalCost: number
  weekendCost: number
  holidayCost: number
  overtimeCost: number
  overtimeHours: number
  weekendHours: number
  holidayHours: number
  /** Billing / planning context — a project may set neither a rate nor an estimate. */
  clientName: string
  status: string
  hourlyRate: number | null
  fixedFeeAmount: number | null
  timeEstimateHours: number | null
  /**
   * Derived server-side so the page and the exports can't drift apart.
   * `estimateUsedPct` is 0–100+, null when no estimate is set;
   * `fixedFeeMargin` is null for non-fixed-fee projects.
   */
  estimateUsedPct: number | null
  fixedFeeMargin: number | null
}

export interface MemberHours {
  userId: string
  displayName: string
  totalSeconds: number
}

export interface ReportBasis {
  /** Premiums as fractions, e.g. 0.5 = +50%. */
  weekendPremium: number
  holidayPremium: number
  overtimePremium: number
  weeklyOvertimeThresholdHours: number
}

export interface SummaryReport {
  kpis: ReportKpis
  activity: DayOfWeekHours[]
  weeklyTrend: TrendPoint[]
  projects: ProjectSummary[]
  members: MemberHours[]
  generatedAtUtc: string
  /** ISO date of the earliest confirmed entry; null when nothing is logged. */
  firstEntryDate: string | null
  /** Inclusive UTC date filters applied to this report. */
  filterFromDate: string | null
  filterToDate: string | null
  /** Display name of the admin who ran the report; null when unresolvable. */
  generatedByName: string | null
  /** The rules the figures were produced under. */
  basis: ReportBasis
}

/** RT-51 — entry-level audit report. */
export interface DetailedEntry {
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

export interface DetailedGroup {
  label: string
  keys: string[]
  totalSeconds: number
  calculatedCost: number
  entryCount: number
  startIndex: number
  endIndexExclusive: number
}

export interface DetailedReport {
  kpis: ReportKpis
  basis: ReportBasis
  generatedAtUtc: string
  generatedByName: string | null
  firstEntryDate: string | null
  filterFromDate: string | null
  filterToDate: string | null
  entries: DetailedEntry[]
  page: number
  pageSize: number
  totalCount: number
  groups: DetailedGroup[]
}

/** RT-52 — member × client × project hours. */
export interface WorkloadAllocation {
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

export interface WorkloadSchedule {
  label: string
  hours: number
  pctOfTotalHours: number
}

export interface WorkloadReport {
  kpis: ReportKpis
  basis: ReportBasis
  generatedAtUtc: string
  generatedByName: string | null
  firstEntryDate: string | null
  filterFromDate: string | null
  filterToDate: string | null
  allocations: WorkloadAllocation[]
  grandTotalSeconds: number
  grandTotalBillableSeconds: number
  schedule: WorkloadSchedule[]
}

/** RT-53 — revenue / cost / margin. */
export interface CurrencyFinancialKpis {
  currencyCode: string
  revenue: number
  cost: number
  margin: number
  marginPct: number | null
  billableHours: number
  totalSeconds: number
  projectCount: number
}

export interface WeeklyFinancialTrend {
  weekStartDate: string
  currencyCode: string
  revenue: number
  cost: number
  margin: number
}

export interface ProjectProfitability {
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

export interface MemberLabourCost {
  userId: string
  displayName: string
  currencyCode: string
  totalSeconds: number
  labourCost: number
}

export interface ProfitabilityReport {
  kpis: ReportKpis
  basis: ReportBasis
  generatedAtUtc: string
  generatedByName: string | null
  firstEntryDate: string | null
  filterFromDate: string | null
  filterToDate: string | null
  byCurrency: CurrencyFinancialKpis[]
  weeklyTrend: WeeklyFinancialTrend[]
  projects: ProjectProfitability[]
  members: MemberLabourCost[]
  revenueBasisLines: string[]
}
