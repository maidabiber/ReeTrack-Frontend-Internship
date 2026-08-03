import { useCallback, useRef, useState } from 'react'
import { ChatMessageBubble } from '../components/assistant/ChatMessageBubble'
import { ChatInput } from '../components/assistant/ChatInput'
import { ProjectDraftCard } from '../components/assistant/ProjectDraftCard'
import { sendAssistantMessage } from '../api/assistant'
import type { AssistantMessage, AssistantEvent, MessageMention, ProjectDraft } from '../types/assistant'
import type { Project } from '../types/project'

/**
 * AI assistant page with split layout: chat on the left, draft panel on the right.
 * The draft panel only appears when the LLM proposes a project draft.
 */
export default function AssistantPage() {
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentDraft, setCurrentDraft] = useState<ProjectDraft | null>(null)
  const [draftKey, setDraftKey] = useState(0)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const connectionRef = useRef<ReturnType<typeof sendAssistantMessage> | null>(null)
  const currentDraftRef = useRef<ProjectDraft | null>(null)

  const updateDraft = useCallback((draft: ProjectDraft | null) => {
    currentDraftRef.current = draft
    setCurrentDraft(draft)
  }, [])

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [])

  const handleSend = useCallback(
    (text: string, mentionList: MessageMention[] = []) => {
      if (isStreaming) return

      const draftToSend = currentDraftRef.current

      const userMessage: AssistantMessage = { role: 'user', content: text }
      setMessages((prev) => [...prev, userMessage])
      setError(null)
      setIsStreaming(true)

      let assistantText = ''

      const connection = sendAssistantMessage({
        conversationId,
        message: text,
        history: messages,
        currentDraft: draftToSend,
        mentions: mentionList.length > 0 ? mentionList : undefined,
        onEvent: (event: AssistantEvent) => {
          switch (event.type) {
            case 'token':
              assistantText += event.text
              setMessages((prev) => {
                const last = prev[prev.length - 1]
                if (last?.role === 'assistant') {
                  return [...prev.slice(0, -1), { ...last, content: assistantText }]
                }
                return [...prev, { role: 'assistant', content: assistantText }]
              })
              scrollToBottom()
              break

            case 'draft':
              setDraftKey((k) => k + 1)
              updateDraft(event.draft)
              break

            case 'done':
              setConversationId(event.conversationId)
              setIsStreaming(false)
              if (event.draftCleared)
                updateDraft(null)
              break

            case 'error':
              setError(event.message)
              setIsStreaming(false)
              break
          }
        },
        onError: (err) => {
          setError(err.message)
          setIsStreaming(false)
        },
      })

      connectionRef.current = connection
    },
    [isStreaming, messages, conversationId, scrollToBottom, updateDraft],
  )

  const handleCreated = useCallback((project: Project) => {
    updateDraft(null)
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: `Project "${project.name}" created successfully with all tasks.` },
    ])
  }, [updateDraft])

  return (
    <div className="flex h-screen min-h-0 flex-1 flex-col overflow-hidden px-10 py-8">
      <div className="mb-4">
        <h1 className="font-display text-xl font-bold text-navy">Assistant</h1>
        <p className="mt-1 text-sm text-navy/60">
          Describe projects in natural language and let AI draft them for you.
        </p>
      </div>

      <div className="flex flex-1 overflow-hidden rounded-2xl bg-white shadow-card">
        <div className={`flex min-h-0 flex-col ${currentDraft ? 'w-3/5' : 'w-full'} transition-all duration-300`}>
          <div className="flex min-h-0 flex-1 flex-col p-5">
            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-1 py-4">
              {messages.length === 0 && !isStreaming && <EmptyState onSuggestion={handleSend} />}

              {messages.map((msg, index) => (
                <ChatMessageBubble key={index} message={msg} />
              ))}

              {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-surface-muted px-4 py-3">
                    <TypingIndicator />
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-red-tint px-4 py-3 text-sm text-red">{error}</div>
              )}
            </div>

            <div className="border-t border-navy/[0.08] pt-3">
              <ChatInput onSend={handleSend} disabled={isStreaming} />
            </div>
          </div>
        </div>

        {currentDraft && (
          <div className="w-2/5 border-l border-navy/[0.08] bg-surface-muted/30 p-5">
            <div className="flex h-full flex-col overflow-y-auto">
              <ProjectDraftCard
                key={draftKey}
                draft={currentDraft}
                onChange={updateDraft}
                onCreated={handleCreated}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-tint">
        <svg className="h-7 w-7 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
        </svg>
      </div>
      <h3 className="font-display text-md font-semibold text-navy">Create projects with AI</h3>
      <p className="mt-1 max-w-[320px] text-sm leading-relaxed text-navy/60">
        Describe the project you need, and I'll draft it for you with tasks and estimates.
        You can refine everything before creating.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {[
          'Website redesign for Acme Corp',
          'Mobile app MVP, hourly billing at 95/h',
          'Internal tooling project, fixed fee 15k, 4 tasks',
        ].map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSuggestion(suggestion)}
            className="rounded-full border-control border-navy/10 bg-white px-3 py-1.5 text-caption text-navy/70 transition-colors hover:border-brand hover:text-brand"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-navy/30 [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-navy/30 [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-navy/30" />
    </div>
  )
}
