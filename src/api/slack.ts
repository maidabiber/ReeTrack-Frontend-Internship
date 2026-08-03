import { apiClient, apiErrorMessage } from './client'

export interface SlackStatus {
  isConfigured: boolean
  isMember: boolean
  inviteUrl: string | null
}

interface SlackStatusResponse {
  isConfigured: boolean
  isMember: boolean
  inviteUrl: string | null
}

export function getSlackStatus(): Promise<SlackStatus> {
  return apiClient.get<SlackStatusResponse>('/integrations/slack/status').then((response) => ({
    isConfigured: response.isConfigured,
    isMember: response.isMember,
    inviteUrl: response.inviteUrl,
  }))
}

export function slackStatusErrorMessage(error: unknown): string {
  return apiErrorMessage(error, 'Could not load Slack status.')
}
