import { useCallback, useEffect, useRef, useState } from 'react'
import { ChatMessageBubble } from '../components/assistant/ChatMessageBubble'
import { ChatInput } from '../components/assistant/ChatInput'
import { ProjectDraftCard } from '../components/assistant/ProjectDraftCard'
import { TimeEntryDraftCard } from '../components/assistant/TimeEntryDraftCard'
import { CLIENT_MENTIONS, PROJECT_MENTIONS } from '../components/assistant/mentionSources'
import { SegmentedToggle } from '../components/ui/SegmentedToggle'
import { FULL_VIEWPORT_PAGE, PAGE_PAD } from '../components/layout/pageChrome'
import { Icon } from '../components/ui/Icon'
import { sendAssistantMessage } from '../api/assistant'
import { useAuth } from '../hooks/useAuth'
import { formatTimeEntriesCreatedMessage } from '../lib/timeEntryDraftSummary'
import type {
  AssistantMessage,
  AssistantEvent,
  AssistantMode,
  MessageMention,
  ProjectDraft,
  TimeEntryDraft,
  TimeEntryDraftItem,
} from '../types/assistant'
import type { Project } from '../types/project'
import type { TimeEntry } from '../types/timeEntry'

const MODE_OPTIONS: { value: AssistantMode; label: string }[] = [
  { value: 'project', label: 'Projects' },
  { value: 'timeEntry', label: 'Time entries' },
]

const COPY: Record<AssistantMode, {
  subtitle: string
  placeholder: string
  emptyTitle: string
  emptyBody: string
  suggestions: string[]
  draftHeading: string
}> = {
  project: {
    subtitle: 'Describe projects in natural language and let AI draft them for you.',
    placeholder: 'Describe the project you want to create...',
    emptyTitle: 'Create projects with AI',
    emptyBody:
      "Describe the project you need, and I'll draft it for you with tasks and estimates. You can refine everything before creating.",
    suggestions: [
      'Website redesign for Acme Corp',
      'Mobile app MVP, hourly billing at 95/h',
      'Internal tooling project, fixed fee 15k, 4 tasks',
    ],
    draftHeading: 'Project draft',
  },
  timeEntry: {
    subtitle: 'Describe the time you spent working and let AI log it for you.',
    placeholder: 'Log time, e.g. "1 hour every day Monday to Friday on @Website Redesign"...',
    emptyTitle: 'Log time with AI',
    emptyBody:
      "Describe what you worked on and when, and I'll draft one or more time entries. You can refine everything before creating.",
    suggestions: [
      'Yesterday 9:00 to 11:30 on @Website Redesign',
      '2 hours every day this week on @Onboarding',
      '45 minutes today, non-billable',
    ],
    draftHeading: 'Time entry draft',
  },
}

/**
 * AI assistant page: a full-viewport chat surface with a draft rail beside it at `lg+`.
 *
 * The page owns its height (FULL_VIEWPORT_PAGE) rather than scrolling with the document, so
 * the composer stays pinned to the bottom edge and only the transcript scrolls. The rail keeps
 * its space whether or not a draft exists — it used to mount only once the LLM proposed one,
 * which snapped the chat column from full width to half mid-conversation.
 *
 * Below `lg` there's no room for the split, so the draft opens as a bottom sheet over the chat
 * instead — auto-opened when the LLM proposes one, reopenable from the header pill, closable
 * without losing the chat.
 *
 * Two modes share the same chat surface: project creation and time-entry logging. Only
 * Admin/ProjectManager can switch to project mode — Member only ever sees the time-entry
 * assistant (a UX simplification, not a security boundary: project creation is already open
 * to every role).
 */
export default function AssistantPage() {
  const { role } = useAuth()
  const canUseProjectMode = role === 'Admin' || role === 'ProjectManager'

  const [mode, setMode] = useState<AssistantMode>(canUseProjectMode ? 'project' : 'timeEntry')
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentDraft, setCurrentDraft] = useState<ProjectDraft | null>(null)
  const [currentTimeEntryDraft, setCurrentTimeEntryDraft] = useState<TimeEntryDraft | null>(null)
  const [draftKey, setDraftKey] = useState(0)
  const [isDraftSheetOpen, setIsDraftSheetOpen] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const connectionRef = useRef<ReturnType<typeof sendAssistantMessage> | null>(null)
  const currentDraftRef = useRef<ProjectDraft | null>(null)
  const currentTimeEntryDraftRef = useRef<TimeEntryDraft | null>(null)

  const updateDraft = useCallback((draft: ProjectDraft | null) => {
    currentDraftRef.current = draft
    setCurrentDraft(draft)
  }, [])

  const updateTimeEntryDraft = useCallback((draft: TimeEntryDraft | null) => {
    currentTimeEntryDraftRef.current = draft
    setCurrentTimeEntryDraft(draft)
  }, [])

  const hasDraft = mode === 'project' ? currentDraft !== null : currentTimeEntryDraft !== null

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

  const handleModeChange = useCallback(
    (nextMode: AssistantMode) => {
      if (nextMode === mode) return

      connectionRef.current?.close()
      setIsStreaming(false)
      setMode(nextMode)
      setMessages([])
      setConversationId(null)
      setError(null)
      updateDraft(null)
      updateTimeEntryDraft(null)
      setIsDraftSheetOpen(false)
    },
    [mode, updateDraft, updateTimeEntryDraft],
  )

  const handleSend = useCallback(
    (text: string, mentionList: MessageMention[] = []) => {
      if (isStreaming) return

      const userMessage: AssistantMessage = { role: 'user', content: text }
      setMessages((prev) => [...prev, userMessage])
      setError(null)
      setIsStreaming(true)

      let assistantText = ''

      const connection = sendAssistantMessage({
        conversationId,
        message: text,
        history: messages,
        mode,
        currentDraft: mode === 'project' ? currentDraftRef.current : undefined,
        currentTimeEntryDraft: mode === 'timeEntry' ? currentTimeEntryDraftRef.current : undefined,
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

            case 'time_entry_draft':
              setDraftKey((k) => k + 1)
              updateTimeEntryDraft(event.draft)
              setIsDraftSheetOpen(true)
              break

            case 'done':
              setConversationId(event.conversationId)
              setIsStreaming(false)
              if (event.draftCleared) {
                updateDraft(null)
                updateTimeEntryDraft(null)
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
    [isStreaming, messages, conversationId, mode, scrollToBottom, updateDraft, updateTimeEntryDraft],
  )

  const handleCreated = useCallback((project: Project) => {
    updateDraft(null)
    setIsDraftSheetOpen(false)
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: `Project "${project.name}" created successfully with all tasks.` },
    ])
  }, [updateDraft])

  const handleTimeEntriesCreated = useCallback((
    _entries: TimeEntry[],
    draftItems: TimeEntryDraftItem[],
    skippedCount: number,
  ) => {
    // Rows skipped for overlapping stay in the panel for the user to fix, so the draft
    // is only cleared once everything landed.
    if (skippedCount === 0) {
      updateTimeEntryDraft(null)
      setIsDraftSheetOpen(false)
    }
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: formatTimeEntriesCreatedMessage(draftItems, skippedCount),
      },
    ])
  }, [updateTimeEntryDraft])

  const copy = COPY[mode]

  const renderDraftCard = () =>
    mode === 'project' && currentDraft ? (
      <ProjectDraftCard key={draftKey} draft={currentDraft} onChange={updateDraft} onCreated={handleCreated} />
    ) : mode === 'timeEntry' && currentTimeEntryDraft ? (
      <TimeEntryDraftCard
        key={draftKey}
        draft={currentTimeEntryDraft}
        onChange={updateTimeEntryDraft}
        onCreated={handleTimeEntriesCreated}
      />
    ) : null

  return (
    <div
      className={`mx-auto flex w-full max-w-page flex-col overflow-hidden ${FULL_VIEWPORT_PAGE} ${PAGE_PAD}`}
    >
      <div className="mb-4 flex flex-shrink-0 flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-bold text-navy">Assistant</h1>

        <div className="flex flex-shrink-0 items-center gap-3">
          {canUseProjectMode && (
            <SegmentedToggle value={mode} onChange={handleModeChange} options={MODE_OPTIONS} />
          )}

          {hasDraft && (
            <button
              type="button"
              onClick={() => setIsDraftSheetOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-tint px-3.5 py-1.5 font-display text-sm font-semibold text-brand transition-colors hover:bg-brand-tint/70 lg:hidden"
            >
              <Icon name="sparkle" className="h-3.5 w-3.5" />
              View draft
            </button>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl bg-white shadow-card">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex flex-shrink-0 items-center gap-2 border-b border-navy/[0.08] px-5 py-3">
            <Icon name="sparkle" className="h-4 w-4 flex-shrink-0 text-brand" />
            <p className="truncate text-sm text-navy/60">{copy.subtitle}</p>
          </div>

          <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
            {messages.length === 0 && !isStreaming && <EmptyState copy={copy} onSuggestion={handleSend} />}

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

            {error && <div className="rounded-xl bg-red-tint px-4 py-3 text-sm text-red">{error}</div>}
          </div>

          <div className="flex-shrink-0 border-t border-navy/[0.08] px-4 py-3 sm:px-6">
            <ChatInput
              key={mode}
              onSend={handleSend}
              disabled={isStreaming}
              sources={mode === 'project' ? CLIENT_MENTIONS : PROJECT_MENTIONS}
              placeholder={copy.placeholder}
            />
          </div>
        </div>

        {/* Always mounted at lg+ so the chat column keeps its width when a draft arrives. */}
        <div className="hidden min-h-0 w-[24rem] flex-shrink-0 flex-col border-l border-navy/[0.08] bg-surface-muted/30 lg:flex xl:w-[28rem]">
          <div className="flex flex-shrink-0 items-center justify-between border-b border-navy/[0.08] px-5 py-3">
            <span className="font-display text-label font-semibold text-navy">{copy.draftHeading}</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {hasDraft ? (
              renderDraftCard()
            ) : (
              <p className="px-2 pt-6 text-center text-sm leading-relaxed text-navy/40">
                Your draft will appear here once I have enough to propose one.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Mobile draft bottom sheet — the side-by-side split above only has
          room at lg+, so below that the draft floats over the chat instead
          of squeezing it, and can be dismissed without losing the draft. */}
      {hasDraft && (
        <>
          <button
            type="button"
            aria-label="Close draft"
            tabIndex={isDraftSheetOpen ? 0 : -1}
            onClick={() => setIsDraftSheetOpen(false)}
            className={`fixed inset-0 z-40 bg-ink/40 transition-opacity lg:hidden ${
              isDraftSheetOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          />
          <div
            inert={!isDraftSheetOpen ? true : undefined}
            className={`fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col overflow-hidden rounded-t-2xl bg-white shadow-float transition-transform duration-200 ease-out lg:hidden ${
              isDraftSheetOpen ? 'translate-y-0' : 'translate-y-full'
            }`}
          >
            <div className="flex flex-shrink-0 items-center justify-between border-b border-navy/[0.08] px-5 py-3.5">
              <span className="font-display text-md font-semibold text-navy">{copy.draftHeading}</span>
              <button
                type="button"
                onClick={() => setIsDraftSheetOpen(false)}
                aria-label="Close draft"
                className="flex size-8 items-center justify-center rounded-full text-navy/50 transition-colors hover:bg-surface-muted hover:text-navy"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">{renderDraftCard()}</div>
          </div>
        </>
      )}
    </div>
  )
}

function EmptyState({
  copy,
  onSuggestion,
}: {
  copy: (typeof COPY)[AssistantMode]
  onSuggestion: (text: string) => void
}) {
  return (
    // Centred in the (now much taller) transcript column rather than pinned near the top.
    <div className="flex min-h-full flex-col items-center justify-center py-10 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-tint">
        <svg className="h-7 w-7 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
        </svg>
      </div>
      <h3 className="font-display text-md font-semibold text-navy">{copy.emptyTitle}</h3>
      <p className="mt-1 max-w-[320px] text-sm leading-relaxed text-navy/60">{copy.emptyBody}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {copy.suggestions.map((suggestion) => (
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
