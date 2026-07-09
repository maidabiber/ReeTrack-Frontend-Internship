import type { CalendarEvent } from './types'
import { eventsForDay, formatTimeRange } from './dateUtils'
import { Icon } from '../ui/Icon'

interface DayCalendarEventsListProps {
  selectedDate: Date
  events: CalendarEvent[]
  selectedEventId: string | null
  onEventSelect: (event: CalendarEvent) => void
}

export function DayCalendarEventsList({
  selectedDate,
  events,
  selectedEventId,
  onEventSelect,
}: DayCalendarEventsListProps) {
  const calendarEvents = eventsForDay(
    events.filter((event) => event.kind === 'calendarEvent'),
    selectedDate,
  ).sort((a, b) => a.start.getTime() - b.start.getTime())

  const selectedEvent =
    calendarEvents.find((event) => event.id === selectedEventId) ?? null

  return (
    <div className="flex h-full min-h-0 flex-col border-t border-navy/8 bg-white/60">
      <div className="px-4 py-3">
        <h3 className="font-display text-[13px] font-bold text-navy">Calendar events</h3>
      </div>

      {selectedEvent ? (
        <div className="border-b border-navy/8 px-4 pb-3">
          <h4 className="font-display text-[14px] font-bold leading-snug text-navy">
            {selectedEvent.title}
          </h4>
          <p className="mt-1 text-[12px] text-navy/60">
            {formatTimeRange(selectedEvent.start, selectedEvent.end)}
          </p>
          {selectedEvent.location ? (
            <p className="mt-1 text-[12px] text-navy/50">{selectedEvent.location}</p>
          ) : null}
          {selectedEvent.description ? (
            <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-[12px] leading-relaxed text-navy/65">
              {selectedEvent.description}
            </p>
          ) : null}
          {selectedEvent.htmlLink ? (
            <a
              href={selectedEvent.htmlLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex text-[12px] font-semibold text-brand hover:text-brand-deep"
            >
              Open in Google Calendar
            </a>
          ) : null}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {calendarEvents.length === 0 ? (
          <p className="px-1 py-2 text-[12px] leading-relaxed text-navy/45">
            No synced calendar events for this day.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {calendarEvents.map((event) => {
              const selected = selectedEventId === event.id

              return (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => onEventSelect(event)}
                    className={`w-full rounded-[10px] border px-3 py-2.5 text-left transition-colors ${
                      selected
                        ? 'border-brand/30 bg-blue-tint ring-1 ring-brand/20'
                        : 'border-navy/8 bg-white hover:bg-surface-muted/80'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Icon name="calendar" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-navy/35" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-[12.5px] font-semibold text-navy">
                          {event.title}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-navy/55">
                          {formatTimeRange(event.start, event.end)}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
