import { useCallback, useEffect, useState } from 'react'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'
import { formatDurationHms } from '../../lib/formatDuration'
import { formatUtcTimeOfDayLocal } from '../../lib/manualEntry'
import {
  deleteTimeEntryTemplate,
  listTimeEntryTemplates,
  TIME_ENTRY_TEMPLATES_CHANGED_EVENT,
  timeEntryTemplateApiErrorMessage,
} from '../../api/timeEntryTemplates'
import type { TimeEntryTemplate } from '../../types/timeEntryTemplate'

export function TimeEntryTemplatesPanel({
  selectedTemplateId,
  onSelectTemplate,
}: {
  selectedTemplateId: string | null
  onSelectTemplate: (template: TimeEntryTemplate) => void
}) {
  const [templates, setTemplates] = useState<TimeEntryTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<TimeEntryTemplate | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1)
  }, [])

  useEffect(() => {
    let cancelled = false

    setIsLoading(true)
    listTimeEntryTemplates()
      .then((result) => {
        if (cancelled) return
        setTemplates(result.items)
        setLoadError(null)
      })
      .catch((error) => {
        if (cancelled) return
        setLoadError(
          timeEntryTemplateApiErrorMessage(error, 'Could not load favourites.'),
        )
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
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
        timeEntryTemplateApiErrorMessage(error, 'Could not remove this favourite.'),
      )
      setPendingDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="timer-panel px-4 pt-3.5 pb-3">
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
            <TemplateCard
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

function TemplateCard({
  template,
  isSelected,
  onSelect,
  onRemove,
}: {
  template: TimeEntryTemplate
  isSelected: boolean
  onSelect: () => void
  onRemove: () => void
}) {
  const startLabel = formatUtcTimeOfDayLocal(template.startTimeUtc)
  const endLabel = formatUtcTimeOfDayLocal(template.endTimeUtc)
  const timeRange =
    startLabel && endLabel ? `${startLabel} – ${endLabel}` : startLabel ?? null

  return (
    <article
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      className={`group relative flex w-template-card flex-shrink-0 cursor-pointer flex-col gap-2 rounded-xl border px-3.5 py-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
        isSelected
          ? 'border-brand/45 bg-brand-tint shadow-soft'
          : 'border-navy/[0.06] bg-surface-muted/35 hover:border-brand/25 hover:bg-brand-tint/40'
      }`}
      aria-label={`Use template: ${template.description ?? 'Time entry template'}`}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
    >
      <button
        type="button"
        title="Remove favourite"
        aria-label="Remove favourite"
        onClick={(event) => {
          event.stopPropagation()
          onRemove()
        }}
        className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full border border-navy/10 bg-white text-navy/50 opacity-0 shadow-soft transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 hover:border-brand/30 hover:bg-brand-tint hover:text-navy"
      >
        <Icon name="x" className="size-icon-sm" />
      </button>

      <div className="flex items-start gap-2 pr-6">
        <span
          aria-hidden="true"
          className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-gray"
          style={
            template.projectColor
              ? { backgroundColor: template.projectColor }
              : undefined
          }
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-caption font-semibold text-navy">
            {template.projectName ?? 'No project'}
          </p>
          {template.taskName ? (
            <p className="truncate text-micro text-navy/50">{template.taskName}</p>
          ) : null}
        </div>
      </div>

      <p className="line-clamp-2 min-h-[2.5em] text-caption leading-snug text-navy/80">
        {template.description?.trim() || 'No description'}
      </p>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-navy/[0.06] pt-2">
        <div className="min-w-0">
          <p className="font-mono text-body font-medium tabular-nums text-navy">
            {formatDurationHms(template.durationSeconds)}
          </p>
          {timeRange ? (
            <p className="truncate text-eyebrow text-navy/45">{timeRange}</p>
          ) : null}
        </div>
        {template.isBillable ? (
          <span title="Billable">
            <Icon name="billable" className="size-icon-sm flex-shrink-0 text-navy/40" />
          </span>
        ) : null}
      </div>
    </article>
  )
}
