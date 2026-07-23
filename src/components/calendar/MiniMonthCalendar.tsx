import type { CalendarEvent } from './types'
import {
  addDays,
  eventsForDay,
  formatMonthYear,
  getMonthGridDays,
  isSameDay,
  isToday,
  startOfMonth,
  toDateKey,
} from './dateUtils'
import { Icon } from '../ui/Icon'

interface MiniMonthCalendarProps {
  displayMonth: Date
  selectedDate: Date
  events: CalendarEvent[]
  holidaysByDate?: ReadonlyMap<string, string>
  onMonthChange: (month: Date) => void
  onDateSelect: (date: Date) => void
}

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function MiniMonthCalendar({
  displayMonth,
  selectedDate,
  events,
  holidaysByDate,
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
          className="flex h-7 w-7 items-center justify-center rounded-sm text-navy/50 hover:bg-surface-muted hover:text-navy"
          aria-label="Previous month"
        >
          <Icon name="chevron-right" className="h-3.5 w-3.5 rotate-180" />
        </button>
        <span className="font-display text-md font-bold text-navy">
          {formatMonthYear(displayMonth)}
        </span>
        <button
          type="button"
          onClick={() => onMonthChange(addDays(startOfMonth(displayMonth), 32))}
          className="flex h-7 w-7 items-center justify-center rounded-sm text-navy/50 hover:bg-surface-muted hover:text-navy"
          aria-label="Next month"
        >
          <Icon name="chevron-right" className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {WEEKDAY_LABELS.map((label, i) => (
          <div
            key={`${label}-${i}`}
            className="py-1 text-center text-xs font-semibold text-navy/40"
          >
            {label}
          </div>
        ))}

        {gridDays.map((day) => {
          const inMonth = day.getMonth() === currentMonth
          const selected = isSameDay(day, selectedDate)
          const today = isToday(day)
          const hasEvents = eventsForDay(events, day).length > 0
          const holidayName = holidaysByDate?.get(toDateKey(day))
          const hasHoliday = !!holidayName
          const title = holidayName
            ? hasEvents
              ? `${holidayName} · has entries`
              : holidayName
            : undefined

          return (
            <button
              key={day.toISOString()}
              type="button"
              title={title}
              onClick={() => onDateSelect(day)}
              className={`relative mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
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
              {!selected && (hasEvents || hasHoliday) ? (
                <span className="absolute -bottom-0.5 left-1/2 flex -translate-x-1/2 items-center gap-0.5">
                  {hasHoliday ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand-hi)] ring-1 ring-white" />
                  ) : null}
                  {hasEvents ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-brand ring-1 ring-white" />
                  ) : null}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
