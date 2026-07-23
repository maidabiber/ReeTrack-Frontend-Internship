import { useContext } from 'react'
import { PomodoroContext } from '../context/pomodoro'
import type { PomodoroContextValue } from '../context/pomodoro'

/** Access the shared Pomodoro session (phase, countdown, preferences). */
export function usePomodoro(): PomodoroContextValue {
  const context = useContext(PomodoroContext)
  if (context === undefined) {
    throw new Error('usePomodoro must be used within a PomodoroProvider')
  }
  return context
}
