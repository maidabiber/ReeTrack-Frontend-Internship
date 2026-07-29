import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Icon } from '../ui/Icon'
import { MetadataBubble } from '../ui/MetadataBubble'
import { formatDurationHms } from '../../lib/formatDuration'
import { formatUtcTimeOfDayLocal } from '../../lib/manualEntry'
import type { TimeEntryTemplate } from '../../types/timeEntryTemplate'

function SlidingMetadataRow({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [overflowPx, setOverflowPx] = useState(0)

  useLayoutEffect(() => {
    const container = containerRef.current
    const content = contentRef.current
    if (!container || !content) return

    const measure = () => {
      setOverflowPx(Math.max(0, content.scrollWidth - container.clientWidth))
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    observer.observe(content)
    return () => observer.disconnect()
  }, [children, title])

  const hasOverflow = overflowPx > 0

  return (
    <div
      ref={containerRef}
      title={title}
      className={`min-w-0 overflow-hidden ${
        hasOverflow
          ? '[mask-image:linear-gradient(to_right,black_72%,transparent)] group-hover:[mask-image:none] group-focus-within:[mask-image:none]'
          : ''
      }`}
    >
      <div
        ref={contentRef}
        className="flex w-max max-w-none items-center gap-1.5 transition-transform duration-[1.4s] ease-in-out group-hover:[transform:translateX(calc(-1*var(--meta-shift,0px)))] group-focus-within:[transform:translateX(calc(-1*var(--meta-shift,0px)))]"
        style={{ '--meta-shift': `${overflowPx}px` } as CSSProperties}
      >
        {children}
      </div>
    </div>
  )
}

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

  const tagTitle = template.tags.map((tag) => tag.name).join(', ')

  return (
    <article
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      className={`group relative flex w-template-card flex-shrink-0 cursor-pointer flex-col gap-2 overflow-hidden rounded-xl border px-3.5 py-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
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
          className="absolute top-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-navy/10 bg-white text-navy/50 opacity-0 shadow-soft transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 hover:border-brand/30 hover:bg-brand-tint hover:text-navy"
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
        <div className="flex min-w-0 flex-col gap-1.5">
          {projectTaskLabel ? (
            <SlidingMetadataRow title={projectTaskLabel}>
              <MetadataBubble label={projectTaskLabel} color={template.projectColor} />
            </SlidingMetadataRow>
          ) : null}
          {template.tags.length > 0 ? (
            <SlidingMetadataRow title={tagTitle}>
              {template.tags.map((tag) => (
                <MetadataBubble key={tag.id} label={tag.name} color={tag.color} />
              ))}
            </SlidingMetadataRow>
          ) : null}
        </div>
      )}

      <div className="mt-auto flex min-w-0 items-center justify-between gap-2 border-t border-navy/[0.06] pt-2">
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
