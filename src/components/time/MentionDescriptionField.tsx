import { useEffect, useRef, useState } from 'react'
import { listTeammates } from '../../api/teammates'
import { UserAvatar } from '../ui/UserAvatar'
import {
  applyMentionSelection,
  filterTeammates,
  findMentionQuery,
  teammateLabel,
  type Teammate,
} from '../../lib/mention'

interface MentionDescriptionFieldProps {
  value: string
  onChange: (value: string) => void
  selectedTeammates: Teammate[]
  onMentionChange: (teammates: Teammate[]) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void
}

export function MentionDescriptionField({
  value,
  onChange,
  selectedTeammates,
  onMentionChange,
  disabled,
  placeholder,
  className,
  onKeyDown,
}: MentionDescriptionFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [teammates, setTeammates] = useState<Teammate[]>([])
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [highlightIndex, setHighlightIndex] = useState(0)

  useEffect(() => {
    listTeammates()
      .then(setTeammates)
      .catch(() => setTeammates([]))
  }, [])

  const isMentionActive = mentionQuery !== null
  const selectedIds = new Set(selectedTeammates.map((teammate) => teammate.id))
  const suggestions = isMentionActive
    ? filterTeammates(teammates, mentionQuery).filter((teammate) => !selectedIds.has(teammate.id)).slice(0, 6)
    : []

  const syncMentionQuery = (nextValue: string, cursorIndex: number) => {
    setMentionQuery(findMentionQuery(nextValue, cursorIndex))
    setHighlightIndex(0)
  }

  const selectTeammate = (teammate: Teammate) => {
    const input = inputRef.current
    const cursorIndex = input?.selectionStart ?? value.length
    const next = applyMentionSelection(value, cursorIndex)
    onChange(next.description)
    onMentionChange([...selectedTeammates, teammate])
    setMentionQuery(null)
    setHighlightIndex(0)
    requestAnimationFrame(() => {
      input?.focus()
      input?.setSelectionRange(next.cursorIndex, next.cursorIndex)
    })
  }

  const removeTeammate = (teammateId: string) => {
    onMentionChange(selectedTeammates.filter((teammate) => teammate.id !== teammateId))
  }

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (isMentionActive && event.key === 'Enter') {
      event.preventDefault()
      if (suggestions.length > 0) {
        selectTeammate(suggestions[highlightIndex])
      }
      return
    }

    if (suggestions.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setHighlightIndex((current) => (current + 1) % suggestions.length)
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setHighlightIndex((current) => (current - 1 + suggestions.length) % suggestions.length)
        return
      }

      if (event.key === 'Escape') {
        setMentionQuery(null)
        return
      }
    }

    onKeyDown?.(event)
  }

  return (
    <div className="relative z-30">
      <div className="relative">
        <input
          ref={inputRef}
          className={className}
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={(event) => {
            const nextValue = event.target.value
            onChange(nextValue)
            syncMentionQuery(nextValue, event.target.selectionStart ?? nextValue.length)
          }}
          onClick={(event) => {
            const target = event.currentTarget
            syncMentionQuery(target.value, target.selectionStart ?? target.value.length)
          }}
          onKeyUp={(event) => {
            const target = event.currentTarget
            syncMentionQuery(target.value, target.selectionStart ?? target.value.length)
          }}
          onKeyDown={handleInputKeyDown}
        />

        {isMentionActive ? (
          suggestions.length > 0 ? (
            <ul
              className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-navy/10 bg-white py-1 shadow-dropdown"
              role="listbox"
            >
              {suggestions.map((teammate, index) => (
                <li key={teammate.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === highlightIndex}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-md ${
                      index === highlightIndex ? 'bg-surface-muted text-navy' : 'text-navy/80'
                    }`}
                    onMouseDown={(event) => {
                      event.preventDefault()
                      selectTeammate(teammate)
                    }}
                  >
                    <UserAvatar name={teammateLabel(teammate)} size={24} className="block shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{teammateLabel(teammate)}</span>
                      <span className="block truncate text-xs text-navy/45">{teammate.email}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-lg border border-navy/10 bg-white px-3 py-2.5 text-sm text-navy/50 shadow-dropdown">
              {teammates.length === 0 ? 'No teammates available to mention.' : 'No matching teammates.'}
            </div>
          )
        ) : null}
      </div>

      {selectedTeammates.length > 0 ? (
        <div className="flex flex-wrap gap-2 pb-1 pt-2">
          {selectedTeammates.map((teammate) => (
            <div
              key={teammate.id}
              className="inline-flex items-center gap-2 rounded-full bg-surface-muted py-1 pl-1 pr-2.5"
            >
              <UserAvatar name={teammateLabel(teammate)} size={24} className="block" />
              <span className="text-sm font-semibold text-navy">{teammateLabel(teammate)}</span>
              <button
                type="button"
                onClick={() => removeTeammate(teammate.id)}
                disabled={disabled}
                className="rounded-full p-0.5 text-navy/40 transition-colors hover:bg-navy/10 hover:text-navy/70 disabled:opacity-50"
                aria-label={`Remove ${teammateLabel(teammate)}`}
              >
                <span className="block text-md leading-none">&times;</span>
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
