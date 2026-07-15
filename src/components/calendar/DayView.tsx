import { useState } from 'react'
import type { CalendarEvent } from './types'
import { isSameDay, startOfMonth } from './dateUtils'
import { TimeGrid } from './TimeGrid'
import { MiniMonthCalendar } from './MiniMonthCalendar'
import { EventDetailPanel } from './EventDetailPanel'

interface DayViewProps {
  selectedDate: Date
  events: CalendarEvent[]
  allEvents: CalendarEvent[]
  hourHeight: number
  onHourHeightChange: (height: number) => void
  selectedEventId: string | null
  onDateChange: (date: Date) => void
  onEventSelect: (event: CalendarEvent | null) => void
  onEventMove?: (event: CalendarEvent, newStart: Date, newEnd: Date) => void
  onEventCreate?: (start: Date, end: Date) => void
  pendingCreateRange?: { start: Date; end: Date } | null
  isEventEditable?: (event: CalendarEvent) => boolean
  canEditSelectedEvent?: boolean
  onEditEntry?: () => void
  onCreateTimeEntry?: () => void
}

export function DayView({
  selectedDate,
  events,
  allEvents,
  hourHeight,
  onHourHeightChange,
  selectedEventId,
  onDateChange,
  onEventSelect,
  onEventMove,
  onEventCreate,
  pendingCreateRange,
  isEventEditable,
  canEditSelectedEvent = false,
  onEditEntry,
  onCreateTimeEntry,
}: DayViewProps) {
  const [displayMonth, setDisplayMonth] = useState(() => startOfMonth(selectedDate))

  const selectedEvent = allEvents.find((e) => e.id === selectedEventId) ?? null

  function handleDateSelect(date: Date) {
    onDateChange(date)
    setDisplayMonth(startOfMonth(date))
    if (selectedEvent && !isSameDay(selectedEvent.start, date)) {
      onEventSelect(null)
    }
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="flex min-h-0 min-w-0 flex-col border-r border-navy/8">
        <TimeGrid
          days={[selectedDate]}
          events={events}
          hourHeight={hourHeight}
          onHourHeightChange={onHourHeightChange}
          selectedEventId={selectedEventId}
          onEventClick={(event) => onEventSelect(event)}
          onEventMove={onEventMove}
          onEventCreate={onEventCreate}
          pendingCreateRange={pendingCreateRange}
          isEventEditable={isEventEditable}
          allowHorizontalDrag={false}
        />
      </div>

      <div className="flex min-h-0 min-w-0 flex-col bg-surface-muted/30">
        <MiniMonthCalendar
          displayMonth={displayMonth}
          selectedDate={selectedDate}
          events={allEvents}
          onMonthChange={setDisplayMonth}
          onDateSelect={handleDateSelect}
        />
        <EventDetailPanel
          event={selectedEvent}
          selectedDate={selectedDate}
          canEdit={canEditSelectedEvent}
          onEdit={onEditEntry}
          onCreateTimeEntry={onCreateTimeEntry}
        />
      </div>
    </div>
  )
}
