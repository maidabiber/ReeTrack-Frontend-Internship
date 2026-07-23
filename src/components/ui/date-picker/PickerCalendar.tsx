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
import { CALENDAR_CELL_CLASS } from './fieldStyles'

type PickerCalendarProps = {
  focusedValue?: DateValue | null
  onFocusChange?: (value: DateValue) => void
}

export function PickerCalendar({ focusedValue, onFocusChange }: PickerCalendarProps) {
  return (
    <Calendar focusedValue={focusedValue ?? undefined} onFocusChange={onFocusChange}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Button
          slot="previous"
          className="flex size-8 items-center justify-center rounded-md text-navy/60 outline-none hover:bg-surface-muted"
        >
          ‹
        </Button>
        <Heading className="font-display text-sm font-semibold text-navy" />
        <Button
          slot="next"
          className="flex size-8 items-center justify-center rounded-md text-navy/60 outline-none hover:bg-surface-muted"
        >
          ›
        </Button>
      </div>

      <CalendarGrid className="border-separate border-spacing-1">
        <CalendarGridHeader>
          {(day) => (
            <CalendarHeaderCell className="pb-1 text-center text-xs font-semibold uppercase tracking-wide text-navy/40">
              {day}
            </CalendarHeaderCell>
          )}
        </CalendarGridHeader>
        <CalendarGridBody>
          {(date) => <CalendarCell date={date} className={CALENDAR_CELL_CLASS} />}
        </CalendarGridBody>
      </CalendarGrid>
    </Calendar>
  )
}
