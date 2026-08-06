import { Icon } from '../ui/Icon'
import { useTimer } from '../../hooks/useTimer'
import { useTimeTotals } from '../../hooks/useTimeTotals'
import { useMyHourTarget } from '../../hooks/useMyHourTarget'
import { formatDurationHms } from '../../lib/formatDuration'
import { formatLoggedVsTarget, targetSecondsForMode } from '../../lib/hourTargetProgress'

export type TimerContentView = 'list' | 'calendar' | 'timesheet'

const VIEW_OPTIONS: ReadonlyArray<{
  value: TimerContentView
  label: string
  shortLabel: string
  icon: 'timer' | 'calendar' | 'timesheet'
}> = [
  { value: 'list', label: 'List view', shortLabel: 'List', icon: 'timer' },
  { value: 'calendar', label: 'Calendar', shortLabel: 'Cal', icon: 'calendar' },
  { value: 'timesheet', label: 'Timesheet', shortLabel: 'Sheet', icon: 'timesheet' },
]

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
    <div className="mb-1 flex w-full flex-wrap items-center gap-3 sm:gap-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-navy/60">
        <span>
          <span className="sm:hidden">Today</span>
          <span className="hidden sm:inline">TODAY TOTAL</span>
          <b className="ml-menu font-mono text-md font-normal tabular-nums text-navy">
            {formatLoggedVsTarget(todayTotalSeconds, todayTargetSeconds, formatDurationHms)}
          </b>
        </span>
        <span>
          <span className="sm:hidden">Week</span>
          <span className="hidden sm:inline">WEEK TOTAL</span>
          <b className="ml-menu font-mono text-md font-normal tabular-nums text-navy">
            {formatLoggedVsTarget(weekTotalSeconds, weekTargetSeconds, formatDurationHms)}
          </b>
        </span>
      </div>

      <div className="hidden flex-1 sm:block" />

      <div className="flex w-full rounded-full border border-navy/[0.06] bg-white p-segment shadow-float sm:w-auto">
        {VIEW_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onContentViewChange(option.value)}
            aria-label={option.label}
            title={option.label}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-compact font-display text-sm font-semibold sm:flex-none sm:px-3.5 ${
              contentView === option.value ? 'bg-navy text-cream' : 'text-navy/55'
            }`}
          >
            <Icon name={option.icon} className="size-3.5 sm:hidden" />
            <span className="sm:hidden">{option.shortLabel}</span>
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
