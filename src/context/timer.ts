import { createContext } from 'react'
import type { ActiveTimer, TimeEntry } from '../types/timeEntry'

export interface TimerContextValue {
  activeTimer: ActiveTimer | null
  entries: TimeEntry[]
  elapsedSeconds: number
  isRunning: boolean
  isInitializing: boolean
  isToggling: boolean
  isSavingManual: boolean
  isSavingEdit: boolean
  error: string | null
  start: (description?: string) => Promise<void>
  stop: (description?: string) => Promise<void>
  toggle: (description?: string) => Promise<void>
  addManualEntry: (params: {
    description?: string
    startedAtUtc: string
    endedAtUtc: string
    confirmOverlap?: boolean
  }) => Promise<{ overlapWarning: string | null }>
  updateEntry: (params: {
    id: string
    description?: string
    startedAtUtc: string
    endedAtUtc: string
    isBillable?: boolean
    confirmOverlap?: boolean
  }) => Promise<{ overlapWarning: string | null }>
  refresh: () => Promise<void>
}

export const TimerContext = createContext<TimerContextValue | undefined>(undefined)
