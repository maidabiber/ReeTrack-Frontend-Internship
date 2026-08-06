import { useEffect, useRef, useState } from 'react'
import { Icon } from '../ui/Icon'
import { useDebounce } from '../../hooks/useDebounce'
import type { MessageMention } from '../../types/assistant'
import type { MentionSource, MentionSuggestion } from './mentionSources'

interface GroupedSuggestion extends MentionSuggestion {
  type: MessageMention['type']
  glyph: string
  groupLabel: string
}

/**
 * Chat input with auto-growing textarea, send button, and @ mention
 * autocomplete grouped by source. Disabled while the assistant is streaming.
 */
export function ChatInput({
  onSend,
  disabled,
  sources,
  placeholder = 'Type a message...',
}: {
  onSend: (message: string, mentions: MessageMention[]) => void
  disabled: boolean
  sources: MentionSource[]
  placeholder?: string
}) {
  const [value, setValue] = useState('')
  const [mentions, setMentions] = useState<MessageMention[]>([])
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  // Mirrors mentionQuery so syncMentionQuery can tell a real change from a no-op re-parse
  // without reading stale state — see the comment there.
  const mentionQueryRef = useRef<string | null>(null)
  const [suggestions, setSuggestions] = useState<GroupedSuggestion[]>([])
  const [highlightIndex, setHighlightIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const highlightRef = useRef<HTMLLIElement>(null)
  const typedQuery = useDebounce(mentionQuery, 120)
  // A bare "@" opens the list right away with each source's default page — waiting out the
  // debounce for a query that isn't going to change just makes the picker feel sluggish.
  const debouncedQuery = mentionQuery === '' ? '' : typedQuery

  useEffect(() => {
    if (!disabled) {
      requestAnimationFrame(() => textareaRef.current?.focus())
    }
  }, [disabled])

  useEffect(() => {
    if (debouncedQuery === null) {
      return
    }

    let cancelled = false

    Promise.all(
      sources.map((source) =>
        source
          .search(debouncedQuery)
          .then((results) =>
            results.map((result) => ({
              ...result,
              type: source.type,
              glyph: source.glyph,
              groupLabel: source.groupLabel,
            })),
          )
          .catch(() => [] as GroupedSuggestion[]),
      ),
    ).then((grouped) => {
      if (!cancelled) {
        setSuggestions(grouped.flat())
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [debouncedQuery, sources])

  const isMentionActive = mentionQuery !== null
  const selectedKeys = new Set(mentions.map((m) => `${m.type}:${m.id}`))
  // Don't clear suggestions in an effect when the mention closes — just hide them.
  const filteredSuggestions =
    debouncedQuery === null ? [] : suggestions.filter((s) => !selectedKeys.has(`${s.type}:${s.id}`))
  const showSuggestionLoading = loading && debouncedQuery !== null

  useEffect(() => {
    highlightRef.current?.scrollIntoView({ block: 'nearest' })
  }, [highlightIndex])

  /**
   * Re-reads the "@word" under the cursor. Runs on every keystroke, click and caret move, so it
   * must leave the highlight alone unless the query genuinely changed — resetting it
   * unconditionally is what used to undo every arrow-key press on the very next keyup.
   */
  const syncMentionQuery = (text: string, cursorIndex: number) => {
    const beforeCursor = text.slice(0, cursorIndex)
    const match = beforeCursor.match(/(?:^|\s)@([^\s@]*)$/)
    const query = match ? match[1] : null

    if (query === mentionQueryRef.current) return

    mentionQueryRef.current = query
    setMentionQuery(query)
    setHighlightIndex(0)
    setLoading(query !== null)
  }

  const closeMentions = () => {
    mentionQueryRef.current = null
    setMentionQuery(null)
    setHighlightIndex(0)
    setLoading(false)
  }

  const selectMention = (suggestion: GroupedSuggestion) => {
    const textarea = textareaRef.current
    const cursorIndex = textarea?.selectionStart ?? value.length
    const beforeCursor = value.slice(0, cursorIndex)
    const afterCursor = value.slice(cursorIndex)
    const mentionStart = beforeCursor.lastIndexOf('@')

    if (mentionStart < 0) return

    const beforeMention = value.slice(0, mentionStart)
    const nextValue = `${beforeMention}@${suggestion.name} ${afterCursor}`.trim()
    const newCursorPos = mentionStart + suggestion.name.length + 1

    setValue(nextValue)
    setMentions((prev) => [
      ...prev,
      {
        type: suggestion.type,
        id: suggestion.id,
        name: suggestion.name,
        projectId: suggestion.projectId ?? null,
        projectName: suggestion.projectName ?? null,
      },
    ])
    closeMentions()
    setSuggestions([])

    requestAnimationFrame(() => {
      textarea?.focus()
      textarea?.setSelectionRange(newCursorPos, newCursorPos)
    })
  }

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed, mentions)
    setValue('')
    setMentions([])
  }

  /** Keys the picker owns while it's open — they move the highlight, they don't edit the text. */
  const MENTION_NAV_KEYS = ['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape']

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (isMentionActive && filteredSuggestions.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setHighlightIndex((i) => (i + 1) % filteredSuggestions.length)
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setHighlightIndex((i) => (i - 1 + filteredSuggestions.length) % filteredSuggestions.length)
        return
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault()
        selectMention(filteredSuggestions[highlightIndex])
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        closeMentions()
        return
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit()
    }
  }

  /**
   * The caret can move without the text changing (arrow keys, Home/End), so the mention query
   * is re-read on keyup too — but never for the keys the picker itself just handled.
   */
  const handleKeyUp = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isMentionActive && MENTION_NAV_KEYS.includes(event.key)) return

    const target = event.currentTarget
    syncMentionQuery(target.value, target.selectionStart ?? target.value.length)
  }

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = event.target.value
    const cursorIndex = event.target.selectionStart ?? nextValue.length
    setValue(nextValue)
    syncMentionQuery(nextValue, cursorIndex)
  }

  const removeMention = (mention: MessageMention) => {
    setMentions((prev) => prev.filter((m) => !(m.type === mention.type && m.id === mention.id)))
  }

  // Render suggestions grouped by source, in source order, each with a group header.
  const groups = sources
    .map((source) => ({
      label: source.groupLabel,
      items: filteredSuggestions.filter((s) => s.type === source.type),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <div className="relative">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onClick={(event) => {
            const target = event.currentTarget
            syncMentionQuery(target.value, target.selectionStart ?? target.value.length)
          }}
          onKeyUp={handleKeyUp}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          role="combobox"
          aria-expanded={isMentionActive}
          aria-controls="mention-listbox"
          aria-autocomplete="list"
          aria-activedescendant={
            isMentionActive && filteredSuggestions[highlightIndex]
              ? `mention-option-${highlightIndex}`
              : undefined
          }
          className="min-h-[44px] max-h-[120px] flex-1 resize-none rounded-xl border-control border-navy/10 bg-white/70 px-4 py-2.5 text-body text-navy outline-none transition-colors placeholder:text-navy/40 focus:border-brand focus:bg-white"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className="flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-full bg-brand text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Send message"
        >
          <Icon name="resend" className="h-4 w-4" />
        </button>
      </div>

      {isMentionActive && (
        <div
          ref={dropdownRef}
          className="absolute inset-x-0 bottom-full z-50 mb-2 overflow-hidden rounded-xl border border-navy/10 bg-white shadow-dropdown"
        >
          {showSuggestionLoading && filteredSuggestions.length === 0 ? (
            <div className="px-3 py-2.5 text-sm text-navy/45">Searching...</div>
          ) : filteredSuggestions.length > 0 ? (
            <ul id="mention-listbox" className="max-h-[240px] overflow-y-auto py-1" role="listbox">
              {groups.map((group) => (
                <li key={group.label}>
                  <div className="px-3 pt-2 pb-1 font-mono text-[10px] font-medium tracking-[0.12em] text-navy/35">
                    {group.label}
                  </div>
                  <ul>
                    {group.items.map((item) => {
                      const index = filteredSuggestions.indexOf(item)
                      const isHighlighted = index === highlightIndex
                      return (
                        <li
                          key={`${item.type}:${item.id}`}
                          ref={isHighlighted ? highlightRef : undefined}
                        >
                          <button
                            type="button"
                            role="option"
                            id={`mention-option-${index}`}
                            aria-selected={isHighlighted}
                            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                              isHighlighted ? 'bg-surface-muted text-navy' : 'text-navy/80'
                            }`}
                            // Keep the keyboard highlight and the pointer in agreement, so
                            // Enter always commits whatever the user is looking at.
                            onMouseEnter={() => setHighlightIndex(index)}
                            onMouseDown={(event) => {
                              event.preventDefault()
                              selectMention(item)
                            }}
                          >
                            <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-tint text-[11px] text-brand">
                              {item.glyph}
                            </span>
                            <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
                            {item.hint && (
                              <span className="flex-shrink-0 truncate text-xs text-navy/40">{item.hint}</span>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-3 py-2.5 text-sm text-navy/45">No matches.</div>
          )}
        </div>
      )}

      {mentions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pb-1 pt-1.5">
          {mentions.map((mention) => (
            <span
              key={`${mention.type}:${mention.id}`}
              className="inline-flex items-center gap-1 rounded-full bg-brand-tint px-2 py-0.5 text-xs font-medium text-brand"
            >
              @{mention.name}
              <button
                type="button"
                onClick={() => removeMention(mention)}
                disabled={disabled}
                className="ml-0.5 rounded-full p-0.5 text-brand/60 transition-colors hover:bg-brand/10 hover:text-brand disabled:opacity-50"
                aria-label={`Remove ${mention.name}`}
              >
                <span className="block text-xs leading-none">&times;</span>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
