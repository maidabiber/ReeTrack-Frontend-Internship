export interface ProjectTaskDraft {
  name: string
  timeEstimateHours: number | null
}

export interface ProjectDraft {
  name: string
  clientId: string | null
  clientName: string | null
  currencyCode: string
  hourlyRate: number | null
  fixedFeeAmount: number | null
  timeEstimateHours: number | null
  color: string | null
  tasks: ProjectTaskDraft[]
}

export interface AssistantMessage {
  role: 'user' | 'assistant'
  content: string
}

export type AssistantEventType = 'token' | 'draft' | 'done' | 'error'

export interface AssistantTokenEvent {
  type: 'token'
  text: string
}

export interface AssistantDraftEvent {
  type: 'draft'
  draft: ProjectDraft
}

export interface AssistantDoneEvent {
  type: 'done'
  conversationId: string
  draftCleared?: boolean
}

export interface AssistantErrorEvent {
  type: 'error'
  message: string
}

export type AssistantEvent =
  | AssistantTokenEvent
  | AssistantDraftEvent
  | AssistantDoneEvent
  | AssistantErrorEvent

export interface MessageMention {
  type: string
  id: string
  name: string
}
