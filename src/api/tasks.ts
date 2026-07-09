import type { Task, TaskStatus } from '../types/task'
import { apiClient } from './client'

/**
 * Project tasks API (ProjectTasksController, RT-42/RT-43). Nested under a
 * project: /api/projects/{projectId}/tasks. Reads are member-accessible;
 * mutations are admin-only.
 */

export type TaskStatusFilter = 'open' | 'done' | 'all'

/** Mirrors backend TaskResponse. */
interface TaskResponse {
  id: string
  projectId: string
  name: string
  status: TaskStatus
  assignedToUserId: string | null
  assignedToName: string | null
  timeEstimateHours: number | null
  createdAtUtc: string
}

function toTask(response: TaskResponse): Task {
  return {
    id: response.id,
    projectId: response.projectId,
    name: response.name,
    status: response.status,
    assignedToUserId: response.assignedToUserId,
    assignedToName: response.assignedToName,
    timeEstimateHours: response.timeEstimateHours,
    createdAtUtc: response.createdAtUtc,
  }
}

export function listTasks(
  projectId: string,
  status: TaskStatusFilter = 'open',
): Promise<Task[]> {
  return apiClient
    .get<TaskResponse[]>(`/projects/${projectId}/tasks?status=${status}`)
    .then((tasks) => tasks.map(toTask))
}

export interface TaskInput {
  name: string
  assignedToUserId: string | null
  timeEstimateHours: number | null
}

export function createTask(projectId: string, input: TaskInput): Promise<Task> {
  return apiClient
    .post<TaskResponse>(`/projects/${projectId}/tasks`, input)
    .then(toTask)
}

/**
 * Patch a task. Pass `{ status }` alone to toggle open/done (content kept); pass
 * the full TaskInput (with name present) from the edit form for a content
 * update, where omitted assignee/estimate are cleared.
 */
export function updateTask(
  projectId: string,
  taskId: string,
  patch: Partial<TaskInput> & { status?: TaskStatus },
): Promise<Task> {
  return apiClient
    .patch<TaskResponse>(`/projects/${projectId}/tasks/${taskId}`, patch)
    .then(toTask)
}

export function deleteTask(projectId: string, taskId: string): Promise<void> {
  return apiClient.delete(`/projects/${projectId}/tasks/${taskId}`).then(() => undefined)
}
