import type { ReactNode } from 'react'
import type { CalendarEvent } from './types'
import { formatFullDate, formatTimeRange } from './dateUtils'
import { Icon } from '../ui/Icon'

interface EventDetailPanelProps {
  event: CalendarEvent | null
  selectedDate: Date
}

export function EventDetailPanel({ event, selectedDate }: EventDetailPanelProps) {
  if (!event) {
    return (
      <div className="flex min-h-0 flex-1 flex-col border-t border-navy/8 px-4 py-4">
        <h3 className="mb-2 font-display text-[13px] font-bold text-navy">Event details</h3>
        <div className="flex flex-1 flex-col items-center justify-center rounded-[12px] bg-surface-muted/60 px-4 py-8 text-center">
          <Icon name="calendar" className="mb-2 h-5 w-5 text-navy/25" />
          <p className="text-[12px] leading-relaxed text-navy/45">
            Select an event on {formatFullDate(selectedDate)} to see its details here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-navy/8 px-4 py-4">
      <h3 className="mb-3 font-display text-[13px] font-bold text-navy">Event details</h3>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <h4 className="font-display text-[15px] font-bold leading-snug text-navy">{event.title}</h4>

        <div className="mt-3 space-y-2.5">
          <DetailRow label="When">{formatTimeRange(event.start, event.end)}</DetailRow>
          {event.location && <DetailRow label="Where">{event.location}</DetailRow>}
        </div>

        {event.description && (
          <div className="mt-4">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-navy/40">
              Description
            </p>
            <p className="text-[13px] leading-[1.65] text-navy/70">{event.description}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-navy/40">{label}</p>
      <p className="text-[13px] text-navy/75">{children}</p>
    </div>
  )
}
