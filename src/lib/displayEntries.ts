import type { TimeEntry } from '../types/timeEntry'
import { isPendingSharedByCurrentUser, isPendingSharedEntry, isPendingSharedWithCurrentUser } from './entryShare'

export interface DisplayTimeEntry {
  key: string
  entry: TimeEntry
  groupedEntries: TimeEntry[]
  isGroupedShare: boolean
}

export function isInvitationEntry(entry: TimeEntry, currentUserId: string): boolean {
  return isPendingSharedWithCurrentUser(entry, currentUserId)
}

export function isAwaitingApprovalEntry(entry: TimeEntry, currentUserId: string): boolean {
  return isPendingSharedByCurrentUser(entry, currentUserId)
}

export function isPendingInvitation(entry: TimeEntry): boolean {
  return isPendingSharedEntry(entry)
}
