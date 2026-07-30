import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts'
import { formatHoursLabel } from '../charts/chartFormat'
import { StatTile } from '../ui/StatTile'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '../ui/chart'
import type { WorkloadReport } from '../../types/report'
import { ChartCard, EmptyNote } from './ChartCard'

const memberColors = ['var(--color-brand)', 'var(--color-brand-hi)', 'var(--color-blue)', 'var(--color-purple-mid)']

const memberChartConfig = {
  hours: { label: 'Hours', color: 'var(--color-brand)' },
} satisfies ChartConfig

const scheduleChartConfig = {
  hours: { label: 'Hours', color: 'var(--color-brand-hi)' },
} satisfies ChartConfig

const scheduleColors: Record<string, string> = {
  Overtime: 'var(--color-orange)',
  Weekend: 'var(--color-amber)',
}

export function WorkloadReportPanel({
  report,
  isLoading,
}: {
  report: WorkloadReport | null
  isLoading: boolean
}) {
  if (isLoading && !report) {
    return (
      <div className="rounded-2xl bg-white px-5 py-16 text-center shadow-card">
        <p className="text-body text-navy/55">Loading workload report…</p>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="rounded-2xl bg-white px-5 py-16 text-center shadow-card">
        <EmptyNote text="No workload data for these filters." />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total logged" value={formatHoursLabel(report.kpis.totalSeconds)} />
        <StatTile label="Billable" value={`${report.kpis.billablePct.toFixed(1)}%`} />
        <StatTile label="Members" value={String(report.kpis.activeMembers)} />
        <StatTile label="Projects" value={String(report.kpis.activeProjects)} />
      </div>

      <ChartCard title="Hours by member">
        <MemberHoursChart allocations={report.allocations} />
      </ChartCard>

      <ChartCard title="Schedule breakdown">
        <ScheduleChart schedule={report.schedule} />
      </ChartCard>

      <div className="overflow-hidden rounded-2xl bg-white shadow-card">
        <div className="border-b border-canvas px-4 py-3">
          <h2 className="font-display text-base font-bold text-navy">Workload by client and project</h2>
          <p className="text-caption text-navy/45">
            How each member’s hours split across clients and projects.
          </p>
        </div>
        <table className="w-full border-collapse text-left text-body">
          <thead>
            <tr className="border-b border-canvas bg-surface-muted/60">
              <th className="px-4 py-2.5 text-caption font-medium uppercase tracking-wide text-navy/45">
                Member
              </th>
              <th className="px-4 py-2.5 text-caption font-medium uppercase tracking-wide text-navy/45">
                Client
              </th>
              <th className="px-4 py-2.5 text-caption font-medium uppercase tracking-wide text-navy/45">
                Project
              </th>
              <th className="px-4 py-2.5 text-right text-caption font-medium uppercase tracking-wide text-navy/45">
                Hours
              </th>
              <th className="px-4 py-2.5 text-right text-caption font-medium uppercase tracking-wide text-navy/45">
                % of member
              </th>
            </tr>
          </thead>
          <tbody>
            {report.allocations.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-navy/55">
                  No member hours in this range.
                </td>
              </tr>
            ) : (
              report.allocations.map((row) => (
                <tr
                  key={`${row.userId}-${row.clientId ?? 'none'}-${row.projectId ?? 'none'}`}
                  className="border-b border-canvas/80"
                >
                  <td className="px-4 py-2.5 font-medium text-navy">{row.displayName}</td>
                  <td className="px-4 py-2.5 text-navy/80">{row.clientName}</td>
                  <td className="px-4 py-2.5 text-navy/80">{row.projectName}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-navy">
                    {formatHoursLabel(row.totalSeconds)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-navy/70">
                    {row.pctOfMemberTotal.toFixed(0)}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {report.allocations.length > 0 ? (
            <tfoot>
              <tr className="bg-surface-muted/40 font-medium">
                <td className="px-4 py-2.5 text-navy" colSpan={3}>
                  Total
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-navy">
                  {formatHoursLabel(report.grandTotalSeconds)}
                </td>
                <td className="px-4 py-2.5" />
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

    </div>
  )
}

function MemberHoursChart({ allocations }: { allocations: WorkloadReport['allocations'] }) {
  const data = useMemo(() => {
    const byUser = new Map<string, { name: string; seconds: number }>()
    for (const a of allocations) {
      const existing = byUser.get(a.userId)
      if (existing) {
        existing.seconds += a.totalSeconds
      } else {
        byUser.set(a.userId, { name: a.displayName, seconds: a.totalSeconds })
      }
    }
    return [...byUser.values()]
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, 10)
      .map((row, i) => ({
        name: row.name,
        hours: row.seconds / 3600,
        fill: memberColors[i % memberColors.length],
      }))
  }, [allocations])

  if (data.length === 0) return <EmptyNote text="No member hours." />

  return (
    <ChartContainer config={memberChartConfig} className="h-[280px] w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" tickLine={false} axisLine={false} unit="h" />
        <YAxis type="category" dataKey="name" width={100} tickLine={false} axisLine={false} />
        <ChartTooltip
          cursor={{ fill: 'rgba(27, 37, 64, 0.04)' }}
          content={
            <ChartTooltipContent
              formatter={(value) => formatHoursLabel(Math.round(Number(value) * 3600))}
            />
          }
        />
        <Bar dataKey="hours" radius={[0, 8, 8, 0]} maxBarSize={28}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

function ScheduleChart({ schedule }: { schedule: WorkloadReport['schedule'] }) {
  const data = useMemo(
    () =>
      schedule
        .filter((s) => s.hours > 0)
        .map((s) => ({
          name: s.label,
          hours: s.hours,
          fill: scheduleColors[s.label] ?? 'var(--color-brand-hi)',
        })),
    [schedule],
  )

  if (data.length === 0) return <EmptyNote text="No overtime, weekend, or holiday hours." />

  return (
    <ChartContainer config={scheduleChartConfig} className="h-[160px] w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" tickLine={false} axisLine={false} unit="h" />
        <YAxis type="category" dataKey="name" width={80} tickLine={false} axisLine={false} />
        <ChartTooltip
          cursor={{ fill: 'rgba(27, 37, 64, 0.04)' }}
          content={<ChartTooltipContent formatter={(value) => `${Number(value).toFixed(1)}h`} />}
        />
        <Bar dataKey="hours" radius={[0, 8, 8, 0]} maxBarSize={28}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
