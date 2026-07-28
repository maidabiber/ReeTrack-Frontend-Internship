/** Mirrors backend Jira integration DTOs. */

export interface JiraConnection {
  isConfigured: boolean
  siteUrl: string | null
  email: string | null
}

export interface JiraRemoteProject {
  id: string
  key: string
  name: string
  isIntegrated: boolean
  reeTrackProjectId: string | null
  clientId: string | null
  clientName: string | null
}

export interface IntegrateJiraProjectResult {
  projectId: string
  projectName: string
  tasksImported: number
  message: string
}
