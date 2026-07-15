import type { TimeEntry, TimeEntryParticipant } from '../types/timeEntry'

function collectParticipantsFromEntry(entry: TimeEntry): TimeEntryParticipant[] {
  if (entry.participants.length > 0) return entry.participants

  const fallback: TimeEntryParticipant[] = []

  if (entry.submittedByUserId && entry.submittedByDisplayName) {
    fallback.push({
      userId: entry.submittedByUserId,
      displayName: entry.submittedByDisplayName,
      email: entry.submittedByDisplayName,
      role: 'Submitter',
    })
  }

  if (entry.assigneeUserId && entry.assigneeDisplayName) {
    fallback.push({
      userId: entry.assigneeUserId,
      displayName: entry.assigneeDisplayName,
      email: entry.assigneeDisplayName,
      role: 'Assignee',
    })
  }

  return fallback
}

export function getEntryMembers(
  entry: TimeEntry,
  options?: {
    groupedEntries?: TimeEntry[]
    excludeUserId?: string
  },
): TimeEntryParticipant[] {
  const sources = options?.groupedEntries ?? [entry]
  const byUserId = new Map<string, TimeEntryParticipant>()

  for (const source of sources) {
    for (const participant of collectParticipantsFromEntry(source)) {
      if (options?.excludeUserId && participant.userId === options.excludeUserId) continue

      if (!byUserId.has(participant.userId)) {
        byUserId.set(participant.userId, participant)
      }
    }
  }

  return Array.from(byUserId.values())
}
