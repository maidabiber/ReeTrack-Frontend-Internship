import { useState } from 'react'
import type { CalendarEvent } from './types'
import { isSameDay, startOfMonth } from './dateUtils'
import { TimeGrid } from './TimeGrid'
import { MiniMonthCalendar } from './MiniMonthCalendar'
import { EventDetailPanel } from './EventDetailPanel'
import { WeekStrip } from './WeekStrip'

interface DayViewProps {
  selectedDate: Date
  events: CalendarEvent[]
  allEvents: CalendarEvent[]
  hourHeight: number
  onHourHeightChange: (height: number) => void
  selectedEventId: string | null
  onDateChange: (date: Date) => void
  onEventSelect: (event: CalendarEvent | null) => void
  /** Mini-month + detail panel need real width; below `md` a WeekStrip replaces them. */
  showSidePanel?: boolean
  onEventMove?: (event: CalendarEvent, newStart: Date, newEnd: Date) => void
  onEventDuplicate?: (event: CalendarEvent, newStart: Date, newEnd: Date) => void
  onEventCreate?: (start: Date, end: Date) => void
  pendingCreateRange?: { start: Date; end: Date } | null
  isEventEditable?: (event: CalendarEvent) => boolean
  canEditSelectedEvent?: boolean
  holidaysByDate?: ReadonlyMap<string, string>
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
  showSidePanel = true,
  onEventMove,
  onEventDuplicate,
  onEventCreate,
  pendingCreateRange,
  isEventEditable,
  canEditSelectedEvent = false,
  holidaysByDate,
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
    <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="flex min-h-0 min-w-0 flex-col border-navy/8 md:border-r">
        {!showSidePanel ? (
          <WeekStrip
            selectedDate={selectedDate}
            events={allEvents}
            holidaysByDate={holidaysByDate}
            onDateSelect={handleDateSelect}
          />
        ) : null}
        <TimeGrid
          days={[selectedDate]}
          events={events}
          hourHeight={hourHeight}
          onHourHeightChange={onHourHeightChange}
          selectedEventId={selectedEventId}
          onEventClick={(event) => onEventSelect(event)}
          onEventMove={onEventMove}
          onEventDuplicate={onEventDuplicate}
          onEventCreate={onEventCreate}
          pendingCreateRange={pendingCreateRange}
          isEventEditable={isEventEditable}
          holidaysByDate={holidaysByDate}
          allowHorizontalDrag={false}
        />
      </div>

      {showSidePanel ? (
        <div className="flex min-h-0 min-w-0 flex-col border-t border-navy/8 bg-surface-muted/30 md:border-t-0">
          <MiniMonthCalendar
            displayMonth={displayMonth}
            selectedDate={selectedDate}
            events={allEvents}
            holidaysByDate={holidaysByDate}
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
      ) : null}
    </div>
  )
}
