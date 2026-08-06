import { useCallback, useEffect, useState } from 'react'
import { ConfirmDeleteModal } from '../ui/ConfirmDeleteModal'
import {
  deleteTimeEntryTemplate,
  listTimeEntryTemplates,
  TIME_ENTRY_TEMPLATES_CHANGED_EVENT,
} from '../../api/timeEntryTemplates'
import { apiErrorMessage } from '../../api/client'
import type { TimeEntryTemplate } from '../../types/timeEntryTemplate'
import { TimeEntryTemplateCard } from './TimeEntryTemplateCard'

export function TimeEntryTemplatesPanel({
  selectedTemplateId,
  onSelectTemplate,
}: {
  selectedTemplateId: string | null
  onSelectTemplate: (template: TimeEntryTemplate) => void
}) {
  const [templates, setTemplates] = useState<TimeEntryTemplate[]>([])
  const [fetchedKey, setFetchedKey] = useState<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<TimeEntryTemplate | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const isLoading = fetchedKey !== reloadKey

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1)
  }, [])

  useEffect(() => {
    let cancelled = false

    listTimeEntryTemplates()
      .then((result) => {
        if (cancelled) return
        setTemplates(result.items)
        setLoadError(null)
        setFetchedKey(reloadKey)
      })
      .catch((error) => {
        if (cancelled) return
        setLoadError(
          apiErrorMessage(error, 'Could not load favourites.'),
        )
        setFetchedKey(reloadKey)
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  useEffect(() => {
    const onChanged = () => reload()
    window.addEventListener(TIME_ENTRY_TEMPLATES_CHANGED_EVENT, onChanged)
    return () => window.removeEventListener(TIME_ENTRY_TEMPLATES_CHANGED_EVENT, onChanged)
  }, [reload])

  // A "no favourites yet" placeholder card costs a full mobile screen for nothing;
  // only render this panel on small screens once it actually has content to show.
  const hasContent = !isLoading && !loadError && templates.length > 0

  return (
    <div className={`timer-panel px-4 pt-3.5 pb-3 ${hasContent ? '' : 'hidden sm:block'}`} data-tour-target="favourites">
      <p className="mb-3 font-display text-body font-semibold text-navy">Favourites</p>

      {actionError ? (
        <p className="mb-2 text-sm text-navy/55">{actionError}</p>
      ) : null}

      {isLoading ? (
        <p className="py-6 text-center text-body text-navy/45">Loading favourites…</p>
      ) : loadError ? (
        <p className="py-6 text-center text-body text-navy/45">{loadError}</p>
      ) : templates.length === 0 ? (
        <p className="py-6 text-center text-body text-navy/45">
          No favourite templates yet.
        </p>
      ) : (
        <div
          className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-navy/15 hover:[&::-webkit-scrollbar-thumb]:bg-navy/25"
        >
          {templates.map((template) => (
            <TimeEntryTemplateCard
              key={template.id}
              template={template}
              isSelected={selectedTemplateId === template.id}
              onSelect={() => onSelectTemplate(template)}
              onRemove={() => setPendingDelete(template)}
            />
          ))}
        </div>
      )}

      {pendingDelete && (
        <ConfirmDeleteModal
          title="Remove favourite?"
          message={`Are you sure you want to delete \u201c${pendingDelete.description?.trim() || pendingDelete.projectName || 'this favourite'}\u201d?`}
          confirmLabel="Remove"
          confirmingLabel="Removing\u2026"
          onCancel={() => setPendingDelete(null)}
          onConfirm={async () => {
            setActionError(null)
            await deleteTimeEntryTemplate(pendingDelete.id)
            setTemplates((current) => current.filter((t) => t.id !== pendingDelete.id))
            setPendingDelete(null)
          }}
        />
      )}
    </div>
  )
}
