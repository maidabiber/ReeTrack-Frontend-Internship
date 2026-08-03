import { useCallback, useEffect, useRef, useState } from 'react'
import { ChatMessageBubble } from '../components/assistant/ChatMessageBubble'
import { ChatInput } from '../components/assistant/ChatInput'
import { ProjectDraftCard } from '../components/assistant/ProjectDraftCard'
import { PAGE_PAD, VIEWPORT_PANEL_HEIGHT } from '../components/layout/pageChrome'
import { Icon } from '../components/ui/Icon'
import { sendAssistantMessage } from '../api/assistant'
import type { AssistantMessage, AssistantEvent, MessageMention, ProjectDraft } from '../types/assistant'
import type { Project } from '../types/project'

/**
 * AI assistant page: chat on the left, draft panel on the right at `md+`.
 * Below `md` there's no room for a side-by-side split, so the draft instead
 * opens as a bottom sheet over the chat — auto-opened when the LLM proposes
 * one, reopenable from the header pill, closable without losing the chat.
 */
export default function AssistantPage() {
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentDraft, setCurrentDraft] = useState<ProjectDraft | null>(null)
  const [draftKey, setDraftKey] = useState(0)
  const [isDraftSheetOpen, setIsDraftSheetOpen] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const connectionRef = useRef<ReturnType<typeof sendAssistantMessage> | null>(null)
  const currentDraftRef = useRef<ProjectDraft | null>(null)

  const updateDraft = useCallback((draft: ProjectDraft | null) => {
    currentDraftRef.current = draft
    setCurrentDraft(draft)
  }, [])

  useEffect(() => {
    if (!isDraftSheetOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsDraftSheetOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [isDraftSheetOpen])

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
              setIsDraftSheetOpen(true)
              break

            case 'done':
              setConversationId(event.conversationId)
              setIsStreaming(false)
              if (event.draftCleared) {
                updateDraft(null)
                setIsDraftSheetOpen(false)
              }
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
    setIsDraftSheetOpen(false)
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: `Project "${project.name}" created successfully with all tasks.` },
    ])
  }, [updateDraft])

  return (
    <div className={`mx-auto flex min-h-0 w-full max-w-page flex-1 flex-col ${PAGE_PAD}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-navy">Assistant</h1>
          <p className="mt-1 text-sm text-navy/60">
            Describe projects in natural language and let AI draft them for you.
          </p>
        </div>

        {currentDraft && (
          <button
            type="button"
            onClick={() => setIsDraftSheetOpen(true)}
            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-brand-tint px-3.5 py-1.5 font-display text-sm font-semibold text-brand transition-colors hover:bg-brand-tint/70 md:hidden"
          >
            <Icon name="sparkle" className="h-3.5 w-3.5" />
            View draft
          </button>
        )}
      </div>

      <div
        className={`flex flex-col overflow-hidden rounded-2xl bg-white shadow-card md:flex-row ${VIEWPORT_PANEL_HEIGHT}`}
      >
        <div className="flex min-h-0 w-full flex-col">
          <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-5">
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
          <div className="hidden min-h-0 w-2/5 flex-col border-l border-navy/[0.08] bg-surface-muted/30 p-5 md:flex">
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

      {/* Mobile draft bottom sheet — the side-by-side split above only has
          room at md+, so below that the draft floats over the chat instead
          of squeezing it, and can be dismissed without losing the draft. */}
      {currentDraft && (
        <>
          <button
            type="button"
            aria-label="Close draft"
            tabIndex={isDraftSheetOpen ? 0 : -1}
            onClick={() => setIsDraftSheetOpen(false)}
            className={`fixed inset-0 z-40 bg-ink/40 transition-opacity md:hidden ${
              isDraftSheetOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          />
          <div
            inert={!isDraftSheetOpen ? true : undefined}
            className={`fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col overflow-hidden rounded-t-2xl bg-white shadow-float transition-transform duration-200 ease-out md:hidden ${
              isDraftSheetOpen ? 'translate-y-0' : 'translate-y-full'
            }`}
          >
            <div className="flex flex-shrink-0 items-center justify-between border-b border-navy/[0.08] px-5 py-3.5">
              <span className="font-display text-md font-semibold text-navy">Project draft</span>
              <button
                type="button"
                onClick={() => setIsDraftSheetOpen(false)}
                aria-label="Close draft"
                className="flex size-8 items-center justify-center rounded-full text-navy/50 transition-colors hover:bg-surface-muted hover:text-navy"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <ProjectDraftCard
                key={draftKey}
                draft={currentDraft}
                onChange={updateDraft}
                onCreated={handleCreated}
              />
            </div>
          </div>
        </>
      )}
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
