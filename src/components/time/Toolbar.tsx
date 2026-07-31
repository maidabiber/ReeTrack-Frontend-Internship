import { Icon } from '../ui/Icon'
import { useTimer } from '../../hooks/useTimer'
import { useTimeTotals } from '../../hooks/useTimeTotals'
import { useMyHourTarget } from '../../hooks/useMyHourTarget'
import { formatDurationHms } from '../../lib/formatDuration'
import { formatLoggedVsTarget, targetSecondsForMode } from '../../lib/hourTargetProgress'

export type TimerContentView = 'list' | 'calendar' | 'timesheet'

export function Toolbar({
  contentView,
  onContentViewChange,
}: {
  contentView: TimerContentView
  onContentViewChange: (view: TimerContentView) => void
}) {
  const { entries, activeTimer, elapsedSeconds } = useTimer()
  const { todayTotalSeconds, weekTotalSeconds } = useTimeTotals(
    entries,
    activeTimer,
    elapsedSeconds,
  )
  const { target } = useMyHourTarget()

  const todayTargetSeconds =
    target?.mode === 'Daily'
      ? targetSecondsForMode('Daily', target.targetHours, {
          isWorkdayToday: target.isWorkdayToday,
        })
      : null

  const weekTargetSeconds =
    target?.mode === 'Weekly'
      ? targetSecondsForMode('Weekly', target.targetHours)
      : null

  return (
    <div className="mb-1 flex w-full flex-wrap items-center gap-4">
      <div className="flex items-center gap-1.5 rounded-full border border-navy/[0.06] bg-white px-3.5 py-2 font-display text-sm font-bold text-navy shadow-float">
        <Icon name="calendar" className="size-icon-sm opacity-55" />
        All dates
      </div>

      <div className="flex items-center gap-4.5 text-sm text-navy/60">
        <span>
          TODAY TOTAL
          <b className="ml-menu font-mono text-md font-normal tabular-nums text-navy">
            {formatLoggedVsTarget(todayTotalSeconds, todayTargetSeconds, formatDurationHms)}
          </b>
        </span>
      </div>
      <div className="flex items-center gap-4.5 text-sm text-navy/60">
        <span>
          WEEK TOTAL
          <b className="ml-menu font-mono text-md font-normal tabular-nums text-navy">
            {formatLoggedVsTarget(weekTotalSeconds, weekTargetSeconds, formatDurationHms)}
          </b>
        </span>
      </div>

      <div className="flex-1" />

      <div className="flex rounded-full border border-navy/[0.06] bg-white p-segment shadow-float">
        <button
          type="button"
          onClick={() => onContentViewChange('list')}
          className={`rounded-full px-3.5 py-compact font-display text-sm font-semibold ${
            contentView === 'list' ? 'bg-navy text-cream' : 'text-navy/55'
          }`}
        >
          List view
        </button>
        <button
          type="button"
          onClick={() => onContentViewChange('calendar')}
          className={`rounded-full px-3.5 py-compact font-display text-sm font-semibold ${
            contentView === 'calendar' ? 'bg-navy text-cream' : 'text-navy/55'
          }`}
        >
          Calendar
        </button>
        <button
          type="button"
          onClick={() => onContentViewChange('timesheet')}
          className={`rounded-full px-3.5 py-compact font-display text-sm font-semibold ${
            contentView === 'timesheet' ? 'bg-navy text-cream' : 'text-navy/55'
          }`}
        >
          Timesheet
        </button>
      </div>
    </div>
  )
}
