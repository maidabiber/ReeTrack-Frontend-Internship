import { useCallback, useEffect, useMemo, useState } from 'react'
import { calendarApiErrorMessage, getCalendarView } from '../../api/calendar'
import { CreateEntryModal } from '../time/CreateEntryModal'
import { EditEntryModal } from '../time/EditEntryModal'

import { useOverlapAlert } from '../../hooks/useOverlapAlert'
import { OverlapAlertModal } from '../time/overlapAlert'

import { useTimer } from '../../hooks/useTimer'
import { useWeekLock } from '../../hooks/useWeekLock'
import { WeekLockBanner } from '../timesheet/WeekLockBanner'
import type { TimeEntry } from '../../types/timeEntry'
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
import {
  isEditableTimeEntryEvent,
  mapSyncedEventToCalendarEvent,
  mapTimeEntryToCalendarEvent,
  resolveTimeEntryFromCalendarEvent,
} from './mapCalendarView'
import { DEFAULT_HOUR_HEIGHT, stepHourHeight } from './hourZoom'
import { CalendarHeader } from './CalendarHeader'
import { CalendarEventModal } from './CalendarEventModal'
import { DayView } from './DayView'
import { WeekView } from './WeekView'

interface PendingDragSave {
  entryId: string
  description?: string
  startedAtUtc: string
  endedAtUtc: string
  isBillable: boolean
  projectId?: string | null
  projectTaskId?: string | null
  tagIds?: string[]
}

export function EventCalendar() {
  const { entries, activeTimer, elapsedSeconds, updateEntry } = useTimer()
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [syncedEvents, setSyncedEvents] = useState<CalendarEvent[]>([])
  const [fetchedKey, setFetchedKey] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [hourHeight, setHourHeight] = useState(DEFAULT_HOUR_HEIGHT)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [readonlyCalendarEvent, setReadonlyCalendarEvent] = useState<CalendarEvent | null>(null)
  const [creatingFromEvent, setCreatingFromEvent] = useState<CalendarEvent | null>(null)
  const [creatingRange, setCreatingRange] = useState<{ start: Date; end: Date } | null>(null)

  const overlapAlert = useOverlapAlert()
  const { overlapWarning, showOverlapAlert } = overlapAlert

  // The visible week's timesheet lock: when submitted/approved, entries in it
  // can't be dragged, resized, created or edited (the backend 409s too).
  const weekLock = useWeekLock(selectedDate)

  const visibleRange = useMemo(() => {
    if (viewMode === 'day') {
      return { from: startOfDay(selectedDate), to: endOfDay(selectedDate) }
    }
    return { from: startOfWeek(selectedDate), to: endOfWeek(selectedDate) }
  }, [selectedDate, viewMode])

  const requestKey = `${visibleRange.from.toISOString()}:${visibleRange.to.toISOString()}:${reloadKey}`
  const isLoading = fetchedKey !== requestKey

  useEffect(() => {
    let cancelled = false

    getCalendarView({
      from: visibleRange.from.toISOString(),
      to: visibleRange.to.toISOString(),
    })
      .then((view) => {
        if (cancelled) return
        setSyncedEvents(view.calendarEvents.map(mapSyncedEventToCalendarEvent))
        setLoadError(null)
        setFetchedKey(requestKey)
      })
      .catch((error) => {
        if (cancelled) return
        setLoadError(
          calendarApiErrorMessage(error, 'Could not load calendar data. Is the backend running?'),
        )
        setFetchedKey(requestKey)
      })

    return () => {
      cancelled = true
    }
  }, [requestKey, visibleRange.from, visibleRange.to])

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

    void elapsedSeconds

    return [...byId.values(), ...syncedEvents]
  }, [entries, activeTimer, elapsedSeconds, syncedEvents])

  const visibleEvents = useMemo(
    () => eventsInRange(events, visibleRange.from, visibleRange.to),
    [events, visibleRange],
  )

  const isEventEditable = useCallback(
    (event: CalendarEvent) =>
      !weekLock.locked && isEditableTimeEntryEvent(event, entries, activeTimer),
    [weekLock.locked, entries, activeTimer],
  )

  const resolveEntry = useCallback(
    (event: CalendarEvent) => resolveTimeEntryFromCalendarEvent(event, entries, activeTimer),
    [entries, activeTimer],
  )

  const selectedEvent = selectedEventId ? events.find((event) => event.id === selectedEventId) ?? null : null
  const selectedTimeEntry = selectedEvent ? resolveEntry(selectedEvent) : null
  const canEditSelectedEvent = selectedEvent
    ? isEditableTimeEntryEvent(selectedEvent, entries, activeTimer)
    : false

  const handleEventMove = useCallback(
    async (event: CalendarEvent, newStart: Date, newEnd: Date) => {
      if (!isEventEditable(event)) return

      const entry = resolveEntry(event)
      if (!entry) return

      if (
        newStart.getTime() === event.start.getTime() &&
        newEnd.getTime() === event.end.getTime()
      ) {
        return
      }

      const save: PendingDragSave = {
        entryId: entry.id,
        description: entry.description ?? undefined,
        startedAtUtc: newStart.toISOString(),
        endedAtUtc: newEnd.toISOString(),
        isBillable: entry.isBillable,
        projectId: entry.projectId,
        projectTaskId: entry.projectTaskId,
        tagIds: entry.tags.map((tag) => tag.id),
      }

      await overlapAlert.saveOrShowOverlapAlert({
        validationError: null,
        onValidationError: () => undefined,
        save: async () => {
          await updateEntry({
            id: save.entryId,
            description: save.description,
            startedAtUtc: save.startedAtUtc,
            endedAtUtc: save.endedAtUtc,
            isBillable: save.isBillable,
            projectId: save.projectId,
            projectTaskId: save.projectTaskId,
            tagIds: save.tagIds,
          })
          overlapAlert.clearOverlapAlert()
        },
      })
    },
    [isEventEditable, overlapAlert, resolveEntry, updateEntry],
  )

  function handleCreateFromCalendarEvent(event: CalendarEvent) {
    if (weekLock.locked) return
    setReadonlyCalendarEvent(null)
    setCreatingRange(null)
    setCreatingFromEvent(event)
  }

  function handleEventCreate(start: Date, end: Date) {
    setCreatingFromEvent(null)
    setEditingEntry(null)
    setReadonlyCalendarEvent(null)
    setCreatingRange({ start, end })
  }

  function handleToday() {
    setSelectedDate(new Date())
  }

  function handlePrev() {
    setSelectedDate((d) => (viewMode === 'day' ? addDays(d, -1) : addWeeks(d, -1)))
  }

  function handleNext() {
    setSelectedDate((d) => (viewMode === 'day' ? addDays(d, 1) : addWeeks(d, 1)))
  }

  function handleWeekEventClick(event: CalendarEvent) {
    if (event.kind === 'timeEntry') {
      const entry = resolveEntry(event)
      if (entry) setEditingEntry(entry)
      return
    }

    setReadonlyCalendarEvent(event)
  }

  function handleDayEventSelect(event: CalendarEvent | null) {
    setSelectedEventId(event?.id ?? null)
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
          <span className="text-body text-red">{loadError}</span>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="rounded-full border-control border-navy px-3 py-1 font-display text-sm font-semibold text-navy"
          >
            Retry
          </button>
        </div>
      )}

      {weekLock.locked && (
        <WeekLockBanner
          status={weekLock.status}
          className="border-b border-navy/8 bg-surface-muted px-4 py-2.5"
        />
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
          onEventSelect={handleDayEventSelect}
          onEventMove={handleEventMove}
          onEventCreate={weekLock.locked ? undefined : handleEventCreate}
          pendingCreateRange={creatingRange}
          isEventEditable={isEventEditable}
          canEditSelectedEvent={canEditSelectedEvent}
          onEditEntry={
            selectedTimeEntry ? () => setEditingEntry(selectedTimeEntry) : undefined
          }
          onCreateTimeEntry={
            selectedEvent?.kind === 'calendarEvent'
              ? () => handleCreateFromCalendarEvent(selectedEvent)
              : undefined
          }
        />
      ) : (
        <WeekView
          selectedDate={selectedDate}
          events={visibleEvents}
          hourHeight={hourHeight}
          onHourHeightChange={setHourHeight}
          selectedEventId={selectedEventId}
          onEventClick={handleWeekEventClick}
          onEventMove={handleEventMove}
          onEventCreate={weekLock.locked ? undefined : handleEventCreate}
          pendingCreateRange={creatingRange}
          isEventEditable={isEventEditable}
        />
      )}

      {isLoading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70">
          <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-navy/20 border-t-navy" />
        </div>
      )}

      {editingEntry ? (
        <EditEntryModal entry={editingEntry} onClose={() => setEditingEntry(null)} />
      ) : null}

      {creatingFromEvent ? (
        <CreateEntryModal
          initialDescription={creatingFromEvent.title}
          initialStart={creatingFromEvent.start}
          initialEnd={creatingFromEvent.end}
          onClose={() => setCreatingFromEvent(null)}
        />
      ) : null}

      {creatingRange ? (
        <CreateEntryModal
          initialDescription=""
          initialStart={creatingRange.start}
          initialEnd={creatingRange.end}
          onClose={() => setCreatingRange(null)}
        />
      ) : null}

      {readonlyCalendarEvent ? (
        <CalendarEventModal
          event={readonlyCalendarEvent}
          onClose={() => setReadonlyCalendarEvent(null)}
          onCreateTimeEntry={() => handleCreateFromCalendarEvent(readonlyCalendarEvent)}
        />
      ) : null}

      {showOverlapAlert && overlapWarning ? (
        <OverlapAlertModal
          message={overlapWarning}
          onDismiss={overlapAlert.clearOverlapAlert}
        />
      ) : null}
    </div>
  )
}
