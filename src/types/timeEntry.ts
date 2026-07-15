export type TimeEntryMode = 'Timer' | 'Manual' | 'DurationOnly'
export type TimeEntryStatus = 'Confirmed' | 'Pending'

export type TimeEntryParticipantRole = 'Submitter' | 'Assignee'

export interface TimeEntryParticipant {
  userId: string
  displayName: string
  email: string
  role: TimeEntryParticipantRole
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
}

export interface ActiveTimer extends TimeEntry {
  startedAtUtc: string
  isRunning: true
}
