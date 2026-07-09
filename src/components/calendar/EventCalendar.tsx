import { useEffect, useMemo, useState } from 'react'
import { calendarApiErrorMessage, getCalendarView } from '../../api/calendar'
import { useTimer } from '../../hooks/useTimer'
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
import { mapSyncedEventToCalendarEvent, mapTimeEntryToCalendarEvent } from './mapCalendarView'
import { DEFAULT_HOUR_HEIGHT, stepHourHeight } from './hourZoom'
import { CalendarHeader } from './CalendarHeader'
import { DayView } from './DayView'
import { WeekView } from './WeekView'

export function EventCalendar() {
  const { entries, activeTimer, elapsedSeconds } = useTimer()
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [syncedEvents, setSyncedEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [hourHeight, setHourHeight] = useState(DEFAULT_HOUR_HEIGHT)

  const visibleRange = useMemo(() => {
    if (viewMode === 'day') {
      return { from: startOfDay(selectedDate), to: endOfDay(selectedDate) }
    }
    return { from: startOfWeek(selectedDate), to: endOfWeek(selectedDate) }
  }, [selectedDate, viewMode])

  useEffect(() => {
    let cancelled = false

    setIsLoading(true)
    setLoadError(null)

    getCalendarView({
      from: visibleRange.from.toISOString(),
      to: visibleRange.to.toISOString(),
    })
      .then((view) => {
        if (cancelled) return
        setSyncedEvents(view.calendarEvents.map(mapSyncedEventToCalendarEvent))
      })
      .catch((error) => {
        if (cancelled) return
        setLoadError(
          calendarApiErrorMessage(error, 'Could not load calendar data. Is the backend running?'),
        )
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [visibleRange.from, visibleRange.to, reloadKey])

  const events = useMemo(() => {
    const byId = new Map<string, CalendarEvent>()

    for (const entry of entries) {
      const mapped = mapTimeEntryToCalendarEvent(entry)
      if (mapped) byId.set(mapped.id, mapped)
    }

    if (activeTimer) {
      const mapped = mapTimeEntryToCalendarEvent(activeTimer)
      if (mapped) byId.set(mapped.id, mapped)
    }

    // elapsedSeconds keeps the running block's end advancing while the calendar is open.
    void elapsedSeconds

    return [...byId.values(), ...syncedEvents]
  }, [entries, activeTimer, elapsedSeconds, syncedEvents])

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

  function handleZoomIn() {
    setHourHeight((height) => stepHourHeight(height, 1))
  }

  function handleZoomOut() {
    setHourHeight((height) => stepHourHeight(height, -1))
  }

  return (
    <div className="timer-panel relative flex h-[calc(100vh-220px)] min-h-[520px] flex-col overflow-hidden">
      <CalendarHeader
        selectedDate={selectedDate}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onToday={handleToday}
        onPrev={handlePrev}
        onNext={handleNext}
        hourHeight={hourHeight}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
      />

      {loadError && (
        <div className="flex items-center justify-between gap-3 border-b border-navy/8 bg-red-tint px-4 py-2.5">
          <span className="text-[13px] text-red">{loadError}</span>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="rounded-full border-[1.5px] border-navy px-3 py-1 font-display text-[12px] font-semibold text-navy"
          >
            Retry
          </button>
        </div>
      )}

      {viewMode === 'day' ? (
        <DayView
          selectedDate={selectedDate}
          events={visibleEvents}
          allEvents={events}
          hourHeight={hourHeight}
          onHourHeightChange={setHourHeight}
          selectedEventId={selectedEventId}
          onDateChange={handleDateChange}
          onEventSelect={handleEventSelect}
        />
      ) : (
        <WeekView
          selectedDate={selectedDate}
          events={visibleEvents}
          hourHeight={hourHeight}
          onHourHeightChange={setHourHeight}
          selectedEventId={selectedEventId}
          onEventClick={handleEventSelect}
        />
      )}

      {isLoading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70">
          <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-navy/20 border-t-navy" />
        </div>
      )}
    </div>
  )
}
