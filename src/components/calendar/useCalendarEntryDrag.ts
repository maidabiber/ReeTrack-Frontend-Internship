import { useCallback, useEffect, useRef, useState } from 'react'
import type { CalendarEvent } from './types'
import {
  clampEventToDay,
  dateAtDayMinutes,
  findColumnAtPointer,
  minutesSinceMidnight,
  moveEventToDay,
  snapMinutes,
  startOfDay,
} from './dateUtils'

const LONG_PRESS_MS = 400
const MOVE_CANCEL_THRESHOLD_PX = 5

export interface DragPreview {
  event: CalendarEvent
  start: Date
  end: Date
  day: Date
  ctrlKey: boolean
}

export interface ColumnRect {
  day: Date
  left: number
  right: number
  top: number
}

interface UseCalendarEntryDragOptions {
  allowHorizontal: boolean
  hourHeight: number
  getColumnRects: () => ColumnRect[]
  onEventClick?: (event: CalendarEvent) => void
  onEventMove?: (event: CalendarEvent, newStart: Date, newEnd: Date) => void
  onEventDuplicate?: (event: CalendarEvent, newStart: Date, newEnd: Date) => void
  isEventEditable?: (event: CalendarEvent) => boolean
}

interface PointerSession {
  event: CalendarEvent
  pointerId: number
  originX: number
  originY: number
  originStart: Date
  originEnd: Date
  originDay: Date
  columnRects: ColumnRect[]
  longPressTimer: ReturnType<typeof setTimeout> | null
  isDragging: boolean
  moved: boolean
  ctrlKey: boolean
}

export function useCalendarEntryDrag({
  allowHorizontal,
  hourHeight,
  getColumnRects,
  onEventClick,
  onEventMove,
  onEventDuplicate,
  isEventEditable,
}: UseCalendarEntryDragOptions) {
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null)
  const sessionRef = useRef<PointerSession | null>(null)
  const dragPreviewRef = useRef<DragPreview | null>(null)
  const previewRafRef = useRef<number | null>(null)
  const getColumnRectsRef = useRef(getColumnRects)
  const windowListenersRef = useRef<{
    onMove: (event: PointerEvent) => void
    onUp: (event: PointerEvent) => void
    onCancel: (event: PointerEvent) => void
  } | null>(null)

  useEffect(() => {
    getColumnRectsRef.current = getColumnRects
  }, [getColumnRects])

  const cancelPreviewRaf = useCallback(() => {
    if (previewRafRef.current !== null) {
      cancelAnimationFrame(previewRafRef.current)
      previewRafRef.current = null
    }
  }, [])

  const updateDragPreview = useCallback(
    (preview: DragPreview | null) => {
      cancelPreviewRaf()
      dragPreviewRef.current = preview
      setDragPreview(preview)
    },
    [cancelPreviewRaf],
  )

  const scheduleDragPreview = useCallback(
    (preview: DragPreview) => {
      dragPreviewRef.current = preview
      if (previewRafRef.current !== null) return

      previewRafRef.current = requestAnimationFrame(() => {
        previewRafRef.current = null
        setDragPreview(dragPreviewRef.current)
      })
    },
    [],
  )

  const refreshColumnRects = useCallback(() => {
    const session = sessionRef.current
    if (!session?.isDragging) return
    session.columnRects = getColumnRectsRef.current()
  }, [])

  const removeWindowListeners = useCallback(() => {
    const listeners = windowListenersRef.current
    if (!listeners) return

    window.removeEventListener('pointermove', listeners.onMove)
    window.removeEventListener('pointerup', listeners.onUp)
    window.removeEventListener('pointercancel', listeners.onCancel)
    windowListenersRef.current = null
  }, [])

  const clearSession = useCallback(() => {
    const session = sessionRef.current
    if (session?.longPressTimer) {
      clearTimeout(session.longPressTimer)
    }
    cancelPreviewRaf()
    removeWindowListeners()
    sessionRef.current = null
    updateDragPreview(null)
  }, [cancelPreviewRaf, removeWindowListeners, updateDragPreview])

  const resolveTargetDay = useCallback(
    (session: PointerSession, clientX: number) => {
      if (!allowHorizontal) return session.originDay

      const column = findColumnAtPointer(clientX, session.columnRects)
      return column?.day ?? session.originDay
    },
    [allowHorizontal],
  )

  const computePreview = useCallback(
    (session: PointerSession, clientX: number, clientY: number, altKey: boolean, ctrlKey: boolean): DragPreview | null => {
      const targetDay = resolveTargetDay(session, clientX)

      const deltaY = clientY - session.originY
      const deltaMinutes = (deltaY / hourHeight) * 60
      const pointerMinutes = minutesSinceMidnight(session.originStart) + deltaMinutes
      const snappedMinutes = altKey ? Math.round(pointerMinutes) : snapMinutes(pointerMinutes, 15)

      let start = dateAtDayMinutes(session.originDay, snappedMinutes)
      let end = new Date(start.getTime() + (session.originEnd.getTime() - session.originStart.getTime()))

      if (allowHorizontal) {
        ;({ start, end } = moveEventToDay(start, end, targetDay))
      }

      const clamped = clampEventToDay(start, end, targetDay)
      if (!clamped) return dragPreviewRef.current

      return {
        event: session.event,
        start: clamped.start,
        end: clamped.end,
        day: targetDay,
        ctrlKey,
      }
    },
    [allowHorizontal, hourHeight, resolveTargetDay],
  )

  const finishSession = useCallback(
    (session: PointerSession) => {
      if (session.longPressTimer) {
        clearTimeout(session.longPressTimer)
        session.longPressTimer = null
      }

      if (session.isDragging && session.moved) {
        const preview = dragPreviewRef.current
        if (preview) {
          const timesChanged =
            preview.start.getTime() !== session.originStart.getTime() ||
            preview.end.getTime() !== session.originEnd.getTime()

          if (timesChanged) {
            if (session.ctrlKey) {
              onEventDuplicate?.(session.event, preview.start, preview.end)
            } else {
              onEventMove?.(session.event, preview.start, preview.end)
            }
          }
        }
      } else if (!session.isDragging && !session.moved) {
        onEventClick?.(session.event)
      }

      clearSession()
    },
    [clearSession, onEventClick, onEventDuplicate, onEventMove],
  )

  const attachWindowListeners = useCallback(
    () => {
      removeWindowListeners()

      const onMove = (event: PointerEvent) => {
        const active = sessionRef.current
        if (!active || active.pointerId !== event.pointerId) return

        const deltaX = Math.abs(event.clientX - active.originX)
        const deltaY = Math.abs(event.clientY - active.originY)

        if (!active.isDragging && (deltaX > MOVE_CANCEL_THRESHOLD_PX || deltaY > MOVE_CANCEL_THRESHOLD_PX)) {
          if (active.longPressTimer) {
            clearTimeout(active.longPressTimer)
            active.longPressTimer = null
          }
        }

        if (!active.isDragging) return

        event.preventDefault()
        active.moved = true
        active.ctrlKey = event.ctrlKey

        const preview = computePreview(active, event.clientX, event.clientY, event.altKey, active.ctrlKey)
        if (preview) {
          scheduleDragPreview(preview)
        }
      }

      const onUp = (event: PointerEvent) => {
        const active = sessionRef.current
        if (!active || active.pointerId !== event.pointerId) return
        finishSession(active)
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
    [clearSession, computePreview, finishSession, removeWindowListeners, scheduleDragPreview],
  )

  const handlePointerDown = useCallback(
    (event: CalendarEvent, pointerEvent: React.PointerEvent) => {
      if (!isEventEditable?.(event)) return

      pointerEvent.preventDefault()

      const session: PointerSession = {
        event,
        pointerId: pointerEvent.pointerId,
        originX: pointerEvent.clientX,
        originY: pointerEvent.clientY,
        originStart: event.start,
        originEnd: event.end,
        originDay: startOfDay(event.start),
        columnRects: [],
        longPressTimer: null,
        isDragging: false,
        moved: false,
        ctrlKey: false,
      }

      session.longPressTimer = setTimeout(() => {
        if (!sessionRef.current || sessionRef.current !== session) return
        session.isDragging = true
        session.columnRects = getColumnRectsRef.current()
        updateDragPreview({
          event,
          start: event.start,
          end: event.end,
          day: session.originDay,
          ctrlKey: false,
        })
      }, LONG_PRESS_MS)

      sessionRef.current = session
      attachWindowListeners()
    },
    [attachWindowListeners, isEventEditable, updateDragPreview],
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && sessionRef.current?.isDragging) {
        clearSession()
        return
      }

      if ((event.key === 'Control' || event.key === 'Meta') && sessionRef.current?.isDragging) {
        const preview = dragPreviewRef.current
        if (preview && !preview.ctrlKey) {
          scheduleDragPreview({ ...preview, ctrlKey: true })
        }
      }
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if ((event.key === 'Control' || event.key === 'Meta') && sessionRef.current?.isDragging) {
        const preview = dragPreviewRef.current
        if (preview && preview.ctrlKey) {
          scheduleDragPreview({ ...preview, ctrlKey: false })
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      removeWindowListeners()
      cancelPreviewRaf()
    }
  }, [cancelPreviewRaf, clearSession, removeWindowListeners, scheduleDragPreview])

  const isDragging = dragPreview !== null

  return {
    dragPreview,
    isDragging,
    isDuplicateDrag: isDragging && dragPreview.ctrlKey,
    handlePointerDown,
    refreshColumnRects,
  }
}
