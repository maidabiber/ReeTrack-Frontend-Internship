import type { ReactNode } from 'react'
import type { CalendarEvent } from './types'
import { formatFullDate, formatTimeRange } from './dateUtils'
import { Icon } from '../ui/Icon'

interface EventDetailPanelProps {
  event: CalendarEvent | null
  selectedDate: Date
  canEdit?: boolean
  onEdit?: () => void
  onCreateTimeEntry?: () => void
}

export function EventDetailPanel({
  event,
  selectedDate,
  canEdit = false,
  onEdit,
  onCreateTimeEntry,
}: EventDetailPanelProps) {
  if (!event) {
    return (
      <div className="flex min-h-0 flex-1 flex-col border-t border-navy/8 px-4 py-4">
        <h3 className="mb-2 font-display text-md font-bold text-navy">Details</h3>
        <div className="flex flex-1 flex-col items-center justify-center rounded-lg bg-surface-muted/60 px-4 py-8 text-center">
          <Icon name="calendar" className="mb-2 h-5 w-5 text-navy/25" />
          <p className="text-sm leading-relaxed text-navy/45">
            Select an event or time entry on {formatFullDate(selectedDate)} to see its details
            here.
          </p>
        </div>
      </div>
    )
  }

  const isTimeEntry = event.kind === 'timeEntry'
  const panelTitle = isTimeEntry ? 'Time entry' : 'Calendar event'

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-navy/8 px-4 py-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-display text-md font-bold text-navy">{panelTitle}</h3>
        {canEdit && onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full border-control border-navy px-3 py-1 font-display text-sm font-semibold text-navy transition-colors hover:bg-white"
          >
            Edit
          </button>
        ) : null}
        {!isTimeEntry && onCreateTimeEntry ? (
          <button
            type="button"
            onClick={onCreateTimeEntry}
            className="rounded-full border-[1.5px] border-navy px-3 py-1 font-display text-[11.5px] font-semibold text-navy transition-colors hover:bg-white"
          >
            Create time entry
          </button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <h4 className="font-display text-body-lg font-bold leading-snug text-navy">{event.title}</h4>

        <div className="mt-3 space-y-2.5">
          <DetailRow label="When">{formatTimeRange(event.start, event.end)}</DetailRow>
          {!isTimeEntry && event.location && <DetailRow label="Where">{event.location}</DetailRow>}
        </div>

        {isTimeEntry && (
          <div className="mt-4">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-navy/40">
              Description
            </p>
            <p className="text-md leading-[1.65] text-navy/70">
              {event.description?.trim() || 'No description'}
            </p>
          </div>
        )}

        {!isTimeEntry && event.description && (
          <div className="mt-4">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-navy/40">
              Description
            </p>
            <p className="whitespace-pre-wrap text-md leading-[1.65] text-navy/70">
              {event.description}
            </p>
          </div>
        )}

        {!isTimeEntry && event.htmlLink && (
          <a
            href={event.htmlLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex text-md font-semibold text-brand hover:text-brand-deep"
          >
            Open in Google Calendar
          </a>
        )}
      </div>
    </div>
  )
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-navy/40">{label}</p>
      <p className="text-md text-navy/75">{children}</p>
    </div>
  )
}
