import { useEffect, useRef, useState } from 'react'
import { Icon } from '../ui/Icon'
import { searchClients, type ClientLookup } from '../../api/clients'
import { useDebounce } from '../../hooks/useDebounce'
import type { MessageMention } from '../../types/assistant'

/**
 * Chat input with auto-growing textarea, send button, and @client mention
 * autocomplete. Disabled while the assistant is streaming.
 */
export function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (message: string, mentions: MessageMention[]) => void
  disabled: boolean
}) {
  const [value, setValue] = useState('')
  const [mentions, setMentions] = useState<MessageMention[]>([])
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<ClientLookup[]>([])
  const [highlightIndex, setHighlightIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debouncedQuery = useDebounce(mentionQuery, 200)

  useEffect(() => {
    if (!disabled) {
      requestAnimationFrame(() => textareaRef.current?.focus())
    }
  }, [disabled])

  useEffect(() => {
    if (debouncedQuery === null || debouncedQuery === '') {
      return
    }

    let cancelled = false

    searchClients(debouncedQuery, 8)
      .then((results) => {
        if (!cancelled) {
          setSuggestions(results)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSuggestions([])
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [debouncedQuery])

  const isMentionActive = mentionQuery !== null
  const selectedIds = new Set(mentions.map((m) => m.id))
  // Don't clear suggestions in an effect when the mention closes — just hide them.
  const filteredSuggestions =
    debouncedQuery === null || debouncedQuery === ''
      ? []
      : suggestions.filter((s) => !selectedIds.has(s.id))
  const showSuggestionLoading = loading && debouncedQuery !== null && debouncedQuery !== ''

  const syncMentionQuery = (text: string, cursorIndex: number) => {
    const beforeCursor = text.slice(0, cursorIndex)
    const match = beforeCursor.match(/(?:^|\s)@([^\s@]*)$/)
    const query = match ? match[1] : null
    setMentionQuery(query)
    setHighlightIndex(0)
    if (query !== null && query !== '') setLoading(true)
    else setLoading(false)
  }

  const selectClient = (client: ClientLookup) => {
    const textarea = textareaRef.current
    const cursorIndex = textarea?.selectionStart ?? value.length
    const beforeCursor = value.slice(0, cursorIndex)
    const afterCursor = value.slice(cursorIndex)
    const mentionStart = beforeCursor.lastIndexOf('@')

    if (mentionStart < 0) return

    const beforeMention = value.slice(0, mentionStart)
    const nextValue = `${beforeMention}@${client.name} ${afterCursor}`.trim()
    const newCursorPos = mentionStart + client.name.length + 1

    setValue(nextValue)
    setMentions((prev) => [...prev, { type: 'client', id: client.id, name: client.name }])
    setMentionQuery(null)
    setSuggestions([])
    setHighlightIndex(0)

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
      if (event.key === 'Enter') {
        event.preventDefault()
        selectClient(filteredSuggestions[highlightIndex])
        return
      }
      if (event.key === 'Escape') {
        setMentionQuery(null)
        return
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit()
    }
  }

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = event.target.value
    const cursorIndex = event.target.selectionStart ?? nextValue.length
    setValue(nextValue)
    syncMentionQuery(nextValue, cursorIndex)
  }

  const removeMention = (clientId: string) => {
    setMentions((prev) => prev.filter((m) => m.id !== clientId))
  }

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
          onKeyUp={(event) => {
            const target = event.currentTarget
            syncMentionQuery(target.value, target.selectionStart ?? target.value.length)
          }}
          disabled={disabled}
          placeholder="Describe the project you want to create..."
          rows={1}
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
            <div className="px-3 py-2.5 text-sm text-navy/45">Searching clients...</div>
          ) : filteredSuggestions.length > 0 ? (
            <ul className="max-h-[200px] overflow-y-auto py-1" role="listbox">
              {filteredSuggestions.map((client, index) => (
                <li key={client.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === highlightIndex}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                      index === highlightIndex ? 'bg-surface-muted text-navy' : 'text-navy/80'
                    }`}
                    onMouseDown={(event) => {
                      event.preventDefault()
                      selectClient(client)
                    }}
                  >
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-tint text-[10px] font-bold text-brand">
                      {client.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">{client.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-3 py-2.5 text-sm text-navy/45">No matching clients.</div>
          )}
        </div>
      )}

      {mentions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pb-1 pt-1.5">
          {mentions.map((mention) => (
            <span
              key={mention.id}
              className="inline-flex items-center gap-1 rounded-full bg-brand-tint px-2 py-0.5 text-xs font-medium text-brand"
            >
              @{mention.name}
              <button
                type="button"
                onClick={() => removeMention(mention.id)}
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
