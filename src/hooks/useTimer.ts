import { useContext } from 'react'
import { TimerContext } from '../context/timer'
import type { TimerContextValue } from '../context/timer'

/** Access the running timer and one-click start/stop actions. */
export function useTimer(): TimerContextValue {
  const context = useContext(TimerContext)
  if (context === undefined) {
    throw new Error('useTimer must be used within a TimerProvider')
  }
  return context
}
