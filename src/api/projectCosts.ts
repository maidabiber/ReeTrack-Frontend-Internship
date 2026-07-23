import { ApiError, apiClient } from './client'
import type { ProjectCost, ProjectTaskCost } from '../types/projectCost'

/** Mirrors backend ProjectCostResponse. */
interface ProjectTaskCostResponse {
  projectTaskId: string
  calculatedCost: number
  totalHours: number
  weekendHours: number
  holidayHours: number
  overtimeHours: number
}

interface ProjectCostResponse {
  projectId: string
  calculatedCost: number
  totalHours: number
  weekendHours: number
  holidayHours: number
  overtimeHours: number
  calculatedAtUtc: string
  taskCosts: ProjectTaskCostResponse[]
}

function toTaskCost(response: ProjectTaskCostResponse): ProjectTaskCost {
  return {
    projectTaskId: response.projectTaskId,
    calculatedCost: response.calculatedCost,
    totalHours: response.totalHours,
    weekendHours: response.weekendHours,
    holidayHours: response.holidayHours,
    overtimeHours: response.overtimeHours,
  }
}

function toProjectCost(response: ProjectCostResponse): ProjectCost {
  return {
    projectId: response.projectId,
    calculatedCost: response.calculatedCost,
    totalHours: response.totalHours,
    weekendHours: response.weekendHours,
    holidayHours: response.holidayHours,
    overtimeHours: response.overtimeHours,
    calculatedAtUtc: response.calculatedAtUtc,
    taskCosts: (response.taskCosts ?? []).map(toTaskCost),
  }
}

/** Returns the newest snapshot, or null when none exists yet. */
export async function getLatestProjectCost(projectId: string): Promise<ProjectCost | null> {
  try {
    const response = await apiClient.get<ProjectCostResponse>(`/projects/${projectId}/cost/latest`)
    return toProjectCost(response)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

/** Recalculates project cost and persists a new snapshot. */
export function recalculateProjectCost(projectId: string): Promise<ProjectCost> {
  return apiClient
    .get<ProjectCostResponse>(`/projects/${projectId}/cost`)
    .then(toProjectCost)
}
