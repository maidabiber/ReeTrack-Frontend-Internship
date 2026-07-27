import { Icon } from '../ui/Icon'
import { MetadataBubble } from '../ui/MetadataBubble'
import { formatDurationHms } from '../../lib/formatDuration'
import { formatUtcTimeOfDayLocal } from '../../lib/manualEntry'
import type { TimeEntryTemplate } from '../../types/timeEntryTemplate'

export function TimeEntryTemplateCard({
  template,
  isSelected,
  onSelect,
  onRemove,
}: {
  template: TimeEntryTemplate
  isSelected: boolean
  onSelect: () => void
  onRemove?: () => void
}) {
  const startLabel = formatUtcTimeOfDayLocal(template.startTimeUtc)
  const endLabel = formatUtcTimeOfDayLocal(template.endTimeUtc)
  const timeRange =
    startLabel && endLabel ? `${startLabel} – ${endLabel}` : startLabel ?? null

  const projectTaskLabel = template.projectName
    ? template.taskName
      ? `${template.projectName} · ${template.taskName}`
      : template.projectName
    : null

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
      {onRemove ? (
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
      ) : null}

      <p
        className={`line-clamp-2 min-h-[2.5em] text-caption leading-snug text-navy/80 ${
          onRemove ? 'pr-6' : ''
        }`}
      >
        {template.description?.trim() || 'No description'}
      </p>

      {(projectTaskLabel || template.tags.length > 0) && (
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {projectTaskLabel ? (
            <MetadataBubble label={projectTaskLabel} color={template.projectColor} />
          ) : null}
          {template.tags.map((tag) => (
            <MetadataBubble key={tag.id} label={tag.name} color={tag.color} />
          ))}
        </div>
      )}

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
