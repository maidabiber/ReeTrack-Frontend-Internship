import type { OverviewMemberDigest } from '../../types/overview'
import { formatHoursLabel } from '../charts/chartFormat'
import { UserAvatar } from '../ui/UserAvatar'
import {
  MEMBER_ROW_HEIGHT_PX,
  OVERVIEW_SCROLL_CLASS,
  OVERVIEW_VISIBLE_ROWS,
} from './overviewPanelLayout'

export function TopMembersPanel({ members }: { members: OverviewMemberDigest[] }) {
  return (
    <section className="min-w-0 max-w-full rounded-2xl bg-white px-4 py-4 shadow-card sm:px-5">
      <h2 className="font-display text-body font-bold text-navy">Top members today</h2>
      {members.length === 0 ? (
        <p className="mt-6 py-6 text-center text-caption text-navy/45">
          No member time logged yet today.
        </p>
      ) : (
        <ul
          className={`mt-3 ${OVERVIEW_SCROLL_CLASS}`}
          style={{ maxHeight: OVERVIEW_VISIBLE_ROWS * MEMBER_ROW_HEIGHT_PX }}
        >
          {members.map((member) => (
            <li key={member.userId} className="flex h-9 items-center gap-2.5">
              <UserAvatar name={member.displayName} size={28} className="shrink-0 rounded-full" />
              <span className="min-w-0 flex-1 truncate text-body text-navy">
                {member.displayName}
              </span>
              <span className="shrink-0 font-mono text-caption text-navy/55">
                {formatHoursLabel(member.totalSeconds)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
