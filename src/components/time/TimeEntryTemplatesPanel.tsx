import { useCallback, useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
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
  const [isDeleting, setIsDeleting] = useState(false)
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

  const handleConfirmDelete = async () => {
    if (!pendingDelete || isDeleting) return

    const templateId = pendingDelete.id
    setActionError(null)
    setIsDeleting(true)
    try {
      await deleteTimeEntryTemplate(templateId)
      setTemplates((current) => current.filter((template) => template.id !== templateId))
      setPendingDelete(null)
    } catch (error) {
      setActionError(
        apiErrorMessage(error, 'Could not remove this favourite.'),
      )
      setPendingDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

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

      {pendingDelete ? (
        <DeleteFavouriteDialog
          template={pendingDelete}
          isDeleting={isDeleting}
          onCancel={() => {
            if (!isDeleting) setPendingDelete(null)
          }}
          onConfirm={() => void handleConfirmDelete()}
        />
      ) : null}
    </div>
  )
}

function DeleteFavouriteDialog({
  template,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  template: TimeEntryTemplate
  isDeleting: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const label = template.description?.trim() || template.projectName || 'this favourite'

  return (
    <Modal title="Remove favourite?" onClose={onCancel}>
      <p className="text-body leading-normal text-navy/70">
        Are you sure you want to delete “{label}”? You can add it again later from a time
        entry.
      </p>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isDeleting}
          className="flex-1 rounded-full border-control border-navy bg-transparent py-2.5 font-display text-body font-semibold text-navy disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isDeleting}
          className="flex-1 rounded-full bg-red py-2.5 font-display text-body font-semibold text-white transition-colors hover:bg-red/90 disabled:opacity-50"
        >
          {isDeleting ? 'Removing…' : 'Remove'}
        </button>
      </div>
    </Modal>
  )
}
