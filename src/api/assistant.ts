import { streamAssistantChat } from '../lib/sseClient'
import { toDateInputValue } from '../lib/manualEntry'
import type {
  AssistantEvent,
  AssistantMessage,
  AssistantMode,
  MessageMention,
  ProjectDraft,
  TimeEntryDraft,
} from '../types/assistant'

export interface SendAssistantMessageParams {
  conversationId: string | null
  message: string
  history: AssistantMessage[]
  mode?: AssistantMode
  currentDraft?: ProjectDraft | null
  currentTimeEntryDraft?: TimeEntryDraft | null
  mentions?: MessageMention[]
  onEvent: (event: AssistantEvent) => void
  onError?: (error: Error) => void
}

/** Local wall-clock yyyy-MM-ddTHH:mm — no Z/offset (matches draft string rule). */
function toLocalDateTimeValue(date: Date): string {
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${toDateInputValue(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function sendAssistantMessage({
  conversationId,
  message,
  history,
  mode = 'project',
  currentDraft,
  currentTimeEntryDraft,
  mentions,
  onEvent,
  onError,
}: SendAssistantMessageParams) {
  // Computed at send time (not module load) so a session open across
  // midnight doesn't resolve "today" against a stale date/timezone.
  const now = new Date()

  return streamAssistantChat(
    {
      conversationId,
      message,
      history,
      mode,
      currentDraft: currentDraft ?? null,
      currentTimeEntryDraft: currentTimeEntryDraft ?? null,
      referenceDate: toDateInputValue(now),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      referenceDateTime: toLocalDateTimeValue(now),
      mentions: mentions && mentions.length > 0 ? mentions : null,
    },
    (sseEvent) => {
      try {
        const parsed = JSON.parse(sseEvent.data)
        const event: AssistantEvent = { type: sseEvent.event, ...parsed } as AssistantEvent
        onEvent(event)
      } catch {
        // Malformed data — skip.
      }
    },
    onError,
  )
}
