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
    confirmOverlap?: boolean
  }) => Promise<{ overlapWarning: string | null }>
  toggle: (
    description?: string,
    options?: {
      assigneeUserIds?: string[]
      confirmOverlap?: boolean
    },
  ) => Promise<{ overlapWarning: string | null }>
  addManualEntry: (params: {
    description?: string
    startedAtUtc: string
    endedAtUtc: string
    confirmOverlap?: boolean
    assigneeUserIds?: string[]
  }) => Promise<{ overlapWarning: string | null }>
  addDurationEntry: (params: {
    description?: string
    entryDateUtc: string
    durationSeconds: number
    isBillable?: boolean
  }) => Promise<{ overlapWarning: string | null }>
  updateEntry: (params: {
    id: string
    description?: string
    startedAtUtc?: string
    endedAtUtc?: string
    durationSeconds?: number
    isBillable?: boolean
    confirmOverlap?: boolean
  }) => Promise<{ overlapWarning: string | null }>
  refresh: () => Promise<void>
}

export const TimerContext = createContext<TimerContextValue | undefined>(undefined)
