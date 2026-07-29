import type { Task, TaskStatus } from '../types/task'
import type { PagedResult } from '../types/paged'
import { apiClient } from './client'
import {
  appendListQueryParams,
  type ListQueryOptions,
  toPagedResult,
} from './pagination'

/**
 * Project tasks API (ProjectTasksController, RT-42/RT-43). Nested under a
 * project: /api/projects/{projectId}/tasks. Cross-project open-task listing
 * for the timer picker: GET /api/tasks.
 */

export type TaskStatusFilter = 'open' | 'done' | 'all'

export type ListTasksOptions = ListQueryOptions & {
  projectIds?: string[]
}

/** Mirrors backend TaskResponse. */
interface TaskResponse {
  id: string
  projectId: string
  clientId: string
  name: string
  status: TaskStatus
  projectName?: string | null
  projectColor?: string | null
  clientName?: string | null
  assignedToUserId: string | null
  assignedToName: string | null
  timeEstimateHours: number | null
  createdAtUtc: string
}

function toTask(response: TaskResponse): Task {
  return {
    id: response.id,
    projectId: response.projectId,
    clientId: response.clientId,
    name: response.name,
    status: response.status,
    projectName: response.projectName ?? null,
    projectColor: response.projectColor ?? null,
    clientName: response.clientName ?? null,
    assignedToUserId: response.assignedToUserId,
    assignedToName: response.assignedToName,
    timeEstimateHours: response.timeEstimateHours,
    createdAtUtc: response.createdAtUtc,
  }
}

export function listTasks(
  projectId: string,
  status: TaskStatusFilter = 'open',
  options: ListTasksOptions = {},
): Promise<PagedResult<Task>> {
  const params = new URLSearchParams({ status })
  appendListQueryParams(params, options)

  return apiClient
    .get<PagedResult<TaskResponse>>(`/projects/${projectId}/tasks?${params.toString()}`)
    .then((result) => toPagedResult(result, toTask))
}

/**
 * Tasks across all projects (timer + report pickers).
 * Default `open` keeps the timer picker excluding completed work.
 * Reports use `status=all` so historical completed tasks remain filterable.
 */
export function listTasksAcrossProjects(
  status: TaskStatusFilter = 'open',
  options: ListTasksOptions = {},
): Promise<PagedResult<Task>> {
  const params = new URLSearchParams({ status })
  if (options.projectIds) {
    for (const id of options.projectIds) params.append('projectIds', id)
  }
  appendListQueryParams(params, options)
  const qs = params.toString()

  return apiClient
    .get<PagedResult<TaskResponse>>(`/tasks?${qs}`)
    .then((result) => toPagedResult(result, toTask))
}

/** Open tasks across all projects — timer picker convenience wrapper. */
export function listOpenTasks(options: ListTasksOptions = {}): Promise<PagedResult<Task>> {
  return listTasksAcrossProjects('open', options)
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
