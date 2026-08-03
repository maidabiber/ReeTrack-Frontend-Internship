import { createContext } from 'react'
import type { ActiveTimer, TimeEntry } from '../types/timeEntry'
import type { TimeEntryRequest } from '../api/timeEntries'

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
  start: (request?: TimeEntryRequest) => Promise<void>
  stop: (request?: TimeEntryRequest) => Promise<TimeEntry>
  toggle: (request?: TimeEntryRequest) => Promise<void>
  addManualEntry: (request: TimeEntryRequest) => Promise<void>
  addDurationEntry: (request: TimeEntryRequest) => Promise<void>
  updateEntry: (id: string, request: TimeEntryRequest) => Promise<void>
  shareEntry: (entryId: string, assigneeUserIds: string[]) => Promise<TimeEntry[]>
  refresh: () => Promise<void>
}

export const TimerContext = createContext<TimerContextValue | undefined>(undefined)
