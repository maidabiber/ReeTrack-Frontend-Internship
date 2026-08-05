import type { ActiveTimerOverview } from '../../types/overview'
import { elapsedSecondsSince, formatDurationHms } from '../../lib/formatDuration'
import { UserAvatar } from '../ui/UserAvatar'
import { Pill } from '../ui/Pill'
import { OVERVIEW_SCROLL_CLASS } from './overviewPanelLayout'

export function ActiveTimersPanel({
  timers,
  nowMs,
}: {
  timers: ActiveTimerOverview[]
  nowMs: number
}) {
  return (
    <section className="flex h-full min-h-0 min-w-0 max-w-full flex-col rounded-2xl bg-white px-4 py-4 shadow-card sm:px-5">
      <h2 className="shrink-0 font-display text-body font-bold text-navy">Active timers</h2>
      {timers.length === 0 ? (
        <p className="mt-6 py-8 text-center text-caption text-navy/45">No one is tracking right now.</p>
      ) : (
        <ul
          className={`mt-3 max-h-[24rem] min-h-0 flex-1 divide-y divide-navy/[0.08] lg:max-h-none ${OVERVIEW_SCROLL_CLASS}`}
        >
          {timers.map((timer) => {
            const elapsed = elapsedSecondsSince(timer.startedAtUtc, nowMs)
            const subtitle = [timer.projectName, timer.projectTaskName, timer.description]
              .filter(Boolean)
              .join(' · ')
            return (
              <li
                key={timer.timeEntryId}
                className="flex min-h-16 shrink-0 items-center gap-3 py-2"
              >
                <UserAvatar name={timer.displayName} size={36} className="shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="truncate font-medium text-navy">{timer.displayName}</p>
                    {timer.isStale ? (
                      <Pill label="Stale" dotClassName="bg-orange" />
                    ) : null}
                    {timer.isUnassigned ? (
                      <Pill label="No project" dotClassName="bg-navy/35" />
                    ) : null}
                    {timer.isBillable ? (
                      <span className="text-xs font-medium text-brand">billable</span>
                    ) : null}
                  </div>
                  <p className="truncate text-caption text-navy/50">
                    {subtitle || 'No description'}
                  </p>
                </div>
                <p
                  className={`shrink-0 font-mono text-sm font-medium ${
                    timer.isStale ? 'text-orange' : 'text-navy'
                  }`}
                >
                  {formatDurationHms(elapsed)}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
