import type { ReactNode } from 'react'
import { Modal } from '../ui/Modal'
import type { CalendarEvent } from './types'
import { formatFullDate, formatTimeRange } from './dateUtils'

interface CalendarEventModalProps {
  event: CalendarEvent
  onClose: () => void
}

export function CalendarEventModal({ event, onClose }: CalendarEventModalProps) {
  return (
    <Modal title="Calendar event" subtitle={formatFullDate(event.start)} onClose={onClose}>
      <h3 className="font-display text-body-lg font-bold leading-snug text-navy">{event.title}</h3>

      <div className="mt-4 space-y-3">
        <DetailField label="When">{formatTimeRange(event.start, event.end)}</DetailField>
        {event.location ? <DetailField label="Where">{event.location}</DetailField> : null}
        {event.description ? (
          <DetailField label="Description">
            <span className="whitespace-pre-wrap">{event.description}</span>
          </DetailField>
        ) : null}
      </div>

      {event.htmlLink ? (
        <a
          href={event.htmlLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex text-md font-semibold text-brand hover:text-brand-deep"
        >
          Open in Google Calendar
        </a>
      ) : null}

      <button
        type="button"
        onClick={onClose}
        className="mt-6 w-full rounded-full border-control border-navy bg-transparent py-2.5 font-display text-body font-semibold text-navy"
      >
        Close
      </button>
    </Modal>
  )
}

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-navy/40">{label}</p>
      <p className="mt-1 text-md leading-[1.65] text-navy/75">{children}</p>
    </div>
  )
}
