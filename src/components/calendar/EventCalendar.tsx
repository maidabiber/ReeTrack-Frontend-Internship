import { useMemo, useState } from 'react'
import type { CalendarEvent, CalendarViewMode } from './types'
import {
  addDays,
  addWeeks,
  endOfDay,
  endOfWeek,
  eventsInRange,
  startOfDay,
  startOfWeek,
} from './dateUtils'
import { getMockEvents } from './mockEvents'
import { CalendarHeader } from './CalendarHeader'
import { DayView } from './DayView'
import { WeekView } from './WeekView'

export function EventCalendar() {
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  const events = useMemo(() => getMockEvents(), [])

  const visibleRange = useMemo(() => {
    if (viewMode === 'day') {
      return { from: startOfDay(selectedDate), to: endOfDay(selectedDate) }
    }
    return { from: startOfWeek(selectedDate), to: endOfWeek(selectedDate) }
  }, [selectedDate, viewMode])

  const visibleEvents = useMemo(
    () => eventsInRange(events, visibleRange.from, visibleRange.to),
    [events, visibleRange],
  )

  function handleToday() {
    setSelectedDate(new Date())
  }

  function handlePrev() {
    setSelectedDate((d) => (viewMode === 'day' ? addDays(d, -1) : addWeeks(d, -1)))
  }

  function handleNext() {
    setSelectedDate((d) => (viewMode === 'day' ? addDays(d, 1) : addWeeks(d, 1)))
  }

  function handleEventSelect(event: CalendarEvent | null) {
    if (!event) {
      setSelectedEventId(null)
      return
    }
    setSelectedEventId(event.id)
    setSelectedDate(event.start)
    if (viewMode === 'week') {
      setViewMode('day')
    }
  }

  function handleDateChange(date: Date) {
    setSelectedDate(date)
    if (selectedEventId) {
      const event = events.find((e) => e.id === selectedEventId)
      if (event && event.start.toDateString() !== date.toDateString()) {
        setSelectedEventId(null)
      }
    }
  }

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[520px] flex-col overflow-hidden rounded-[18px] bg-white shadow-card">
      <CalendarHeader
        selectedDate={selectedDate}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onToday={handleToday}
        onPrev={handlePrev}
        onNext={handleNext}
      />

      {viewMode === 'day' ? (
        <DayView
          selectedDate={selectedDate}
          events={visibleEvents}
          allEvents={events}
          selectedEventId={selectedEventId}
          onDateChange={handleDateChange}
          onEventSelect={handleEventSelect}
        />
      ) : (
        <WeekView
          selectedDate={selectedDate}
          events={visibleEvents}
          selectedEventId={selectedEventId}
          onEventClick={handleEventSelect}
        />
      )}
    </div>
  )
}
