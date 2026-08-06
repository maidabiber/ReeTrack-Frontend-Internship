import { useRef, useState, type FocusEvent, type KeyboardEvent, type RefObject } from 'react'
import {
  commitHourValue,
  commitMinuteValue,
  parseHh,
  parseMm,
  sanitizeTimeDigits,
} from '../../../lib/timeInputUtils'

type UseTimeSegmentStateOptions = {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
}

export type TimeSegmentState = {
  displayHh: string
  displayMm: string
  timeError: boolean
  hhRef: RefObject<HTMLInputElement | null>
  mmRef: RefObject<HTMLInputElement | null>
  onHhChange: (raw: string) => void
  onMmChange: (raw: string) => void
  onHhBlur: (raw: string) => void
  onMmBlur: (raw: string) => void
  onHhKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
  onMmKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
  onSegmentFocus: (e: FocusEvent<HTMLInputElement>) => void
  focusHour: () => void
}

export function useTimeSegmentState({
  value,
  onChange,
  onBlur,
}: UseTimeSegmentStateOptions): TimeSegmentState {
  const [pendingHh, setPendingHh] = useState<string | null>(null)
  const [pendingMm, setPendingMm] = useState<string | null>(null)
  const [timeError, setTimeError] = useState(false)

  const hhRef = useRef<HTMLInputElement>(null)
  const mmRef = useRef<HTMLInputElement>(null)

  const displayHh = pendingHh ?? parseHh(value)
  const displayMm = pendingMm ?? parseMm(value)

  function flashError() {
    setTimeError(true)
    window.setTimeout(() => setTimeError(false), 600)
  }

  function onHhChange(raw: string) {
    const digits = sanitizeTimeDigits(raw)
    setPendingHh(digits)
    if (digits.length === 2) {
      mmRef.current?.focus()
      mmRef.current?.select()
    }
  }

  function onMmChange(raw: string) {
    setPendingMm(sanitizeTimeDigits(raw))
  }

  function onHhBlur(raw: string) {
    const result = commitHourValue(raw, value)
    if (result.invalid) flashError()
    setPendingHh(null)
    onChange(result.time)
    onBlur?.()
  }

  function onMmBlur(raw: string) {
    const result = commitMinuteValue(raw, value)
    if (result.invalid) flashError()
    setPendingMm(null)
    onChange(result.time)
    onBlur?.()
  }

  function onHhKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') e.currentTarget.blur()
    if (e.key === 'ArrowRight') mmRef.current?.focus()
  }

  function onMmKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') e.currentTarget.blur()
    if (e.key === 'ArrowLeft' && e.currentTarget.selectionStart === 0) {
      hhRef.current?.focus()
      hhRef.current?.select()
    }
    if (e.key === 'Backspace' && displayMm === '') {
      hhRef.current?.focus()
      hhRef.current?.select()
    }
  }

  function onSegmentFocus(e: FocusEvent<HTMLInputElement>) {
    e.target.select()
  }

  function focusHour() {
    hhRef.current?.focus()
    hhRef.current?.select()
  }

  return {
    displayHh,
    displayMm,
    timeError,
    hhRef,
    mmRef,
    onHhChange,
    onMmChange,
    onHhBlur,
    onMmBlur,
    onHhKeyDown,
    onMmKeyDown,
    onSegmentFocus,
    focusHour,
  }
}
