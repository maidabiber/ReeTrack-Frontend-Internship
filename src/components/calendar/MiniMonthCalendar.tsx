import type { CalendarEvent } from './types'
import {
  addDays,
  eventsForDay,
  formatMonthYear,
  getMonthGridDays,
  isSameDay,
  isToday,
  startOfMonth,
} from './dateUtils'
import { Icon } from '../ui/Icon'

interface MiniMonthCalendarProps {
  displayMonth: Date
  selectedDate: Date
  events: CalendarEvent[]
  onMonthChange: (month: Date) => void
  onDateSelect: (date: Date) => void
}

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function MiniMonthCalendar({
  displayMonth,
  selectedDate,
  events,
  onMonthChange,
  onDateSelect,
}: MiniMonthCalendarProps) {
  const gridDays = getMonthGridDays(displayMonth)
  const currentMonth = displayMonth.getMonth()

  return (
    <div className="px-4 pt-4 pb-3">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(addDays(startOfMonth(displayMonth), -1))}
          className="flex h-7 w-7 items-center justify-center rounded-[8px] text-navy/50 hover:bg-surface-muted hover:text-navy"
          aria-label="Previous month"
        >
          <Icon name="chevron-right" className="h-3.5 w-3.5 rotate-180" />
        </button>
        <span className="font-display text-[13px] font-bold text-navy">
          {formatMonthYear(displayMonth)}
        </span>
        <button
          type="button"
          onClick={() => onMonthChange(addDays(startOfMonth(displayMonth), 32))}
          className="flex h-7 w-7 items-center justify-center rounded-[8px] text-navy/50 hover:bg-surface-muted hover:text-navy"
          aria-label="Next month"
        >
          <Icon name="chevron-right" className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {WEEKDAY_LABELS.map((label, i) => (
          <div
            key={`${label}-${i}`}
            className="py-1 text-center text-[10px] font-semibold text-navy/40"
          >
            {label}
          </div>
        ))}

        {gridDays.map((day) => {
          const inMonth = day.getMonth() === currentMonth
          const selected = isSameDay(day, selectedDate)
          const today = isToday(day)
          const hasEvents = eventsForDay(events, day).length > 0

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onDateSelect(day)}
              className={`relative mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-medium transition-colors ${
                selected
                  ? 'bg-navy text-cream'
                  : today
                    ? 'ring-1 ring-navy/30 text-navy'
                    : inMonth
                      ? 'text-navy hover:bg-surface-muted'
                      : 'text-navy/25 hover:bg-surface-muted'
              }`}
            >
              {day.getDate()}
              {hasEvents && !selected && (
                <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-brand" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
