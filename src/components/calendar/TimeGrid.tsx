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
} from './dateUtils'
import { EventBlock } from './EventBlock'
import { clampHourHeight, DEFAULT_HOUR_HEIGHT, stepHourHeight } from './hourZoom'
import { useCalendarEntryDrag } from './useCalendarEntryDrag'
import { useCalendarEntryResize } from './useCalendarEntryResize'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const SCROLL_TO_HOUR = 8
const DAY_HOURS = 24

interface TimeGridProps {
  days: Date[]
  events: CalendarEvent[]
  hourHeight?: number
  onHourHeightChange?: (height: number) => void
  selectedEventId?: string | null
  onEventClick?: (event: CalendarEvent) => void
  onEventMove?: (event: CalendarEvent, newStart: Date, newEnd: Date) => void
  isEventEditable?: (event: CalendarEvent) => boolean
  allowHorizontalDrag?: boolean
}

export function TimeGrid({
  days,
  events,
  hourHeight = DEFAULT_HOUR_HEIGHT,
  onHourHeightChange,
  selectedEventId,
  onEventClick,
  onEventMove,
  isEventEditable,
  allowHorizontalDrag = false,
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
    resizePreview,
    isResizing,
    handleResizeStartPointerDown,
    handleResizeEndPointerDown,
  } = useCalendarEntryResize({
    hourHeight,
    onEventResize: onEventMove,
    isEventEditable,
    disabled: isDragging,
  })

  const interactionActive = isDragging || isResizing

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
    el.scrollTop = SCROLL_TO_HOUR * hourHeight
    didInitScrollRef.current = true
    prevHourHeightRef.current = hourHeight
  }, [hourHeight])

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
    const canInteract = !interactionActive || options.isDragPreview || options.isResizePreview
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-shrink-0 border-b border-navy/8 bg-white">
        <div className="w-14 flex-shrink-0" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className="flex min-w-0 flex-1 flex-col items-center py-2"
          >
            <span className="text-[11px] font-medium uppercase tracking-wide text-navy/45">
              {formatWeekday(day)}
            </span>
            <span
              className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full font-display text-[13px] font-bold ${
                isToday(day) ? 'bg-navy text-cream' : 'text-navy'
              }`}
            >
              {day.getDate()}
            </span>
          </div>
        ))}
      </div>

      <div
        ref={scrollRef}
        className={`min-h-0 flex-1 overflow-y-auto ${interactionActive ? 'select-none' : ''}`}
      >
        <div className="relative flex" style={{ height: hourHeight * DAY_HOURS }}>
          <div className="sticky left-0 z-10 w-14 flex-shrink-0 bg-white">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="relative border-r border-navy/6 text-right"
                style={{ height: hourHeight }}
              >
                {hour > 0 && (
                  <span className="absolute -top-2 right-2 text-[10px] text-navy/40">
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

            return (
              <div
                key={day.toISOString()}
                ref={(el) => {
                  if (el) columnRefs.current.set(day.toISOString(), el)
                  else columnRefs.current.delete(day.toISOString())
                }}
                className="relative min-w-0 flex-1 border-r border-navy/6 last:border-r-0"
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
