/**
 * A billable project (RT-37/RT-38). Mirrors the backend ProjectResponse.
 * Projects are grouped under a client and hold tasks and tracked time.
 */
export type ProjectStatus = 'active' | 'archived'

/** How the project is billed. Fixed-fee projects use fixedFeeAmount; hourly ones use hourlyRate. */
export type BillingType = 'hourly' | 'fixedFee'

export interface Project {
  id: string
  name: string
  clientId: string
  clientName: string
  status: ProjectStatus
  billingType: BillingType
  currencyCode: string
  /** Set when billingType is 'hourly'. */
  hourlyRate: number | null
  /** Set when billingType is 'fixedFee'. */
  fixedFeeAmount: number | null
  budgetAmount: number | null
  timeEstimateHours: number | null
  /** Hex colour (e.g. '#4366E2') or null for no colour. */
  color: string | null
  /** Number of non-deleted tasks on this project. */
  taskCount: number
  createdAtUtc: string
}
