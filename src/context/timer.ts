import { createContext } from 'react'
import type { ActiveTimer, TimeEntry } from '../types/timeEntry'
import type { OverlapEntry, StopTimerResult, TimeEntryRequest } from '../api/timeEntries'

export type PendingOverlapStatus = 'open' | 'editing' | 'dismissed'

export interface PendingTimerOverlap {
  entry: TimeEntry
  overlapMessage: string | null
  suggestedClipEndedAtUtc: string | null
  overlappingEntries: OverlapEntry[]
  status: PendingOverlapStatus
}

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
  pendingOverlap: PendingTimerOverlap | null
  start: (request?: TimeEntryRequest) => Promise<void>
  stop: (request?: TimeEntryRequest) => Promise<StopTimerResult>
  toggle: (request?: TimeEntryRequest) => Promise<StopTimerResult | void>
  addManualEntry: (request: TimeEntryRequest) => Promise<void>
  addDurationEntry: (request: TimeEntryRequest) => Promise<void>
  updateEntry: (id: string, request: TimeEntryRequest) => Promise<void>
  shareEntry: (entryId: string, assigneeUserIds: string[]) => Promise<TimeEntry[]>
  setPendingOverlapFromStop: (result: StopTimerResult) => void
  setPendingOverlapStatus: (status: PendingOverlapStatus) => void
  clearPendingOverlap: () => void
  resolvePendingOverlap: () => Promise<void>
  refresh: () => Promise<void>
}

export const TimerContext = createContext<TimerContextValue | undefined>(undefined)
