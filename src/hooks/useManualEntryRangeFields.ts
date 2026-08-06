import { useCallback, useMemo, useState } from 'react'
import type { CalendarDate } from '@internationalized/date'
import { dateToCalendarDate } from '../lib/calendarDate'
import {
  applyEndTimeChange,
  applyStartDateChange,
  applyStartTimeChange,
} from '../lib/manualEntryRangeEdits'
import { formatTimeFromDate } from '../lib/timeInputUtils'

type UseManualEntryRangeFieldsOptions = {
  start: Date
  end: Date
  onApplyChange: (type: 'start' | 'end', date: Date) => void
  /** Modals sync end with start; tracker does not. Default true. */
  syncEndWithStart?: boolean
}

export function useManualEntryRangeFields({
  start,
  end,
  onApplyChange,
  syncEndWithStart = true,
}: UseManualEntryRangeFieldsOptions) {
  const [startTimeInput, setStartTimeInput] = useState(() => formatTimeFromDate(start))
  const [endTimeInput, setEndTimeInput] = useState(() => formatTimeFromDate(end))
  const [syncedStart, setSyncedStart] = useState(start)
  const [syncedEnd, setSyncedEnd] = useState(end)

  // Keep string inputs aligned when parent start/end change externally (e.g. template apply).
  if (start !== syncedStart || end !== syncedEnd) {
    setSyncedStart(start)
    setSyncedEnd(end)
    setStartTimeInput(formatTimeFromDate(start))
    setEndTimeInput(formatTimeFromDate(end))
  }

  const startDateCalendarValue = useMemo(() => dateToCalendarDate(start), [start])

  const handleStartDateChange = useCallback(
    (calendarDate: CalendarDate) => {
      const next = applyStartDateChange({ start, end }, calendarDate, {
        syncEnd: syncEndWithStart,
      })
      onApplyChange('start', next.start)
      if (syncEndWithStart) {
        onApplyChange('end', next.end)
      }
    },
    [start, end, onApplyChange, syncEndWithStart],
  )

  const handleStartTimeChange = useCallback(
    (timeString: string) => {
      setStartTimeInput(timeString)
      const next = applyStartTimeChange({ start, end }, timeString, {
        syncEnd: syncEndWithStart,
      })
      if (!next) return
      onApplyChange('start', next.start)
      if (syncEndWithStart) {
        onApplyChange('end', next.end)
      }
    },
    [start, end, onApplyChange, syncEndWithStart],
  )

  const handleEndTimeChange = useCallback(
    (timeString: string) => {
      setEndTimeInput(timeString)
      const next = applyEndTimeChange({ start, end }, timeString)
      if (!next) return
      onApplyChange('end', next.end)
    },
    [start, end, onApplyChange],
  )

  return {
    startDateCalendarValue,
    startTimeInput,
    endTimeInput,
    handleStartDateChange,
    handleStartTimeChange,
    handleEndTimeChange,
  }
}
