import type { Project, ProjectStatus } from '../types/project'
import type { PagedResult } from '../types/paged'
import { apiClient } from './client'
import {
  appendListQueryParams,
  type ListQueryOptions,
  toPagedResult,
} from './pagination'

/**
 * Projects API (ProjectsController, RT-37/RT-38). Reads are member-accessible;
 * mutations are member-accessible too, except delete which the backend limits
 * to the project's creator or an admin (403 otherwise).
 */

export type ProjectStatusFilter = 'active' | 'archived' | 'all'

export interface ListProjectsOptions extends ListQueryOptions {
  clientId?: string
  clientIds?: string[]
}

/** Mirrors backend ProjectResponse. */
interface ProjectResponse {
  id: string
  name: string
  clientId: string
  clientName: string
  status: ProjectStatus
  createdByUserId: string
  currencyCode: string
  hourlyRate: number | null
  fixedFeeAmount: number | null
  timeEstimateHours: number | null
  actualHours: number
  color: string | null
  taskCount: number
  createdAtUtc: string
}

function toProject(response: ProjectResponse): Project {
  return {
    id: response.id,
    name: response.name,
    clientId: response.clientId,
    clientName: response.clientName,
    status: response.status,
    createdByUserId: response.createdByUserId,
    currencyCode: response.currencyCode,
    hourlyRate: response.hourlyRate,
    fixedFeeAmount: response.fixedFeeAmount,
    timeEstimateHours: response.timeEstimateHours,
    actualHours: response.actualHours,
    color: response.color,
    taskCount: response.taskCount,
    createdAtUtc: response.createdAtUtc,
  }
}

export function listProjects(
  status: ProjectStatusFilter = 'active',
  options: ListProjectsOptions = {},
): Promise<PagedResult<Project>> {
  const params = new URLSearchParams({ status })
  if (options.clientId) params.set('clientId', options.clientId)
  if (options.clientIds) {
    for (const id of options.clientIds) params.append('clientIds', id)
  }
  appendListQueryParams(params, options)

  return apiClient
    .get<PagedResult<ProjectResponse>>(`/projects?${params.toString()}`)
    .then((result) => toPagedResult(result, toProject))
}

export function getProject(projectId: string): Promise<Project> {
  return apiClient.get<ProjectResponse>(`/projects/${projectId}`).then(toProject)
}

/**
 * Fields the create/edit form sends. The billing block (currencyCode, hourlyRate,
 * fixedFeeAmount, timeEstimateHours, color) is applied wholesale whenever
 * currencyCode is present, so the form always sends the full block.
 */
export interface ProjectInput {
  name: string
  clientId: string
  currencyCode: string
  hourlyRate: number | null
  fixedFeeAmount: number | null
  timeEstimateHours: number | null
  color: string | null
}

export function createProject(input: ProjectInput): Promise<Project> {
  return apiClient.post<ProjectResponse>('/projects', input).then(toProject)
}

export function createProjectWithTasks(
  input: ProjectInput,
  tasks: CreateTaskBatchInput[],
): Promise<Project> {
  return apiClient
    .post<ProjectResponse>('/projects/with-tasks', { ...input, tasks })
    .then(toProject)
}

/**
 * Patch a project. Pass the full ProjectInput (plus optional status) from the
 * edit form; pass only `{ status }` for the archive/restore kebab action.
 */
export function updateProject(
  projectId: string,
  patch: Partial<ProjectInput> & { status?: ProjectStatus },
): Promise<Project> {
  return apiClient.patch<ProjectResponse>(`/projects/${projectId}`, patch).then(toProject)
}

export function deleteProject(projectId: string): Promise<void> {
  return apiClient.delete(`/projects/${projectId}`).then(() => undefined)
}

export interface CreateTaskBatchInput {
  name: string
  timeEstimateHours: number | null
}

export function createTasksBatch(
  projectId: string,
  tasks: CreateTaskBatchInput[],
): Promise<void> {
  return apiClient.post(`/projects/${projectId}/tasks/batch`, { tasks }).then(() => undefined)
}
