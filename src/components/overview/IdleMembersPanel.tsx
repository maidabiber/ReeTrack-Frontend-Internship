import type { IdleMemberOverview } from '../../types/overview'
import { formatRelativeTime } from '../../lib/formatRelativeTime'
import { UserAvatar } from '../ui/UserAvatar'
import { useMemberDirectory } from '../../hooks/useMemberDirectory'
import {
  IDLE_MEMBER_ROW_HEIGHT_PX,
  OVERVIEW_SCROLL_CLASS,
  OVERVIEW_VISIBLE_ROWS,
} from './overviewPanelLayout'

export function IdleMembersPanel({
  members,
  idleCount,
}: {
  members: IdleMemberOverview[]
  idleCount: number
}) {
  const { members: memberDirectory } = useMemberDirectory()

  return (
    <section className="min-w-0 max-w-full rounded-2xl bg-white px-4 py-4 shadow-card sm:px-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-body font-bold text-navy">Idle today</h2>
        <span className="font-mono text-xs text-navy/40">{String(idleCount).padStart(2, '0')}</span>
      </div>
      {members.length === 0 ? (
        <p className="mt-6 py-6 text-center text-caption text-navy/45">
          Everyone has started or logged time.
        </p>
      ) : (
        <ul
          className={`mt-3 ${OVERVIEW_SCROLL_CLASS}`}
          style={{ maxHeight: OVERVIEW_VISIBLE_ROWS * IDLE_MEMBER_ROW_HEIGHT_PX }}
        >
          {members.map((member) => {
            const profile = memberDirectory.get(member.userId)
            const lastSeen = profile?.lastLoginAtUtc
              ? formatRelativeTime(profile.lastLoginAtUtc)
              : null
            return (
              <li key={member.userId} className="flex h-11 items-center gap-2.5">
                <UserAvatar name={member.displayName} size={28} className="shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <span className="truncate text-body text-navy">{member.displayName}</span>
                  {lastSeen ? (
                    <p className="text-xs text-navy/40">last seen {lastSeen}</p>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
