import type { BillingType, Project, ProjectStatus } from '../types/project'
import { apiClient } from './client'

/**
 * Projects API (ProjectsController, RT-37/RT-38). Reads are member-accessible;
 * mutations are admin-only.
 */

export type ProjectStatusFilter = 'active' | 'archived' | 'all'

/** Mirrors backend ProjectResponse. */
interface ProjectResponse {
  id: string
  name: string
  clientId: string
  clientName: string
  status: ProjectStatus
  billingType: BillingType
  currencyCode: string
  hourlyRate: number | null
  fixedFeeAmount: number | null
  budgetAmount: number | null
  timeEstimateHours: number | null
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
    billingType: response.billingType,
    currencyCode: response.currencyCode,
    hourlyRate: response.hourlyRate,
    fixedFeeAmount: response.fixedFeeAmount,
    budgetAmount: response.budgetAmount,
    timeEstimateHours: response.timeEstimateHours,
    color: response.color,
    taskCount: response.taskCount,
    createdAtUtc: response.createdAtUtc,
  }
}

export function listProjects(
  status: ProjectStatusFilter = 'active',
  clientId?: string,
): Promise<Project[]> {
  const params = new URLSearchParams({ status })
  if (clientId) params.set('clientId', clientId)
  return apiClient
    .get<ProjectResponse[]>(`/projects?${params.toString()}`)
    .then((projects) => projects.map(toProject))
}

export function getProject(projectId: string): Promise<Project> {
  return apiClient.get<ProjectResponse>(`/projects/${projectId}`).then(toProject)
}

/**
 * Fields the create/edit form sends. The billing block (currencyCode, hourlyRate,
 * fixedFeeAmount, budgetAmount, timeEstimateHours, color) is applied wholesale
 * whenever billingType is present, so the form always sends the full block.
 */
export interface ProjectInput {
  name: string
  clientId: string
  billingType: BillingType
  currencyCode: string
  hourlyRate: number | null
  fixedFeeAmount: number | null
  budgetAmount: number | null
  timeEstimateHours: number | null
  color: string | null
}

export function createProject(input: ProjectInput): Promise<Project> {
  return apiClient.post<ProjectResponse>('/projects', input).then(toProject)
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
