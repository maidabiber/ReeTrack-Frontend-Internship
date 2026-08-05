import { WeekHoursBarChart } from '../charts/WeekHoursBarChart'
import { ChartCard } from '../reports/ChartCard'
import type { OverviewDailySeconds } from '../../types/overview'
import { formatHoursLabel } from '../charts/chartFormat'

export function WeekStripPanel({
  activity,
  todayIndex,
  todaySeconds,
  avgSeconds,
}: {
  activity: OverviewDailySeconds[]
  todayIndex: number
  todaySeconds: number
  avgSeconds: number
}) {
  return (
    <ChartCard title="This weeks tracked work">
      <WeekHoursBarChart
        data={activity.map((d) => ({ day: d.day, seconds: d.seconds }))}
        todayIndex={todayIndex}
      />
      <div className="mt-3 flex items-center justify-center gap-6 border-t border-navy/[0.08] pt-3 sm:gap-8">
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-navy/40">Today</p>
          <p className="mt-0.5 font-mono text-sm font-semibold text-navy">
            {formatHoursLabel(todaySeconds)}
          </p>
        </div>
        <div aria-hidden className="h-8 w-px bg-navy/10" />
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-navy/40">Avg per day</p>
          <p className="mt-0.5 font-mono text-sm font-semibold text-navy">
            {formatHoursLabel(avgSeconds)}
          </p>
        </div>
      </div>
    </ChartCard>
  )
}
