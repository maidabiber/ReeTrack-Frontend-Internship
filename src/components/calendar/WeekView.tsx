import type { CalendarEvent } from './types'
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
  isEventEditable?: (event: CalendarEvent) => boolean
}

export function WeekView({
  selectedDate,
  events,
  hourHeight,
  onHourHeightChange,
  selectedEventId,
  onEventClick,
  onEventMove,
  isEventEditable,
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
        isEventEditable={isEventEditable}
        allowHorizontalDrag
      />
    </div>
  )
}
