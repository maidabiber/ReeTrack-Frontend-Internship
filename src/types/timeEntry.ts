export type TimeEntryMode = 'Timer' | 'Manual' | 'DurationOnly'
export type TimeEntryStatus = 'Confirmed' | 'Pending'

export type TimeEntryParticipantRole = 'Submitter' | 'Assignee'

export interface TimeEntryParticipant {
  userId: string
  displayName: string
  email: string
  role: TimeEntryParticipantRole
}

export interface TimeEntryTag {
  id: string
  name: string
  color: string | null
}

export interface TimeEntry {
  id: string
  description: string | null
  isBillable: boolean
  mode: TimeEntryMode
  startedAtUtc: string | null
  endedAtUtc: string | null
  durationSeconds: number
  isRunning: boolean
  status: TimeEntryStatus
  submittedByUserId: string | null
  submittedByDisplayName: string | null
  assigneeUserId: string | null
  assigneeDisplayName: string | null
  shareGroupId: string | null
  participants: TimeEntryParticipant[]
  projectId: string | null
  projectName: string | null
  projectColor: string | null
  projectTaskId: string | null
  projectTaskName: string | null
  tags: TimeEntryTag[]
}

export interface ActiveTimer extends TimeEntry {
  startedAtUtc: string
  isRunning: true
}

/** Association fields sent when starting or creating a time entry. */
export interface TimeEntryAssociations {
  projectId?: string | null
  projectTaskId?: string | null
  tagIds?: string[]
  isBillable?: boolean
}
