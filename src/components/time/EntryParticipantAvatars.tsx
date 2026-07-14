import { UserAvatar } from '../ui/UserAvatar'
import type { TimeEntry, TimeEntryParticipant } from '../../types/timeEntry'

interface EntryParticipantAvatarsProps {
  participants: TimeEntryParticipant[]
  size?: number
  maxVisible?: number
  ringClassName?: string
}

export function EntryParticipantAvatars({
  participants,
  size = 28,
  maxVisible = 4,
  ringClassName = 'ring-white',
}: EntryParticipantAvatarsProps) {
  if (participants.length === 0) return null

  const visible = participants.slice(0, maxVisible)
  const overflow = participants.length - visible.length

  return (
    <div className="flex shrink-0 items-center">
      {visible.map((participant, index) => (
        <div
          key={participant.userId}
          title={participant.displayName || participant.email}
          className={`rounded-full ring-2 ${ringClassName}`}
          style={{ marginLeft: index === 0 ? 0 : -8, zIndex: visible.length - index }}
        >
          <UserAvatar
            name={participant.displayName || participant.email}
            size={size}
            className="block"
          />
        </div>
      ))}
      {overflow > 0 ? (
        <span
          className="ml-1.5 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-navy/8 px-1.5 text-xs font-semibold text-navy/60"
          title={`${overflow} more`}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  )
}

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
