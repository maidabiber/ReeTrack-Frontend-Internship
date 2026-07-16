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
  stop: (options?: {
    description?: string
    assigneeUserIds?: string[]
  }) => Promise<void>
  toggle: (
    description?: string,
    options?: {
      assigneeUserIds?: string[]
    },
  ) => Promise<void>
  addManualEntry: (params: {
    description?: string
    startedAtUtc: string
    endedAtUtc: string
    isBillable?: boolean
    assigneeUserIds?: string[]
  }) => Promise<void>
  addDurationEntry: (params: {
    description?: string
    entryDateUtc: string
    durationSeconds: number
    isBillable?: boolean
  }) => Promise<void>
  updateEntry: (params: {
    id: string
    description?: string
    startedAtUtc?: string
    endedAtUtc?: string
    durationSeconds?: number
    isBillable?: boolean
  }) => Promise<void>
  refresh: () => Promise<void>
}

export const TimerContext = createContext<TimerContextValue | undefined>(undefined)
