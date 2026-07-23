import type { ReactNode } from 'react'
import { PomodoroContext } from './pomodoro'
import { usePomodoroSession } from '../hooks/usePomodoroSession'
import { useTimer } from '../hooks/useTimer'

/**
 * Runs a single Pomodoro session tied to the active timer. Keeping it here (above
 * the router) means chimes, the tab title, and the floating widget share one
 * source of truth instead of every consumer spinning up its own session.
 */
export function PomodoroProvider({ children }: { children: ReactNode }) {
  const { activeTimer, elapsedSeconds, isRunning } = useTimer()

  const value = usePomodoroSession({
    isRunning,
    elapsedSeconds,
    timerId: activeTimer?.id ?? null,
  })

  return <PomodoroContext value={value}>{children}</PomodoroContext>
}
