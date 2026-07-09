import type { CalendarView } from '../../api/calendar'
import type { SyncedCalendarEvent } from '../../types/integrations'
import type { TimeEntry } from '../../types/timeEntry'
import { stripHtmlToText } from '../../lib/stripHtml'
import { endOfDay, startOfDay } from './dateUtils'
import type { CalendarEvent, EventColor } from './types'

/** Future: return project-based colors when TimeEntry includes projectId. */
export function timeEntryColor(_entry: TimeEntry): EventColor {
  return 'gray'
}

export function mapTimeEntryToCalendarEvent(entry: TimeEntry): CalendarEvent | null {
  if (!entry.startedAtUtc || entry.mode === 'DurationOnly') return null

  const start = new Date(entry.startedAtUtc)
  const end = entry.isRunning
    ? new Date()
    : entry.endedAtUtc
      ? new Date(entry.endedAtUtc)
      : new Date(start.getTime() + entry.durationSeconds * 1000)

  const title = entry.description?.trim() || 'Time entry'

  return {
    id: `te-${entry.id}`,
    kind: 'timeEntry',
    title,
    // Leave blank for now — do not copy the title into description.
    description: undefined,
    start,
    end,
    color: timeEntryColor(entry),
  }
}

export function mapSyncedEventToCalendarEvent(event: SyncedCalendarEvent): CalendarEvent {
  const startUtc = new Date(event.startAtUtc)
  const endUtc = new Date(event.endAtUtc)

  const start = event.isAllDay ? startOfDay(startUtc) : startUtc
  const end = event.isAllDay ? endOfDay(endUtc) : endUtc

  return {
    id: `cal-${event.id}`,
    kind: 'calendarEvent',
    title: event.title,
    description: event.description ? stripHtmlToText(event.description) || undefined : undefined,
    start,
    end,
    location: event.location ?? undefined,
    htmlLink: event.htmlLink ?? undefined,
    color: 'blue',
  }
}

export function mapCalendarView(view: CalendarView): CalendarEvent[] {
  const timeEntries = view.timeEntries
    .map(mapTimeEntryToCalendarEvent)
    .filter((event): event is CalendarEvent => event !== null)

  const calendarEvents = view.calendarEvents.map(mapSyncedEventToCalendarEvent)

  return [...timeEntries, ...calendarEvents]
}
