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

export type AssistantMode = 'project' | 'timeEntry'

export type AssistantEventType = 'token' | 'draft' | 'time_entry_draft' | 'done' | 'error'

export interface AssistantTokenEvent {
  type: 'token'
  text: string
}

export interface AssistantDraftEvent {
  type: 'draft'
  draft: ProjectDraft
}

export interface AssistantTimeEntryDraftEvent {
  type: 'time_entry_draft'
  draft: TimeEntryDraft
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
  | AssistantTimeEntryDraftEvent
  | AssistantDoneEvent
  | AssistantErrorEvent

export type MentionType = 'client' | 'project' | 'task' | 'tag'

export interface MessageMention {
  type: MentionType
  id: string
  name: string
  /**
   * Owning project, sent for task mentions. Without it the assistant resolves a task with
   * no project, and the draft row can't render the task at all.
   */
  projectId?: string | null
  projectName?: string | null
}

// All date/time fields are local wall-clock strings (yyyy-MM-dd / HH:mm), never
// Date objects — UTC conversion happens exactly once, in toRequest, at create time.
export interface TimeEntryDraftItem {
  entryDate: string
  startTime: string | null
  endTime: string | null
  durationMinutes: number
  description: string | null
  projectId: string | null
  projectName: string | null
  projectTaskId: string | null
  taskName: string | null
  tagIds: string[]
  tagNames: string[]
  isBillable: boolean
}

export interface TimeEntryDraft {
  entries: TimeEntryDraftItem[]
}
