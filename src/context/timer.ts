import { createContext } from 'react'
import type { ActiveTimer, TimeEntry } from '../types/timeEntry'

export interface TimerContextValue {
  activeTimer: ActiveTimer | null
  entries: TimeEntry[]
  elapsedSeconds: number
  isRunning: boolean
  isInitializing: boolean
  isToggling: boolean
  error: string | null
  start: (description?: string) => Promise<void>
  stop: (description?: string) => Promise<void>
  toggle: (description?: string) => Promise<void>
  refresh: () => Promise<void>
}

export const TimerContext = createContext<TimerContextValue | undefined>(undefined)
