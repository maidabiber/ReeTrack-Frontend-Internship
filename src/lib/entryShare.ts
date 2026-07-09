import type { TimeEntry } from '../types/timeEntry'

export function isPendingSharedEntry(entry: TimeEntry): boolean {
  return entry.status === 'Pending' && entry.submittedByUserId !== null
}

export function isPendingSharedByCurrentUser(entry: TimeEntry, currentUserId: string): boolean {
  return isPendingSharedEntry(entry) && entry.submittedByUserId === currentUserId
}

export function isPendingSharedWithCurrentUser(entry: TimeEntry, currentUserId: string): boolean {
  return isPendingSharedEntry(entry) && entry.submittedByUserId !== currentUserId
}

export function isSharedByCurrentUser(entry: TimeEntry, currentUserId: string): boolean {
  return entry.submittedByUserId === currentUserId
}

export function isShareableByCurrentUser(entry: TimeEntry, currentUserId: string): boolean {
  if (entry.isRunning || !entry.startedAtUtc || !entry.endedAtUtc) return false
  if (isPendingSharedWithCurrentUser(entry, currentUserId)) return false

  const isOwnConfirmed =
    !entry.submittedByUserId &&
    entry.status === 'Confirmed' &&
    entry.assigneeUserId === currentUserId

  return isOwnConfirmed || isSharedByCurrentUser(entry, currentUserId)
}

export function getEntryShareLabel(entry: TimeEntry, currentUserId: string): string | null {
  if (!isPendingSharedEntry(entry) && !entry.submittedByDisplayName) {
    return null
  }

  if (isPendingSharedByCurrentUser(entry, currentUserId)) {
    const assignees = entry.participants.filter((participant) => participant.role === 'Assignee')
    if (assignees.length > 1) {
      return `Shared with ${assignees.length} people · Awaiting approval`
    }

    return entry.assigneeDisplayName
      ? `Shared with ${entry.assigneeDisplayName} · Awaiting approval`
      : 'Awaiting approval'
  }

  if (entry.submittedByDisplayName) {
    return `Invitation from ${entry.submittedByDisplayName}`
  }

  return null
}
