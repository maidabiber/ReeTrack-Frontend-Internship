export type ReportGroupBy =
  | 'user'
  | 'project'
  | 'client'
  | 'task'
  | 'tag'
  | 'billable'
  | 'day'
  | 'week'

export type ReportType = 'summary' | 'detailed' | 'workload' | 'profitability'

export interface ReportQuery {
  userIds: string[]
  projectIds: string[]
  clientIds: string[]
  taskIds: string[]
  tagIds: string[]
  billable: boolean | null
  from: string | null
  to: string | null
  groupBy: ReportGroupBy[]
}

export interface ReportFilterSet {
  id: string
  name: string
  query: ReportQuery
  schemaVersion: number
  createdAtUtc: string
  updatedAtUtc: string
}
