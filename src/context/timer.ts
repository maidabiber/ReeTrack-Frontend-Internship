import { createContext } from 'react'
import type { ActiveTimer, TimeEntry, TimeEntryAssociations, TimeEntryTag } from '../types/timeEntry'
import type { Teammate } from '../lib/mention'
import type { TimeEntryDraft } from './timerDraftReducer'

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
  draft: TimeEntryDraft
  setDraftDescription: (description: string) => void
  setDraftMentionedTeammates: (mentionedTeammates: Teammate[]) => void
  setDraftProject: (project: {
    projectId: string | null
    projectTaskId: string | null
    projectName: string | null
    projectColor: string | null
    projectTaskName: string | null
  }) => void
  clearDraftProject: () => void
  setDraftTags: (tagIds: string[], knownTags: TimeEntryTag[]) => void
  removeDraftTag: (tagId: string) => void
  setDraftBillable: (isBillable: boolean) => void
  applyDraftTemplate: (template: {
    description: string
    projectId: string | null
    projectTaskId: string | null
    projectName: string | null
    projectColor: string | null
    projectTaskName: string | null
    isBillable: boolean
  }) => void
  clearDraft: () => void
  start: (description?: string, associations?: TimeEntryAssociations) => Promise<void>
  stop: (options?: {
    description?: string
    assigneeUserIds?: string[]
    associations?: TimeEntryAssociations
  }) => Promise<void>
  toggle: (
    description?: string,
    options?: {
      assigneeUserIds?: string[]
      associations?: TimeEntryAssociations
    },
  ) => Promise<void>
  addManualEntry: (params: {
    description?: string
    startedAtUtc: string
    endedAtUtc: string
    isBillable?: boolean
    assigneeUserIds?: string[]
    projectId?: string | null
    projectTaskId?: string | null
    tagIds?: string[]
  }) => Promise<void>
  addDurationEntry: (params: {
    description?: string
    entryDateUtc: string
    durationSeconds: number
    isBillable?: boolean
    projectId?: string | null
    projectTaskId?: string | null
    tagIds?: string[]
  }) => Promise<void>
  updateEntry: (params: {
    id: string
    description?: string
    startedAtUtc?: string
    endedAtUtc?: string
    durationSeconds?: number
    isBillable?: boolean
    projectId?: string | null
    projectTaskId?: string | null
    tagIds?: string[]
  }) => Promise<void>
  refresh: () => Promise<void>
}

export const TimerContext = createContext<TimerContextValue | undefined>(undefined)
