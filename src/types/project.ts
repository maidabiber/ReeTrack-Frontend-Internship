/**
 * A billable project (RT-37/RT-38). Mirrors the backend ProjectResponse.
 * Projects are grouped under a client and hold tasks and tracked time.
 */
export type ProjectStatus = 'active' | 'archived'

export interface Project {
  id: string
  name: string
  clientId: string
  clientName: string
  status: ProjectStatus
  /** Who created the project — only they (or an admin) may delete it. */
  createdByUserId: string
  currencyCode: string
  hourlyRate: number | null
  fixedFeeAmount: number | null
  timeEstimateHours: number | null
  /** Hex colour (e.g. '#4366E2') or null for no colour. */
  color: string | null
  /** Number of non-deleted tasks on this project. */
  taskCount: number
  createdAtUtc: string
}
