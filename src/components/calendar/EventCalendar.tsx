import { useCallback, useEffect, useMemo, useState } from 'react'
import { calendarApiErrorMessage, getCalendarView } from '../../api/calendar'
import { CreateEntryModal } from '../time/CreateEntryModal'
import { EditEntryModal } from '../time/EditEntryModal'
import { OverlapConfirmModal, useOverlapConfirm } from '../time/overlapConfirm'
import { useTimer } from '../../hooks/useTimer'
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
}

export function EventCalendar() {
  const { entries, activeTimer, elapsedSeconds, updateEntry, isSavingEdit } = useTimer()
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [syncedEvents, setSyncedEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [hourHeight, setHourHeight] = useState(DEFAULT_HOUR_HEIGHT)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [readonlyCalendarEvent, setReadonlyCalendarEvent] = useState<CalendarEvent | null>(null)
  const [creatingFromEvent, setCreatingFromEvent] = useState<CalendarEvent | null>(null)
  const [creatingRange, setCreatingRange] = useState<{ start: Date; end: Date } | null>(null)
  const [pendingDragSave, setPendingDragSave] = useState<PendingDragSave | null>(null)

  const overlapConfirm = useOverlapConfirm()
  const { overlapWarning, showOverlapConfirm } = overlapConfirm

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

    void elapsedSeconds

    return [...byId.values(), ...syncedEvents]
  }, [entries, activeTimer, elapsedSeconds, syncedEvents])

  const visibleEvents = useMemo(
    () => eventsInRange(events, visibleRange.from, visibleRange.to),
    [events, visibleRange],
  )

  const isEventEditable = useCallback(
    (event: CalendarEvent) => isEditableTimeEntryEvent(event, entries, activeTimer),
    [entries, activeTimer],
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

  const executeDragSave = useCallback(
    async (save: PendingDragSave, confirmOverlap: boolean) => {
      await updateEntry({
        id: save.entryId,
        description: save.description,
        startedAtUtc: save.startedAtUtc,
        endedAtUtc: save.endedAtUtc,
        isBillable: save.isBillable,
        confirmOverlap,
      })
      setPendingDragSave(null)
      overlapConfirm.clearOverlapConfirm()
    },
    [overlapConfirm, updateEntry],
  )

  const handleDragMoveConfirm = useCallback(async () => {
    if (!pendingDragSave) return

    await overlapConfirm.saveWithOverlapConfirm(true, {
      validationError: null,
      onValidationError: () => undefined,
      save: async (confirmed) => executeDragSave(pendingDragSave, confirmed),
    })
  }, [pendingDragSave, overlapConfirm, executeDragSave])

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
      }

      setPendingDragSave(save)

      await overlapConfirm.saveWithOverlapConfirm(false, {
        validationError: null,
        onValidationError: () => undefined,
        save: async (confirmed) => executeDragSave(save, confirmed),
        onOtherError: () => setPendingDragSave(null),
      })
    },
    [executeDragSave, isEventEditable, overlapConfirm, resolveEntry],
  )

  function handleCreateFromCalendarEvent(event: CalendarEvent) {
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
          onEventCreate={handleEventCreate}
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
          onEventCreate={handleEventCreate}
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

      {showOverlapConfirm && overlapWarning && pendingDragSave ? (
        <OverlapConfirmModal
          message={overlapWarning}
          isSaving={isSavingEdit}
          onCancel={() => {
            overlapConfirm.clearOverlapConfirm()
            setPendingDragSave(null)
          }}
          onConfirm={() => void handleDragMoveConfirm()}
        />
      ) : null}
    </div>
  )
}
