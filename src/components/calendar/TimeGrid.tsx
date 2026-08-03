import { useCallback, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { useViewportHeight } from '../../hooks/useViewportHeight'
import type { CalendarEvent } from './types'
import {
  eventHeightPercent,
  eventTopPercent,
  eventsForDay,
  formatWeekday,
  isSameDay,
  isToday,
  layoutOverlappingEvents,
  nowLinePercent,
  toDateKey,
} from './dateUtils'
import { EventBlock } from './EventBlock'
import { clampHourHeight, DEFAULT_HOUR_HEIGHT, stepHourHeight } from './hourZoom'
import { useCalendarEntryCreate } from './useCalendarEntryCreate'
import { useCalendarEntryDrag } from './useCalendarEntryDrag'
import { useCalendarEntryResize } from './useCalendarEntryResize'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const SCROLL_TO_HOUR = 8
const DAY_HOURS = 24

const CREATE_PREVIEW_EVENT: CalendarEvent = {
  id: 'create-preview',
  kind: 'timeEntry',
  title: 'New entry',
  start: new Date(0),
  end: new Date(0),
  color: '#62a7e9',
}

interface TimeGridProps {
  days: Date[]
  events: CalendarEvent[]
  hourHeight?: number
  onHourHeightChange?: (height: number) => void
  selectedEventId?: string | null
  onEventClick?: (event: CalendarEvent) => void
  onEventMove?: (event: CalendarEvent, newStart: Date, newEnd: Date) => void
  onEventCreate?: (start: Date, end: Date) => void
  pendingCreateRange?: { start: Date; end: Date } | null
  isEventEditable?: (event: CalendarEvent) => boolean
  allowHorizontalDrag?: boolean
  holidaysByDate?: ReadonlyMap<string, string>
  /** Hour of day (0–23) to scroll into view on first mount. Defaults to 8. */
  initialScrollHour?: number
  /** When false, hides the weekday/date header row. Defaults to true. */
  showDayHeader?: boolean
}

export function TimeGrid({
  days,
  events,
  hourHeight = DEFAULT_HOUR_HEIGHT,
  onHourHeightChange,
  selectedEventId,
  onEventClick,
  onEventMove,
  onEventCreate,
  pendingCreateRange,
  isEventEditable,
  allowHorizontalDrag = false,
  holidaysByDate,
  initialScrollHour = SCROLL_TO_HOUR,
  showDayHeader = true,
}: TimeGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pendingScrollRef = useRef<number | null>(null)
  const prevHourHeightRef = useRef(hourHeight)
  const didInitScrollRef = useRef(false)
  const columnRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const isMultiDay = days.length > 1
  const viewportHeight = useViewportHeight()

  const getColumnRects = useCallback(() => {
    return days
      .map((day) => {
        const el = columnRefs.current.get(day.toISOString())
        if (!el) return null
        const rect = el.getBoundingClientRect()
        return {
          day,
          left: rect.left,
          right: rect.right,
          top: rect.top,
        }
      })
      .filter((column): column is NonNullable<typeof column> => column !== null)
  }, [days])

  const {
    dragPreview,
    isDragging,
    handlePointerDown,
    refreshColumnRects,
  } = useCalendarEntryDrag({
    allowHorizontal: allowHorizontalDrag,
    hourHeight,
    getColumnRects,
    onEventClick,
    onEventMove,
    isEventEditable,
  })

  const {
    createPreview,
    isCreating,
    handleColumnPointerDown,
  } = useCalendarEntryCreate({
    hourHeight,
    onEventCreate,
    disabled: isDragging,
  })

  const {
    resizePreview,
    isResizing,
    handleResizeStartPointerDown,
    handleResizeEndPointerDown,
  } = useCalendarEntryResize({
    hourHeight,
    onEventResize: onEventMove,
    isEventEditable,
    disabled: isDragging || isCreating,
  })

  const interactionActive = isDragging || isResizing || isCreating

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const onScroll = () => {
      if (isDragging) refreshColumnRects()
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [isDragging, refreshColumnRects])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || didInitScrollRef.current) return
    const hour = Math.min(23, Math.max(0, initialScrollHour))
    el.scrollTop = hour * hourHeight
    didInitScrollRef.current = true
    prevHourHeightRef.current = hourHeight
  }, [hourHeight, initialScrollHour])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return

    if (pendingScrollRef.current != null) {
      el.scrollTop = pendingScrollRef.current
      pendingScrollRef.current = null
      prevHourHeightRef.current = hourHeight
      return
    }

    const prev = prevHourHeightRef.current
    if (prev === hourHeight || !didInitScrollRef.current) {
      prevHourHeightRef.current = hourHeight
      return
    }

    const offsetY = el.clientHeight / 2
    const contentY = el.scrollTop + offsetY
    const ratio = contentY / (prev * DAY_HOURS)
    el.scrollTop = ratio * (hourHeight * DAY_HOURS) - offsetY
    prevHourHeightRef.current = hourHeight
  }, [hourHeight])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !onHourHeightChange) return

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return

      event.preventDefault()

      const direction: 1 | -1 = event.deltaY < 0 ? 1 : -1
      const next = stepHourHeight(hourHeight, direction)
      if (next === hourHeight) return

      const offsetY = event.clientY - el.getBoundingClientRect().top
      const contentY = el.scrollTop + offsetY
      const ratio = contentY / (hourHeight * DAY_HOURS)
      pendingScrollRef.current = ratio * (next * DAY_HOURS) - offsetY
      onHourHeightChange(clampHourHeight(next))
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [hourHeight, onHourHeightChange])

  const showNowLine = days.some((d) => isToday(d))

  function renderEventBlock(
    event: CalendarEvent,
    day: Date,
    column: number,
    totalColumns: number,
    options: {
      start: Date
      end: Date
      isDragSource?: boolean
      isDragPreview?: boolean
      isResizePreview?: boolean
      enablePointer?: boolean
      enableResize?: boolean
    },
  ) {
    const displayEvent = { ...event, start: options.start, end: options.end }
    const canInteract =
      (!interactionActive || options.isDragPreview || options.isResizePreview) && !isCreating
    const editable = isEventEditable?.(event) ?? false
    const useDragInteraction = options.enablePointer && editable

    return (
      <EventBlock
        key={`${event.id}-${day.toISOString()}-${options.isDragPreview ? 'drag-preview' : options.isResizePreview ? 'resize-preview' : 'main'}`}
        event={displayEvent}
        top={eventTopPercent(options.start, day)}
        height={eventHeightPercent(options.start, options.end, day)}
        hourHeight={hourHeight}
        viewportHeight={viewportHeight}
        totalColumns={totalColumns}
        left={(column / totalColumns) * 100}
        width={100 / totalColumns}
        selected={selectedEventId === event.id}
        compact={isMultiDay}
        editable={isEventEditable?.(event) ?? false}
        isDragSource={options.isDragSource}
        isDragPreview={options.isDragPreview}
        isResizePreview={options.isResizePreview}
        onPointerDown={
          useDragInteraction && canInteract && !isResizing
            ? (pointerEvent) => handlePointerDown(event, pointerEvent)
            : undefined
        }
        onResizeStartPointerDown={
          options.enableResize && canInteract && editable && !isDragging
            ? (pointerEvent) => handleResizeStartPointerDown(event, pointerEvent)
            : undefined
        }
        onResizeEndPointerDown={
          options.enableResize && canInteract && editable && !isDragging
            ? (pointerEvent) => handleResizeEndPointerDown(event, pointerEvent)
            : undefined
        }
        onClick={
          !useDragInteraction && onEventClick ? () => onEventClick(event) : undefined
        }
      />
    )
  }

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${days.length > 1 ? 'overflow-x-auto' : ''}`}>
      {showDayHeader ? (
      <div
        className={`flex flex-shrink-0 border-b border-navy/8 bg-white ${
          days.length > 1 ? 'min-w-[40rem]' : ''
        }`}
      >
        <div className="w-11 flex-shrink-0 sm:w-14" />
        {days.map((day) => {
          const holidayName = holidaysByDate?.get(toDateKey(day))
          const isHoliday = !!holidayName
          return (
            <div
              key={day.toISOString()}
              title={holidayName}
              className={`flex min-w-0 flex-1 flex-col items-center px-1 py-2 ${
                days.length > 1 ? 'min-w-[4.5rem]' : ''
              } ${isHoliday ? 'bg-brand-tint/70' : ''}`}
            >
              <span
                className={`text-xs font-medium uppercase tracking-wide ${
                  isHoliday ? 'text-brand' : 'text-navy/45'
                }`}
              >
                {formatWeekday(day)}
              </span>
              <span
                className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full font-display text-md font-bold ${
                  isToday(day)
                    ? 'bg-navy text-cream'
                    : isHoliday
                      ? 'bg-brand text-cream'
                      : 'text-navy'
                }`}
              >
                {day.getDate()}
              </span>
              {holidayName ? (
                <span className="mt-1.5 max-w-full truncate rounded-md bg-brand px-2 py-0.5 text-xs font-semibold leading-tight text-cream">
                  {holidayName}
                </span>
              ) : (
                <span className="mt-1.5 h-[22px]" aria-hidden />
              )}
            </div>
          )
        })}
      </div>
      ) : null}

      <div
        ref={scrollRef}
        className={`min-h-0 flex-1 overflow-y-auto ${interactionActive ? 'select-none' : ''}`}
      >
        <div
          className={`relative flex ${days.length > 1 ? 'min-w-[40rem]' : ''}`}
          style={{ height: hourHeight * DAY_HOURS }}
        >
          <div className="sticky left-0 z-10 w-11 flex-shrink-0 bg-white sm:w-14">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="relative border-r border-navy/6 text-right"
                style={{ height: hourHeight }}
              >
                {hour > 0 && (
                  <span className="absolute -top-2 right-1 text-xs text-navy/40 sm:right-2">
                    {hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`}
                  </span>
                )}
              </div>
            ))}
          </div>

          {days.map((day) => {
            const dayEvents = eventsForDay(events, day)
            const layouts = layoutOverlappingEvents(dayEvents)

            const blocks: ReactNode[] = []

            for (const { event, column, totalColumns } of layouts) {
              const isBeingDragged = dragPreview?.event.id === event.id && isDragging
              const isBeingResized = resizePreview?.event.id === event.id && isResizing
              const previewOnThisDay = isBeingDragged && isSameDay(dragPreview.day, day)
              const resizeOnThisDay = isBeingResized && isSameDay(resizePreview.day, day)
              const sourceOnThisDay = isBeingDragged && isSameDay(event.start, day) && !previewOnThisDay

              if (resizeOnThisDay) {
                blocks.push(
                  renderEventBlock(event, day, column, totalColumns, {
                    start: resizePreview.start,
                    end: resizePreview.end,
                    isResizePreview: true,
                  }),
                )
              } else if (previewOnThisDay) {
                blocks.push(
                  renderEventBlock(event, day, column, totalColumns, {
                    start: dragPreview.start,
                    end: dragPreview.end,
                    isDragPreview: true,
                    enablePointer: true,
                  }),
                )
              } else if (sourceOnThisDay) {
                blocks.push(
                  renderEventBlock(event, day, column, totalColumns, {
                    start: event.start,
                    end: event.end,
                    isDragSource: true,
                  }),
                )
              } else if (!isBeingDragged && !isBeingResized) {
                blocks.push(
                  renderEventBlock(event, day, column, totalColumns, {
                    start: event.start,
                    end: event.end,
                    enablePointer: true,
                    enableResize: true,
                  }),
                )
              }
            }

            if (
              dragPreview &&
              isDragging &&
              isSameDay(dragPreview.day, day) &&
              !isSameDay(dragPreview.event.start, day)
            ) {
              blocks.push(
                renderEventBlock(dragPreview.event, day, 0, 1, {
                  start: dragPreview.start,
                  end: dragPreview.end,
                  isDragPreview: true,
                  enablePointer: true,
                }),
              )
            }

            const visibleCreatePreview =
              createPreview ??
              (pendingCreateRange
                ? {
                    day: pendingCreateRange.start,
                    start: pendingCreateRange.start,
                    end: pendingCreateRange.end,
                  }
                : null)

            if (visibleCreatePreview && isSameDay(visibleCreatePreview.day, day)) {
              blocks.push(
                <div key={`create-preview-${day.toISOString()}`} className="pointer-events-none">
                  <EventBlock
                    event={{
                      ...CREATE_PREVIEW_EVENT,
                      start: visibleCreatePreview.start,
                      end: visibleCreatePreview.end,
                    }}
                    top={eventTopPercent(visibleCreatePreview.start, day)}
                    height={eventHeightPercent(
                      visibleCreatePreview.start,
                      visibleCreatePreview.end,
                      day,
                    )}
                    hourHeight={hourHeight}
                    viewportHeight={viewportHeight}
                    isDragPreview
                  />
                </div>,
              )
            }

            return (
              <div
                key={day.toISOString()}
                ref={(el) => {
                  if (el) columnRefs.current.set(day.toISOString(), el)
                  else columnRefs.current.delete(day.toISOString())
                }}
                className={`relative min-w-0 flex-1 border-r border-navy/6 last:border-r-0 ${
                  days.length > 1 ? 'min-w-[4.5rem]' : ''
                }`}
                onPointerDown={(pointerEvent) => {
                  if (isDragging || isResizing || !onEventCreate) return
                  const columnEl = columnRefs.current.get(day.toISOString())
                  if (!columnEl) return
                  handleColumnPointerDown(day, columnEl, pointerEvent)
                }}
              >
                {HOURS.map((hour) => (
                  <div key={hour} className="relative" style={{ height: hourHeight }}>
                    <div className="absolute inset-x-0 top-0 border-t border-navy/6" />
                    <div
                      className="absolute inset-x-0 border-t border-dashed border-navy/4"
                      style={{ top: hourHeight / 2 }}
                    />
                  </div>
                ))}

                {showNowLine && isToday(day) && (
                  <div
                    className="pointer-events-none absolute right-0 left-0 z-20"
                    style={{ top: `${nowLinePercent()}%` }}
                  >
                    <div className="relative flex items-center">
                      <div className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-red" />
                      <div className="h-px flex-1 bg-red" />
                    </div>
                  </div>
                )}

                {blocks}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
