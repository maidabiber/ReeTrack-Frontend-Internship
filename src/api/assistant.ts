import { streamAssistantChat } from '../lib/sseClient'
import type { AssistantEvent, AssistantMessage, MessageMention, ProjectDraft } from '../types/assistant'

export interface SendAssistantMessageParams {
  conversationId: string | null
  message: string
  history: AssistantMessage[]
  currentDraft?: ProjectDraft | null
  mentions?: MessageMention[]
  onEvent: (event: AssistantEvent) => void
  onError?: (error: Error) => void
}

export function sendAssistantMessage({
  conversationId,
  message,
  history,
  currentDraft,
  mentions,
  onEvent,
  onError,
}: SendAssistantMessageParams) {
  return streamAssistantChat(
    {
      conversationId,
      message,
      history,
      currentDraft: currentDraft ?? null,
      mentions: mentions && mentions.length > 0 ? mentions : null,
    },
    (sseEvent) => {
      try {
        const parsed = JSON.parse(sseEvent.data)
        const event: AssistantEvent = { type: sseEvent.event, ...parsed }
        onEvent(event)
      } catch {
        // Malformed data — skip.
      }
    },
    onError,
  )
}
