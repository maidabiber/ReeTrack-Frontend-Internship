import { UserAvatar } from '../ui/UserAvatar'
import type { TimeEntryParticipant } from '../../types/timeEntry'

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
