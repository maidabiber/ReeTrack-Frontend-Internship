import { useCallback, useEffect, useMemo, useState } from 'react'
import { getCalendarView } from '../../api/calendar'
import { apiErrorMessage } from '../../api/client'
import { listHolidays } from '../../api/holidays'
import { CreateEntryModal } from '../time/CreateEntryModal'
import { EditEntryModal } from '../time/EditEntryModal'
import { ReviewPendingEntryModal } from '../time/ReviewPendingEntryModal'

import { useOverlapAlert } from '../../hooks/useOverlapAlert'
import { MAX_MANUAL_DURATION_SECONDS } from '../../lib/manualEntry'
import { DURATION_LIMIT_MESSAGE, isDurationLimitError } from '../../lib/timeEntryErrors'
import { DurationLimitModal } from '../time/durationLimitModal'
import { OverlapAlertModal } from '../time/overlapAlert'

import { useTimer } from '../../hooks/useTimer'
import { useWeekLock } from '../../hooks/useWeekLock'
import { BREAKPOINT, useMediaQuery } from '../../hooks/useMediaQuery'
import { WeekLockBanner } from '../timesheet/WeekLockBanner'
import { VIEWPORT_PANEL_HEIGHT } from '../layout/pageChrome'
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
  const { entries, activeTimer, elapsedSeconds, updateEntry, refresh, addManualEntry } = useTimer()
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const isMd = useMediaQuery(BREAKPOINT.md)
  // A 7-column week needs real width; below `md` there is only ever room for a day, so
  // the user's last explicit choice is remembered but overridden while the window is narrow.
  const [preferredViewMode, setPreferredViewMode] = useState<CalendarViewMode>('week')
  const viewMode: CalendarViewMode = isMd ? preferredViewMode : 'day'
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [syncedEvents, setSyncedEvents] = useState<CalendarEvent[]>([])
  const [fetchedKey, setFetchedKey] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [hourHeight, setHourHeight] = useState(DEFAULT_HOUR_HEIGHT)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [reviewingEntry, setReviewingEntry] = useState<TimeEntry | null>(null)
  const [readonlyCalendarEvent, setReadonlyCalendarEvent] = useState<CalendarEvent | null>(null)
  const [creatingFromEvent, setCreatingFromEvent] = useState<CalendarEvent | null>(null)
  const [creatingRange, setCreatingRange] = useState<{ start: Date; end: Date } | null>(null)
  const [holidaysByDate, setHolidaysByDate] = useState<ReadonlyMap<string, string>>(() => new Map())
  const [durationLimitMessage, setDurationLimitMessage] = useState<string | null>(null)

  const overlapAlert = useOverlapAlert()
  const { overlapWarning, showOverlapAlert } = overlapAlert

  const handleDurationLimitError = useCallback((err: unknown) => {
    if (isDurationLimitError(err)) {
      setDurationLimitMessage(apiErrorMessage(err, DURATION_LIMIT_MESSAGE))
    }
  }, [])

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

    listHolidays()
      .then((holidays) => {
        if (cancelled) return
        const map = new Map<string, string>()
        for (const holiday of holidays) {
          if (holiday.isActive) map.set(holiday.date, holiday.name)
        }
        setHolidaysByDate(map)
      })
      .catch(() => {
        if (cancelled) return
        setHolidaysByDate(new Map())
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    getCalendarView({
      from: visibleRange.from.toISOString(),
      to: visibleRange.to.toISOString(),
    })
      .then((view) => {
        if (cancelled) return
        setSyncedEvents(view.calendarEvents.map(mapSyncedEventToCalendarEvent))
        console.log(view)
        setLoadError(null)
        setFetchedKey(requestKey)
      })
      .catch((error) => {
        if (cancelled) return
        setLoadError(
          apiErrorMessage(error, 'Could not load calendar data. Is the backend running?'),
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

      const durationSeconds = Math.round((newEnd.getTime() - newStart.getTime()) / 1000)
      if (durationSeconds > MAX_MANUAL_DURATION_SECONDS) {
        setDurationLimitMessage(DURATION_LIMIT_MESSAGE)
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
          await updateEntry(save.entryId, {
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
        onOtherError: handleDurationLimitError,
      })
    },
    [handleDurationLimitError, isEventEditable, overlapAlert, resolveEntry, updateEntry],
  )

  const handleEventDuplicate = useCallback(
    async (event: CalendarEvent, newStart: Date, newEnd: Date) => {
      if (!isEventEditable(event)) return

      const entry = resolveEntry(event)
      if (!entry) return

      const durationSeconds = Math.round((newEnd.getTime() - newStart.getTime()) / 1000)
      if (durationSeconds > MAX_MANUAL_DURATION_SECONDS) {
        setDurationLimitMessage(DURATION_LIMIT_MESSAGE)
        return
      }

      await overlapAlert.saveOrShowOverlapAlert({
        validationError: null,
        onValidationError: () => undefined,
        save: async () => {
          await addManualEntry({
            description: entry.description ?? undefined,
            isBillable: entry.isBillable,
            startedAtUtc: newStart.toISOString(),
            endedAtUtc: newEnd.toISOString(),
            projectId: entry.projectId,
            projectTaskId: entry.projectTaskId,
            tagIds: entry.tags.map((tag) => tag.id),
          })
          overlapAlert.clearOverlapAlert()
        },
        onOtherError: handleDurationLimitError,
      })
    },
    [handleDurationLimitError, isEventEditable, resolveEntry, addManualEntry, overlapAlert],
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
      if (entry) {
        if (entry.status === 'Pending') {
          setReviewingEntry(entry)
        } else {
          setEditingEntry(entry)
        }
      }
      return
    }

    setReadonlyCalendarEvent(event)
  }

  function handleDayEventSelect(event: CalendarEvent | null) {
    setSelectedEventId(event?.id ?? null)
  }

  // Below `md` there's no detail panel to reveal a selection, so tapping an event
  // opens the same modal week view uses instead of just marking it selected.
  function handleMobileDayEventSelect(event: CalendarEvent | null) {
    if (!event) return
    handleWeekEventClick(event)
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
    <div className={`timer-panel relative flex flex-col overflow-hidden ${VIEWPORT_PANEL_HEIGHT}`}>
      <CalendarHeader
        selectedDate={selectedDate}
        viewMode={viewMode}
        onViewModeChange={setPreferredViewMode}
        showViewToggle={isMd}
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
          onEventSelect={isMd ? handleDayEventSelect : handleMobileDayEventSelect}
          showSidePanel={isMd}
          onEventMove={handleEventMove}
          onEventDuplicate={handleEventDuplicate}
          onEventCreate={weekLock.locked ? undefined : handleEventCreate}
          pendingCreateRange={creatingRange}
          isEventEditable={isEventEditable}
          canEditSelectedEvent={canEditSelectedEvent}
          holidaysByDate={holidaysByDate}
          timeEntries={entries}
          activeTimer={activeTimer}
          activeTimerElapsedSeconds={elapsedSeconds}
          onEditEntry={
            selectedTimeEntry
              ? () => {
                if (selectedTimeEntry.status === 'Pending') {
                  setReviewingEntry(selectedTimeEntry)
                } else {
                  setEditingEntry(selectedTimeEntry)
                }
              }
              : undefined
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
          onEventDuplicate={handleEventDuplicate}
          onEventCreate={weekLock.locked ? undefined : handleEventCreate}
          pendingCreateRange={creatingRange}
          isEventEditable={isEventEditable}
          holidaysByDate={holidaysByDate}
          timeEntries={entries}
          activeTimer={activeTimer}
          activeTimerElapsedSeconds={elapsedSeconds}
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

      {reviewingEntry ? (
        <ReviewPendingEntryModal
          entry={reviewingEntry}
          allPending={entries.filter((e) => e.status === 'Confirmed' && e.id !== reviewingEntry.id)}
          onClose={() => setReviewingEntry(null)}
          onUpdated={() => {}}
          onApproved={() => {
            void refresh()
            setReviewingEntry(null)
          }}
          onRejected={() => {
            void refresh()
            setReviewingEntry(null)
          }}
        />
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

      {durationLimitMessage ? (
        <DurationLimitModal
          message={durationLimitMessage}
          onDismiss={() => setDurationLimitMessage(null)}
        />
      ) : null}
    </div>
  )
}
