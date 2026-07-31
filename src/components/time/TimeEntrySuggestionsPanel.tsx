import { useEffect, useState } from 'react'
import {
  listTimeEntrySuggestions,
  suggestionToTemplateCard,
} from '../../api/timeEntrySuggestions'
import { apiErrorMessage } from '../../api/client'
import type { TimeEntryTemplate } from '../../types/timeEntryTemplate'
import { TimeEntryTemplateCard } from './TimeEntryTemplateCard'

export function TimeEntrySuggestionsPanel({
  selectedTemplateId,
  onSelectSuggestion,
}: {
  selectedTemplateId: string | null
  onSelectSuggestion: (template: TimeEntryTemplate) => void
}) {
  const [cards, setCards] = useState<TimeEntryTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    listTimeEntrySuggestions()
      .then((suggestions) => {
        if (cancelled) return
        setCards(suggestions.map(suggestionToTemplateCard))
        setLoadError(null)
      })
      .catch((error) => {
        if (cancelled) return
        setLoadError(
          apiErrorMessage(error, 'Could not load suggestions.'),
        )
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="timer-panel px-4 pt-3.5 pb-3">
      <p className="mb-3 font-display text-body font-semibold text-navy">Suggestions</p>

      {isLoading ? (
        <p className="py-6 text-center text-body text-navy/45">Loading suggestions…</p>
      ) : loadError ? (
        <p className="py-6 text-center text-body text-navy/45">{loadError}</p>
      ) : cards.length === 0 ? (
        <p className="py-6 text-center text-body text-navy/45">No suggestions yet.</p>
      ) : (
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-navy/15 hover:[&::-webkit-scrollbar-thumb]:bg-navy/25">
          {cards.map((card) => (
            <TimeEntryTemplateCard
              key={card.id}
              template={card}
              isSelected={selectedTemplateId === card.id}
              onSelect={() => onSelectSuggestion(card)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
