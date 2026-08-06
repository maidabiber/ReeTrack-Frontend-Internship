import type { CalendarEvent } from './types'
import type { ActiveTimer, TimeEntry } from '../../types/timeEntry'
import { getWeekDays } from './dateUtils'
import { TimeGrid } from './TimeGrid'

interface WeekViewProps {
  selectedDate: Date
  events: CalendarEvent[]
  hourHeight: number
  onHourHeightChange: (height: number) => void
  selectedEventId: string | null
  onEventClick: (event: CalendarEvent) => void
  onEventMove?: (event: CalendarEvent, newStart: Date, newEnd: Date) => void
  onEventDuplicate?: (event: CalendarEvent, newStart: Date, newEnd: Date) => void
  onEventCreate?: (start: Date, end: Date) => void
  pendingCreateRange?: { start: Date; end: Date } | null
  isEventEditable?: (event: CalendarEvent) => boolean
  holidaysByDate?: ReadonlyMap<string, string>
  timeEntries?: TimeEntry[]
  activeTimer?: ActiveTimer | null
  activeTimerElapsedSeconds?: number
}

export function WeekView({
  selectedDate,
  events,
  hourHeight,
  onHourHeightChange,
  selectedEventId,
  onEventClick,
  onEventMove,
  onEventDuplicate,
  onEventCreate,
  pendingCreateRange,
  isEventEditable,
  holidaysByDate,
  timeEntries,
  activeTimer,
  activeTimerElapsedSeconds,
}: WeekViewProps) {
  const days = getWeekDays(selectedDate)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TimeGrid
        days={days}
        events={events}
        hourHeight={hourHeight}
        onHourHeightChange={onHourHeightChange}
        selectedEventId={selectedEventId}
        onEventClick={onEventClick}
        onEventMove={onEventMove}
        onEventDuplicate={onEventDuplicate}
        onEventCreate={onEventCreate}
        pendingCreateRange={pendingCreateRange}
        isEventEditable={isEventEditable}
        holidaysByDate={holidaysByDate}
        allowHorizontalDrag
        timeEntries={timeEntries}
        activeTimer={activeTimer}
        activeTimerElapsedSeconds={activeTimerElapsedSeconds}
      />
    </div>
  )
}
