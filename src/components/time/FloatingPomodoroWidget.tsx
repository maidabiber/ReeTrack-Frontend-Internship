import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { useTimer } from '../../hooks/useTimer'
import { usePomodoro } from '../../hooks/usePomodoro'
import { formatDurationHms } from '../../lib/formatDuration'
import { Icon } from '../ui/Icon'

const POSITION_KEY = 'reetrack.pomodoro.widget-position'
const COLLAPSED_KEY = 'reetrack.pomodoro.widget-collapsed'
const EDGE_GAP = 12

type Position = { x: number; y: number }
type PhaseCue = { message: string; token: string }

function loadPosition(): Position | null {
  try {
    const raw = localStorage.getItem(POSITION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Position>
    if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
      return { x: parsed.x, y: parsed.y }
    }
  } catch {
    /* ignore malformed storage */
  }
  return null
}

function loadCollapsed(): boolean {
  return localStorage.getItem(COLLAPSED_KEY) === '1'
}

const PHASE_CUE_MS = 4500

/**
 * Non-intrusive floating readout that follows you across the app while a
 * Pomodoro-enabled timer runs. Drag it anywhere, collapse it to a pill, and its
 * spot is remembered between sessions. It only shows up when there's something
 * to show, so it never gets in the way when you're not using Pomodoro.
 */
export function FloatingPomodoroWidget() {
  const { isRunning, elapsedSeconds } = useTimer()
  const { prefs, phase, countdownLabel, progress } = usePomodoro()

  const cardRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<Position | null>(() => loadPosition())
  const [collapsed, setCollapsed] = useState<boolean>(() => loadCollapsed())
  const [dragging, setDragging] = useState(false)
  const [seenPhase, setSeenPhase] = useState<typeof phase>(null)
  /** Short cue shown right after a phase change (e.g. "Time for a break"). */
  const [phaseCue, setPhaseCue] = useState<PhaseCue | null>(null)

  const dragOffsetRef = useRef<Position>({ x: 0, y: 0 })
  const sizeRef = useRef({ w: 0, h: 0 })
  const movedRef = useRef(false)

  const active = prefs.enabled && isRunning && phase != null

  if (!active && (seenPhase !== null || phaseCue !== null)) {
    setSeenPhase(null)
    setPhaseCue(null)
  } else if (active && phase != null && phase !== seenPhase) {
    const previous = seenPhase
    setSeenPhase(phase)
    if (previous != null) {
      setPhaseCue({
        message: phase === 'break' ? 'Time for a break' : 'Back to focus',
        token: `${previous}-${phase}`,
      })
    }
  }

  // Clear the short focus cue after a moment; break keeps its steady-state message.
  useEffect(() => {
    if (!phaseCue) return
    const token = phaseCue.token
    const timeoutId = window.setTimeout(() => {
      setPhaseCue((current) => (current?.token === token ? null : current))
    }, PHASE_CUE_MS)
    return () => window.clearTimeout(timeoutId)
  }, [phaseCue])

  const clampToViewport = useCallback((x: number, y: number): Position => {
    const maxX = Math.max(EDGE_GAP, window.innerWidth - sizeRef.current.w - EDGE_GAP)
    const maxY = Math.max(EDGE_GAP, window.innerHeight - sizeRef.current.h - EDGE_GAP)
    return {
      x: Math.min(Math.max(EDGE_GAP, x), maxX),
      y: Math.min(Math.max(EDGE_GAP, y), maxY),
    }
  }, [])

  // Default to the bottom-right corner the first time we have measurements.
  useLayoutEffect(() => {
    if (!active || position !== null) return
    const el = cardRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    sizeRef.current = { w: rect.width, h: rect.height }
    setPosition({
      x: window.innerWidth - rect.width - EDGE_GAP,
      y: window.innerHeight - rect.height - EDGE_GAP,
    })
  }, [active, position, collapsed])

  // Keep it on-screen when the window shrinks or the layout changes size.
  useEffect(() => {
    if (!active) return
    const handleResize = () => {
      const el = cardRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      sizeRef.current = { w: rect.width, h: rect.height }
      setPosition((current) => (current ? clampToViewport(current.x, current.y) : current))
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [active, clampToViewport])

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const el = cardRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    sizeRef.current = { w: rect.width, h: rect.height }
    dragOffsetRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    movedRef.current = false
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    movedRef.current = true
    const next = clampToViewport(
      event.clientX - dragOffsetRef.current.x,
      event.clientY - dragOffsetRef.current.y,
    )
    setPosition(next)
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    setDragging(false)
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    setPosition((current) => {
      if (current) localStorage.setItem(POSITION_KEY, JSON.stringify(current))
      return current
    })
  }

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current
      localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
      return next
    })
  }

  if (!active) return null

  const isBreak = phase === 'break'
  const label = isBreak ? 'Break' : 'Focus'
  const accentText = isBreak ? 'text-brand-hi' : 'text-brand'
  const accentDot = isBreak ? 'bg-brand-hi' : 'bg-brand'
  const accentBar = isBreak ? 'bg-brand-hi' : 'bg-brand-gradient'
  const clampedProgress = Math.min(1, Math.max(0, progress ?? 0))
  // During break keep the rest cue visible; after a focus resume show a short cue.
  const statusMessage =
    phaseCue?.message ?? (isBreak ? 'Time for a break' : null)
  const statusAria = statusMessage ?? label
  const renderCollapsed = collapsed && statusMessage == null

  // Hidden until the corner is computed so it never flashes in the top-left.
  const style = position
    ? { left: `${position.x}px`, top: `${position.y}px` }
    : { left: '-9999px', top: '-9999px' }

  return createPortal(
    <div
      ref={cardRef}
      className={`fixed z-40 select-none rounded-2xl border border-navy/[0.08] bg-white/95 shadow-modal backdrop-blur ${
        dragging ? 'cursor-grabbing' : ''
      }`}
      style={style}
      role="status"
      aria-live="polite"
      aria-label={`Pomodoro ${statusAria}, ${countdownLabel ?? ''} remaining`}
    >
      {renderCollapsed ? (
        <div
          className="flex cursor-grab items-center gap-2.5 px-3 py-2"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
        >
          <span className={`h-2 w-2 flex-shrink-0 rounded-full ${accentDot}`} aria-hidden="true" />
          <span className={`font-mono text-sm font-medium tabular-nums ${accentText}`}>
            {countdownLabel}
          </span>
          <button
            type="button"
            title="Expand"
            aria-label="Expand Pomodoro widget"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={toggleCollapsed}
            className="ml-0.5 flex size-6 items-center justify-center rounded-md text-navy/40 transition-colors hover:bg-navy/[0.04] hover:text-navy"
          >
            <Icon name="chevron-down" className="h-3.5 w-3.5 rotate-180" />
          </button>
        </div>
      ) : (
        <div className="w-[15rem]">
          <div
            className="flex cursor-grab items-center justify-between gap-2 px-3.5 pt-2.5 pb-1.5"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
          >
            <div className="flex items-center gap-1.5">
              <Icon name="timer" className="h-3.5 w-3.5 text-navy/35" />
              <span className="font-display text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-navy/40">
                Pomodoro
              </span>
            </div>
            <button
              type="button"
              title="Collapse"
              aria-label="Collapse Pomodoro widget"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={toggleCollapsed}
              className="flex size-6 items-center justify-center rounded-md text-navy/40 transition-colors hover:bg-navy/[0.04] hover:text-navy"
            >
              <Icon name="chevron-down" className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="px-3.5 pb-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className={`font-display text-sm font-semibold tracking-tight ${accentText}`}>
                {label}
              </span>
              <span className="font-mono text-xs tabular-nums text-navy/40">
                {formatDurationHms(elapsedSeconds)}
              </span>
            </div>

            {statusMessage ? (
              <p className={`mt-0.5 font-display text-xs font-medium ${accentText}`}>
                {statusMessage}
              </p>
            ) : null}

            <div className={`mt-1 font-mono text-2xl font-light tabular-nums tracking-tight ${accentText}`}>
              {countdownLabel}
            </div>

            <div className="mt-2 h-px w-full bg-navy/[0.08]" aria-hidden="true">
              <div
                className={`h-px transition-[width] duration-1000 ease-linear ${accentBar}`}
                style={{ width: `${clampedProgress * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}
