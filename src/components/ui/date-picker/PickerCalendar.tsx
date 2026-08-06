import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  Heading,
} from 'react-aria-components'
import type { DateValue } from 'react-aria-components'
import { cn } from '../../../lib/utils'
import { CALENDAR_CELL_CLASS } from './fieldStyles'

type PickerCalendarProps = {
  focusedValue?: DateValue | null
  onFocusChange?: (value: DateValue) => void
}

export function PickerCalendar({ focusedValue, onFocusChange }: PickerCalendarProps) {
  return (
    <Calendar focusedValue={focusedValue ?? undefined} onFocusChange={onFocusChange}>
      <div className="mb-4 flex items-center justify-between">
        <Heading className="font-display text-[22px] font-semibold tracking-tight text-navy" />
        <div className="flex gap-1">
          <Button
            slot="previous"
            className="grid size-7 place-items-center rounded-full text-navy/50 outline-none hover:bg-surface-muted hover:text-navy"
            aria-label="Previous month"
          >
            ‹
          </Button>
          <Button
            slot="next"
            className="grid size-7 place-items-center rounded-full text-navy/50 outline-none hover:bg-surface-muted hover:text-navy"
            aria-label="Next month"
          >
            ›
          </Button>
        </div>
      </div>

      <CalendarGrid className="w-full border-separate border-spacing-y-1">
        <CalendarGridHeader>
          {(day) => (
            <CalendarHeaderCell className="text-sm text-navy/50" key={day}>
              {day.charAt(0)}
            </CalendarHeaderCell>
          )}
        </CalendarGridHeader>
        <CalendarGridBody>
          {(date) => (
            <CalendarCell
              date={date}
              className={(renderProps) =>
                cn(
                  CALENDAR_CELL_CLASS,
                  renderProps.isToday &&
                    !renderProps.isSelected &&
                    'font-semibold ring-1 ring-inset ring-ink/40',
                )
              }
            />
          )}
        </CalendarGridBody>
      </CalendarGrid>
    </Calendar>
  )
}
