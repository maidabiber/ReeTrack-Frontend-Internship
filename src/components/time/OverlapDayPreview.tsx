import { useMemo, useState } from 'react'
import type { OverlapEntry } from '../../api/timeEntries'
import type { TimeEntry } from '../../types/timeEntry'
import type { CalendarEvent } from '../calendar/types'
import { TimeGrid } from '../calendar/TimeGrid'
import { startOfDay } from '../calendar/dateUtils'
import { mapTimeEntryToCalendarEvent } from '../calendar/mapCalendarView'
import { DEFAULT_HOUR_HEIGHT } from '../calendar/hourZoom'

function overlapEntryToTimeEntry(item: OverlapEntry): TimeEntry {
  const end = item.endedAtUtc ? new Date(item.endedAtUtc) : new Date()
  const start = new Date(item.startedAtUtc)
  return {
    id: item.id,
    description: item.description,
    isBillable: true,
    mode: 'Manual',
    startedAtUtc: item.startedAtUtc,
    endedAtUtc: item.endedAtUtc,
    durationSeconds: Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000)),
    isRunning: false,
    status: 'Confirmed',
    submittedByUserId: null,
    submittedByDisplayName: null,
    assigneeUserId: null,
    assigneeDisplayName: null,
    shareGroupId: null,
    participants: [],
    projectId: null,
    projectName: null,
    projectColor: null,
    projectTaskId: null,
    projectTaskName: null,
    tags: [],
  }
}

export function OverlapDayPreview({
  stoppedEntry,
  overlappingEntries,
  dayEntries,
  onEventMove,
}: {
  stoppedEntry: TimeEntry
  overlappingEntries: OverlapEntry[]
  dayEntries: TimeEntry[]
  onEventMove?: (event: CalendarEvent, newStart: Date, newEnd: Date) => void
}) {
  const [hourHeight, setHourHeight] = useState(DEFAULT_HOUR_HEIGHT)

  const day = useMemo(() => {
    const anchor = stoppedEntry.startedAtUtc
      ? new Date(stoppedEntry.startedAtUtc)
      : new Date()
    return startOfDay(anchor)
  }, [stoppedEntry.startedAtUtc])

  const stoppedEventId = `te-${stoppedEntry.id}`

  const events = useMemo(() => {
    const byId = new Map<string, TimeEntry>()
    byId.set(stoppedEntry.id, stoppedEntry)
    for (const entry of dayEntries) {
      if (!byId.has(entry.id)) byId.set(entry.id, entry)
    }
    for (const overlap of overlappingEntries) {
      if (!byId.has(overlap.id)) byId.set(overlap.id, overlapEntryToTimeEntry(overlap))
    }

    return [...byId.values()]
      .map(mapTimeEntryToCalendarEvent)
      .filter((event): event is CalendarEvent => event !== null)
  }, [dayEntries, overlappingEntries, stoppedEntry])

  const initialScrollHour = useMemo(() => {
    if (!stoppedEntry.startedAtUtc) return 8
    const start = new Date(stoppedEntry.startedAtUtc)
    return Math.max(0, start.getHours() - 1)
  }, [stoppedEntry.startedAtUtc])

  return (
    <div className="flex h-[300px] flex-col overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-sm">
      <TimeGrid
        days={[day]}
        events={events}
        hourHeight={hourHeight}
        onHourHeightChange={setHourHeight}
        selectedEventId={stoppedEventId}
        initialScrollHour={initialScrollHour}
        showDayHeader={false}
        isEventEditable={(event) => event.id === stoppedEventId}
        onEventMove={onEventMove}
      />
    </div>
  )
}
