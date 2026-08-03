import type { CalendarEvent } from './types'
import { eventsForDay, formatWeekday, getWeekDays, isSameDay, isToday, toDateKey } from './dateUtils'

interface WeekStripProps {
  selectedDate: Date
  events: CalendarEvent[]
  holidaysByDate?: ReadonlyMap<string, string>
  onDateSelect: (date: Date) => void
}

/**
 * Compact Mon–Sun day picker shown above the day grid below `md`, where there's no
 * room for the full week view. Mirrors MiniMonthCalendar's selected/today/holiday-dot
 * treatment so the two date pickers read as one system.
 */
export function WeekStrip({ selectedDate, events, holidaysByDate, onDateSelect }: WeekStripProps) {
  const days = getWeekDays(selectedDate)

  return (
    <div className="grid grid-cols-7 gap-1 border-b border-navy/8 px-2 py-2">
      {days.map((day) => {
        const selected = isSameDay(day, selectedDate)
        const today = isToday(day)
        const hasEvents = eventsForDay(events, day).length > 0
        const holidayName = holidaysByDate?.get(toDateKey(day))
        const hasHoliday = !!holidayName

        return (
          <button
            key={day.toISOString()}
            type="button"
            title={holidayName}
            onClick={() => onDateSelect(day)}
            className={`relative flex min-h-10 flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 transition-colors ${
              selected
                ? 'bg-navy text-cream'
                : today
                  ? 'ring-1 ring-navy/30 text-navy'
                  : 'text-navy hover:bg-surface-muted'
            }`}
          >
            <span
              className={`text-[10px] font-semibold uppercase tracking-wide ${
                selected ? 'text-cream/70' : 'text-navy/45'
              }`}
            >
              {formatWeekday(day).charAt(0)}
            </span>
            <span className="font-display text-sm font-bold">{day.getDate()}</span>
            {!selected && (hasEvents || hasHoliday) ? (
              <span className="absolute bottom-1 flex items-center gap-0.5">
                {hasHoliday ? (
                  <span className="h-1 w-1 rounded-full bg-[var(--color-brand-hi)]" />
                ) : null}
                {hasEvents ? <span className="h-1 w-1 rounded-full bg-brand" /> : null}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
