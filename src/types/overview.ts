/** Mirrors backend AdminOverviewResponse (camelCase JSON). */

export type OverviewScope = 'workspace' | 'owned'

export interface AdminOverview {
  generatedAtUtc: string
  scope: OverviewScope
  today: OverviewTodayKpis
  onTheClock: number
  activeTimers: ActiveTimerOverview[]
  idleMembers: IdleMemberOverview[]
  idleCount: number
  topProjects: OverviewProjectHours[]
  digest: OverviewDigest | null
}

export interface OverviewTodayKpis {
  date: string
  totalSeconds: number
  billableSeconds: number
  billablePct: number
  entryCount: number
  membersLogged: number
  unassignedSeconds: number
}

export interface ActiveTimerOverview {
  timeEntryId: string
  userId: string
  displayName: string
  avatarUrl: string | null
  startedAtUtc: string
  description: string | null
  isBillable: boolean
  projectId: string | null
  projectName: string | null
  projectColor: string | null
  projectTaskId: string | null
  projectTaskName: string | null
  isUnassigned: boolean
  isStale: boolean
}

export interface IdleMemberOverview {
  userId: string
  displayName: string
  avatarUrl: string | null
}

export interface OverviewProjectHours {
  projectId: string
  name: string
  totalSeconds: number
}

export interface OverviewDigest {
  activity: OverviewDailySeconds[]
  weeklyTrend: OverviewWeeklyTrend[]
  overtimeSeconds: number
  weekendSeconds: number
  holidaySeconds: number
  projects: OverviewProjectDigest[]
  members: OverviewMemberDigest[]
}

export interface OverviewDailySeconds {
  day: string
  seconds: number
}

export interface OverviewWeeklyTrend {
  week: string
  seconds: number
  status: string
}

export interface OverviewProjectDigest {
  projectId: string
  name: string
  color: string | null
  totalSeconds: number
  billablePct: number
  calculatedCost: number | null
  currency: string | null
  clientName: string | null
  status: string | null
  timeEstimateHours: number | null
}

export interface OverviewMemberDigest {
  userId: string
  displayName: string
  totalSeconds: number
}
