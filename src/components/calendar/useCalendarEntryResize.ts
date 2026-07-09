import { useCallback, useEffect, useRef, useState } from 'react'
import type { CalendarEvent } from './types'
import { resizeEventEdge, startOfDay, type ResizeEdge } from './dateUtils'

export interface ResizePreview {
  event: CalendarEvent
  start: Date
  end: Date
  day: Date
}

interface UseCalendarEntryResizeOptions {
  hourHeight: number
  onEventResize?: (event: CalendarEvent, newStart: Date, newEnd: Date) => void
  isEventEditable?: (event: CalendarEvent) => boolean
  disabled?: boolean
}

interface ResizeSession {
  event: CalendarEvent
  edge: ResizeEdge
  pointerId: number
  originY: number
  originStart: Date
  originEnd: Date
  day: Date
}

export function useCalendarEntryResize({
  hourHeight,
  onEventResize,
  isEventEditable,
  disabled = false,
}: UseCalendarEntryResizeOptions) {
  const [resizePreview, setResizePreview] = useState<ResizePreview | null>(null)
  const sessionRef = useRef<ResizeSession | null>(null)
  const resizePreviewRef = useRef<ResizePreview | null>(null)
  const previewRafRef = useRef<number | null>(null)

  const cancelPreviewRaf = useCallback(() => {
    if (previewRafRef.current !== null) {
      cancelAnimationFrame(previewRafRef.current)
      previewRafRef.current = null
    }
  }, [])

  const updateResizePreview = useCallback(
    (preview: ResizePreview | null) => {
      cancelPreviewRaf()
      resizePreviewRef.current = preview
      setResizePreview(preview)
    },
    [cancelPreviewRaf],
  )

  const scheduleResizePreview = useCallback((preview: ResizePreview) => {
    resizePreviewRef.current = preview
    if (previewRafRef.current !== null) return

    previewRafRef.current = requestAnimationFrame(() => {
      previewRafRef.current = null
      setResizePreview(resizePreviewRef.current)
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
    updateResizePreview(null)
  }, [cancelPreviewRaf, removeWindowListeners, updateResizePreview])

  const computeResizePreview = useCallback(
    (session: ResizeSession, clientY: number, altKey: boolean): ResizePreview | null => {
      const deltaY = clientY - session.originY
      const deltaMinutes = (deltaY / hourHeight) * 60

      const resized = resizeEventEdge(
        session.originStart,
        session.originEnd,
        session.day,
        session.edge,
        deltaMinutes,
        altKey,
      )

      if (!resized) return resizePreviewRef.current

      return {
        event: session.event,
        start: resized.start,
        end: resized.end,
        day: session.day,
      }
    },
    [hourHeight],
  )

  const finishSession = useCallback(
    (session: ResizeSession) => {
      const preview = resizePreviewRef.current
      if (preview) {
        const timesChanged =
          preview.start.getTime() !== session.originStart.getTime() ||
          preview.end.getTime() !== session.originEnd.getTime()

        if (timesChanged) {
          onEventResize?.(session.event, preview.start, preview.end)
        }
      }

      clearSession()
    },
    [clearSession, onEventResize],
  )

  const attachWindowListeners = useCallback(
    (session: ResizeSession) => {
      removeWindowListeners()

      const onMove = (event: PointerEvent) => {
        const active = sessionRef.current
        if (!active || active.pointerId !== event.pointerId) return

        event.preventDefault()

        const preview = computeResizePreview(active, event.clientY, event.altKey)
        if (preview) {
          scheduleResizePreview(preview)
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
    [clearSession, computeResizePreview, finishSession, removeWindowListeners, scheduleResizePreview],
  )

  const handleResizePointerDown = useCallback(
    (event: CalendarEvent, edge: ResizeEdge, pointerEvent: React.PointerEvent) => {
      if (disabled || !isEventEditable?.(event)) return

      pointerEvent.preventDefault()
      pointerEvent.stopPropagation()

      const day = startOfDay(event.start)

      const session: ResizeSession = {
        event,
        edge,
        pointerId: pointerEvent.pointerId,
        originY: pointerEvent.clientY,
        originStart: event.start,
        originEnd: event.end,
        day,
      }

      sessionRef.current = session
      updateResizePreview({
        event,
        start: event.start,
        end: event.end,
        day,
      })
      attachWindowListeners(session)
    },
    [attachWindowListeners, disabled, isEventEditable, updateResizePreview],
  )

  const handleResizeStartPointerDown = useCallback(
    (event: CalendarEvent, pointerEvent: React.PointerEvent) => {
      handleResizePointerDown(event, 'start', pointerEvent)
    },
    [handleResizePointerDown],
  )

  const handleResizeEndPointerDown = useCallback(
    (event: CalendarEvent, pointerEvent: React.PointerEvent) => {
      handleResizePointerDown(event, 'end', pointerEvent)
    },
    [handleResizePointerDown],
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

  const isResizing = resizePreview !== null

  return {
    resizePreview,
    isResizing,
    handleResizeStartPointerDown,
    handleResizeEndPointerDown,
  }
}
