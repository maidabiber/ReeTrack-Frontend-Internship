import { useEffect, useRef, useState } from 'react'
import { listTeammates } from '../../api/teammates'
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
  onMentionChange: (teammate: Teammate | null) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void
}

export function MentionDescriptionField({
  value,
  onChange,
  onMentionChange,
  disabled,
  placeholder,
  className,
  onKeyDown,
}: MentionDescriptionFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [teammates, setTeammates] = useState<Teammate[]>([])
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [selectedMention, setSelectedMention] = useState<Teammate | null>(null)
  const [highlightIndex, setHighlightIndex] = useState(0)

  useEffect(() => {
    listTeammates()
      .then(setTeammates)
      .catch(() => setTeammates([]))
  }, [])

  useEffect(() => {
    onMentionChange(selectedMention)
  }, [onMentionChange, selectedMention])

  const suggestions =
    mentionQuery === null ? [] : filterTeammates(teammates, mentionQuery).slice(0, 6)

  const selectTeammate = (teammate: Teammate) => {
    const input = inputRef.current
    const cursorIndex = input?.selectionStart ?? value.length
    const next = applyMentionSelection(value, cursorIndex, teammate)
    onChange(next.description)
    setSelectedMention(teammate)
    setMentionQuery(null)
    setHighlightIndex(0)
    requestAnimationFrame(() => {
      input?.focus()
      input?.setSelectionRange(next.cursorIndex, next.cursorIndex)
    })
  }

  const handleChange = (nextValue: string) => {
    onChange(nextValue)
    if (selectedMention) {
      const label = `@${teammateLabel(selectedMention)}`
      if (!nextValue.includes(label)) {
        setSelectedMention(null)
      }
    }
  }

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
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

      if (event.key === 'Enter' && mentionQuery !== null) {
        event.preventDefault()
        selectTeammate(suggestions[highlightIndex])
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
    <div className="relative">
      <input
        ref={inputRef}
        className={className}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          const nextValue = event.target.value
          handleChange(nextValue)
          setMentionQuery(findMentionQuery(nextValue, event.target.selectionStart ?? nextValue.length))
          setHighlightIndex(0)
        }}
        onClick={(event) => {
          const target = event.currentTarget
          setMentionQuery(findMentionQuery(target.value, target.selectionStart ?? target.value.length))
        }}
        onKeyUp={(event) => {
          const target = event.currentTarget
          setMentionQuery(findMentionQuery(target.value, target.selectionStart ?? target.value.length))
        }}
        onKeyDown={handleInputKeyDown}
      />

      {suggestions.length > 0 ? (
        <ul
          className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-[12px] border border-navy/10 bg-white py-1 shadow-card"
          role="listbox"
        >
          {suggestions.map((teammate, index) => (
            <li key={teammate.id}>
              <button
                type="button"
                role="option"
                aria-selected={index === highlightIndex}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] ${
                  index === highlightIndex ? 'bg-surface-muted text-navy' : 'text-navy/80'
                }`}
                onMouseDown={(event) => {
                  event.preventDefault()
                  selectTeammate(teammate)
                }}
              >
                <span className="font-medium">{teammateLabel(teammate)}</span>
                <span className="truncate text-[11px] text-navy/45">{teammate.email}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
