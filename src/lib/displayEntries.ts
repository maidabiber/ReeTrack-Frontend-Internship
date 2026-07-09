import type { TimeEntry } from '../types/timeEntry'
import { isPendingSharedByCurrentUser, isPendingSharedEntry, isPendingSharedWithCurrentUser, isSharedByCurrentUser } from './entryShare'

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
    if (
      entry.shareGroupId &&
      isSharedByCurrentUser(entry, currentUserId)
    ) {
      if (consumedShareGroups.has(entry.shareGroupId)) continue

      const groupedEntries = entries.filter(
        (item) => item.shareGroupId === entry.shareGroupId && isSharedByCurrentUser(item, currentUserId),
      )
      consumedShareGroups.add(entry.shareGroupId)

      displayEntries.push({
        key: entry.shareGroupId,
        entry: groupedEntries[0] ?? entry,
        groupedEntries,
        isGroupedShare: groupedEntries.length > 1,
      })
      continue
    }

    displayEntries.push({
      key: entry.id,
      entry,
      groupedEntries: [entry],
      isGroupedShare: false,
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
