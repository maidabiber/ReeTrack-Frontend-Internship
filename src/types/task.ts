/**
 * A project task (RT-42/RT-43). Mirrors the backend TaskResponse. Tasks belong
 * to a project, can be assigned to a member and carry an optional time estimate.
 */
export type TaskStatus = 'open' | 'done'

export interface Task {
  id: string
  projectId: string
  clientId: string
  name: string
  status: TaskStatus
  projectName?: string | null
  projectColor?: string | null
  clientName?: string | null
  /** Member the task is assigned to, or null when unassigned. */
  assignedToUserId: string | null
  assignedToName: string | null
  timeEstimateHours: number | null
  createdAtUtc: string
}
