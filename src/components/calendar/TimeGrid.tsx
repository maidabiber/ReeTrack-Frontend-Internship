import { useEffect, useLayoutEffect, useRef } from 'react'
import type { CalendarEvent } from './types'
import {
  eventHeightPercent,
  eventTopPercent,
  eventsForDay,
  formatWeekday,
  isToday,
  layoutOverlappingEvents,
  nowLinePercent,
} from './dateUtils'
import { EventBlock } from './EventBlock'
import { clampHourHeight, DEFAULT_HOUR_HEIGHT, stepHourHeight } from './hourZoom'

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
}

export function TimeGrid({
  days,
  events,
  hourHeight = DEFAULT_HOUR_HEIGHT,
  onHourHeightChange,
  selectedEventId,
  onEventClick,
}: TimeGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pendingScrollRef = useRef<number | null>(null)
  const prevHourHeightRef = useRef(hourHeight)
  const didInitScrollRef = useRef(false)
  const isMultiDay = days.length > 1

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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Sticky day header */}
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

      {/* Scrollable grid */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="relative flex" style={{ height: hourHeight * DAY_HOURS }}>
          {/* Hour labels */}
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

          {/* Day columns */}
          {days.map((day) => {
            const dayEvents = eventsForDay(events, day)
            const layouts = layoutOverlappingEvents(dayEvents)

            return (
              <div
                key={day.toISOString()}
                className="relative min-w-0 flex-1 border-r border-navy/6 last:border-r-0"
              >
                {/* Hour grid lines */}
                {HOURS.map((hour) => (
                  <div key={hour} className="relative" style={{ height: hourHeight }}>
                    <div className="absolute inset-x-0 top-0 border-t border-navy/6" />
                    <div
                      className="absolute inset-x-0 border-t border-dashed border-navy/4"
                      style={{ top: hourHeight / 2 }}
                    />
                  </div>
                ))}

                {/* Now line */}
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

                {/* Events */}
                {layouts.map(({ event, column, totalColumns }) => (
                  <EventBlock
                    key={event.id}
                    event={event}
                    top={eventTopPercent(event.start, day)}
                    height={eventHeightPercent(event.start, event.end, day)}
                    left={(column / totalColumns) * 100}
                    width={100 / totalColumns}
                    selected={selectedEventId === event.id}
                    compact={isMultiDay}
                    onClick={() => onEventClick?.(event)}
                  />
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
