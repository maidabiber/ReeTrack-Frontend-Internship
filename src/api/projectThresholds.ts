import { apiClient } from './client'
import type { ProjectThreshold, ProjectThresholdMetricType } from '../types/projectThreshold'

/** Mirrors backend ProjectThresholdResponse. */
interface ProjectThresholdResponse {
  id: string
  projectId: string
  metricType: ProjectThresholdMetricType
  thresholdPercentage: number
  isTriggered: boolean
  createdAtUtc: string
  updatedAtUtc: string
}

function toThreshold(response: ProjectThresholdResponse): ProjectThreshold {
  return {
    id: response.id,
    projectId: response.projectId,
    metricType: response.metricType,
    thresholdPercentage: response.thresholdPercentage,
    isTriggered: response.isTriggered,
    createdAtUtc: response.createdAtUtc,
    updatedAtUtc: response.updatedAtUtc,
  }
}

export function listProjectThresholds(
  projectId: string,
  metricType?: ProjectThresholdMetricType,
): Promise<ProjectThreshold[]> {
  const query = metricType ? `?metricType=${encodeURIComponent(metricType)}` : ''
  return apiClient
    .get<ProjectThresholdResponse[]>(`/projects/${projectId}/thresholds${query}`)
    .then((rows) => (rows ?? []).map(toThreshold))
}

export function createProjectThreshold(
  projectId: string,
  metricType: ProjectThresholdMetricType,
  thresholdPercentage: number,
): Promise<ProjectThreshold> {
  return apiClient
    .post<ProjectThresholdResponse>(`/projects/${projectId}/thresholds`, {
      metricType,
      thresholdPercentage,
    })
    .then(toThreshold)
}

export function updateProjectThreshold(
  projectId: string,
  thresholdId: string,
  thresholdPercentage: number,
): Promise<ProjectThreshold> {
  return apiClient
    .put<ProjectThresholdResponse>(`/projects/${projectId}/thresholds/${thresholdId}`, {
      thresholdPercentage,
    })
    .then(toThreshold)
}

export function deleteProjectThreshold(projectId: string, thresholdId: string): Promise<void> {
  return apiClient.delete(`/projects/${projectId}/thresholds/${thresholdId}`)
}
