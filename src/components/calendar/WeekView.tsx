import type { CalendarEvent } from './types'
import { getWeekDays } from './dateUtils'
import { TimeGrid } from './TimeGrid'

interface WeekViewProps {
  selectedDate: Date
  events: CalendarEvent[]
  selectedEventId: string | null
  onEventClick: (event: CalendarEvent) => void
}

export function WeekView({ selectedDate, events, selectedEventId, onEventClick }: WeekViewProps) {
  const days = getWeekDays(selectedDate)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TimeGrid
        days={days}
        events={events}
        selectedEventId={selectedEventId}
        onEventClick={onEventClick}
      />
    </div>
  )
}
