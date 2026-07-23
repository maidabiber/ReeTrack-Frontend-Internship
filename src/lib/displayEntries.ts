import type { TimeEntry } from '../types/timeEntry'
import { isPendingSharedByCurrentUser, isPendingSharedEntry, isPendingSharedWithCurrentUser } from './entryShare'

export interface DisplayTimeEntry {
  key: string
  entry: TimeEntry
  groupedEntries: TimeEntry[]
  isGroupedShare: boolean
}

export function groupEntriesForDisplay(entries: TimeEntry[], currentUserId: string): DisplayTimeEntry[] {
  const consumedShareGroups = new Set<string>()
  const displayEntries: DisplayTimeEntry[] = []

  for (const entry of entries) {
    if (!entry.shareGroupId) {
      displayEntries.push({
        key: entry.id,
        entry,
        groupedEntries: [entry],
        isGroupedShare: false,
      })
      continue
    }

    if (consumedShareGroups.has(entry.shareGroupId)) continue
    consumedShareGroups.add(entry.shareGroupId)

    const groupEntries = entries.filter((item) => item.shareGroupId === entry.shareGroupId)
    const ownEntry =
      groupEntries.find(
        (item) => item.assigneeUserId === currentUserId && !item.submittedByUserId,
      ) ?? groupEntries.find((item) => item.assigneeUserId === currentUserId)

    if (!ownEntry) continue

    displayEntries.push({
      key: entry.shareGroupId,
      entry: ownEntry,
      groupedEntries: groupEntries,
      isGroupedShare: groupEntries.length > 1,
    })
  }

  return displayEntries
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
