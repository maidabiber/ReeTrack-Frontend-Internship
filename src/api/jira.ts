import { apiClient } from './client'
import type {
  IntegrateJiraProjectResult,
  JiraConnection,
  JiraRemoteProject,
} from '../types/jira'

interface JiraConnectionResponse {
  isConfigured: boolean
  siteUrl: string | null
  email: string | null
}

interface JiraRemoteProjectResponse {
  id: string
  key: string
  name: string
  isIntegrated: boolean
  reeTrackProjectId: string | null
  clientId: string | null
  clientName: string | null
}

interface IntegrateResultResponse {
  projectId: string
  projectName: string
  tasksImported: number
  message: string
}

function toConnection(response: JiraConnectionResponse): JiraConnection {
  return {
    isConfigured: response.isConfigured,
    siteUrl: response.siteUrl,
    email: response.email,
  }
}

function toRemoteProject(response: JiraRemoteProjectResponse): JiraRemoteProject {
  return {
    id: response.id,
    key: response.key,
    name: response.name,
    isIntegrated: response.isIntegrated,
    reeTrackProjectId: response.reeTrackProjectId,
    clientId: response.clientId,
    clientName: response.clientName,
  }
}

export function getJiraConnection(): Promise<JiraConnection> {
  return apiClient.get<JiraConnectionResponse>('/integrations/jira').then(toConnection)
}

export function listJiraProjects(): Promise<JiraRemoteProject[]> {
  return apiClient
    .get<JiraRemoteProjectResponse[]>('/integrations/jira/projects')
    .then((projects) => projects.map(toRemoteProject))
}

export function integrateJiraProject(input: {
  jiraProjectId: string
  clientId: string
}): Promise<IntegrateJiraProjectResult> {
  return apiClient.post<IntegrateResultResponse>('/integrations/jira/projects/integrate', {
    jiraProjectId: input.jiraProjectId,
    clientId: input.clientId,
  })
}

export function syncJiraProject(projectId: string): Promise<IntegrateJiraProjectResult> {
  return apiClient.post<IntegrateResultResponse>(`/integrations/jira/projects/${projectId}/sync`)
}
