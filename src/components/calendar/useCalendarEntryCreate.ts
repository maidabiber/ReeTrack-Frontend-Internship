import { useCallback, useEffect, useRef, useState } from 'react'
import {
  clampEventToDay,
  dateAtDayMinutes,
  minutesFromPointerY,
  snapMinutes,
  startOfDay,
} from './dateUtils'

const MOVE_THRESHOLD_PX = 5
const MIN_SNAPPED_DURATION_MINUTES = 15
const MIN_FREE_DURATION_MINUTES = 1
const MINUTES_PER_DAY = 24 * 60

export interface CreatePreview {
  day: Date
  start: Date
  end: Date
}

interface UseCalendarEntryCreateOptions {
  hourHeight: number
  onEventCreate?: (start: Date, end: Date) => void
  disabled?: boolean
}

interface CreateSession {
  pointerId: number
  day: Date
  columnEl: HTMLElement
  originY: number
  originMinutes: number
  moved: boolean
}

function snapPointerMinutes(minutes: number, altKey: boolean): number {
  const snapped = altKey ? Math.round(minutes) : snapMinutes(minutes, 15)
  return Math.max(0, Math.min(MINUTES_PER_DAY, snapped))
}

function rangeFromPointers(
  day: Date,
  originMinutes: number,
  currentMinutes: number,
  altKey: boolean,
): CreatePreview {
  const minDuration = altKey ? MIN_FREE_DURATION_MINUTES : MIN_SNAPPED_DURATION_MINUTES
  let startMinutes = snapPointerMinutes(originMinutes, altKey)
  let endMinutes = snapPointerMinutes(currentMinutes, altKey)

  if (endMinutes < startMinutes) {
    ;[startMinutes, endMinutes] = [endMinutes, startMinutes]
  }

  if (endMinutes - startMinutes < minDuration) {
    if (currentMinutes >= originMinutes) {
      endMinutes = Math.min(MINUTES_PER_DAY, startMinutes + minDuration)
      if (endMinutes - startMinutes < minDuration) {
        startMinutes = Math.max(0, endMinutes - minDuration)
      }
    } else {
      startMinutes = Math.max(0, endMinutes - minDuration)
      if (endMinutes - startMinutes < minDuration) {
        endMinutes = Math.min(MINUTES_PER_DAY, startMinutes + minDuration)
      }
    }
  }

  const start = dateAtDayMinutes(day, startMinutes)
  const end = dateAtDayMinutes(day, endMinutes)
  const clamped = clampEventToDay(start, end, day)

  return {
    day,
    start: clamped?.start ?? start,
    end: clamped?.end ?? end,
  }
}

export function useCalendarEntryCreate({
  hourHeight,
  onEventCreate,
  disabled = false,
}: UseCalendarEntryCreateOptions) {
  const [createPreview, setCreatePreview] = useState<CreatePreview | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const sessionRef = useRef<CreateSession | null>(null)
  const createPreviewRef = useRef<CreatePreview | null>(null)
  const previewRafRef = useRef<number | null>(null)

  const cancelPreviewRaf = useCallback(() => {
    if (previewRafRef.current !== null) {
      cancelAnimationFrame(previewRafRef.current)
      previewRafRef.current = null
    }
  }, [])

  const updateCreatePreview = useCallback(
    (preview: CreatePreview | null) => {
      cancelPreviewRaf()
      createPreviewRef.current = preview
      setCreatePreview(preview)
    },
    [cancelPreviewRaf],
  )

  const scheduleCreatePreview = useCallback((preview: CreatePreview) => {
    createPreviewRef.current = preview
    if (previewRafRef.current !== null) return

    previewRafRef.current = requestAnimationFrame(() => {
      previewRafRef.current = null
      setCreatePreview(createPreviewRef.current)
    })
  }, [])

  const windowListenersRef = useRef<{
    onMove: (event: PointerEvent) => void
    onUp: (event: PointerEvent) => void
    onCancel: (event: PointerEvent) => void
  } | null>(null)

  const removeWindowListeners = useCallback(() => {
    const listeners = windowListenersRef.current
    if (!listeners) return

    window.removeEventListener('pointermove', listeners.onMove)
    window.removeEventListener('pointerup', listeners.onUp)
    window.removeEventListener('pointercancel', listeners.onCancel)
    windowListenersRef.current = null
  }, [])

  const clearSession = useCallback(() => {
    cancelPreviewRaf()
    removeWindowListeners()
    sessionRef.current = null
    setIsCreating(false)
    updateCreatePreview(null)
  }, [cancelPreviewRaf, removeWindowListeners, updateCreatePreview])

  const finishSession = useCallback(
    () => {
      const preview = createPreviewRef.current
      const shouldCreate = sessionRef.current?.moved && preview !== null

      clearSession()

      if (shouldCreate && preview) {
        onEventCreate?.(preview.start, preview.end)
      }
    },
    [clearSession, onEventCreate],
  )

  const attachWindowListeners = useCallback(
    () => {
      removeWindowListeners()

      const onMove = (event: PointerEvent) => {
        const active = sessionRef.current
        if (!active || active.pointerId !== event.pointerId) return

        const deltaY = Math.abs(event.clientY - active.originY)
        if (!active.moved && deltaY < MOVE_THRESHOLD_PX) return

        event.preventDefault()
        active.moved = true

        const columnTop = active.columnEl.getBoundingClientRect().top
        const currentMinutes = minutesFromPointerY(event.clientY, columnTop, hourHeight)
        scheduleCreatePreview(
          rangeFromPointers(active.day, active.originMinutes, currentMinutes, event.altKey),
        )
      }

      const onUp = (event: PointerEvent) => {
        const active = sessionRef.current
        if (!active || active.pointerId !== event.pointerId) return
        finishSession()
      }

      const onCancel = (event: PointerEvent) => {
        const active = sessionRef.current
        if (!active || active.pointerId !== event.pointerId) return
        clearSession()
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onCancel)
      windowListenersRef.current = { onMove, onUp, onCancel }
    },
    [clearSession, finishSession, hourHeight, removeWindowListeners, scheduleCreatePreview],
  )

  const handleColumnPointerDown = useCallback(
    (day: Date, columnEl: HTMLElement, pointerEvent: React.PointerEvent) => {
      if (disabled || !onEventCreate) return
      if (pointerEvent.button !== 0) return

      pointerEvent.preventDefault()

      const columnTop = columnEl.getBoundingClientRect().top
      const originMinutes = minutesFromPointerY(pointerEvent.clientY, columnTop, hourHeight)
      const dayStart = startOfDay(day)

      const session: CreateSession = {
        pointerId: pointerEvent.pointerId,
        day: dayStart,
        columnEl,
        originY: pointerEvent.clientY,
        originMinutes,
        moved: false,
      }

      sessionRef.current = session
      setIsCreating(true)
      updateCreatePreview(null)
      attachWindowListeners()
    },
    [attachWindowListeners, disabled, hourHeight, onEventCreate, updateCreatePreview],
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && sessionRef.current) {
        clearSession()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      removeWindowListeners()
      cancelPreviewRaf()
    }
  }, [cancelPreviewRaf, clearSession, removeWindowListeners])

  return {
    createPreview,
    isCreating,
    handleColumnPointerDown,
  }
}
