import { useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '../ui/chart'
import { formatHoursLabel } from '../charts/chartFormat'
import { StatTile } from '../ui/StatTile'
import { formatReportMoney, formatWeekLabel } from '../../lib/reportView'
import type { ProfitabilityReport } from '../../types/report'
import { ChartCard, EmptyNote } from './ChartCard'

const TOP_N = 5

const trendConfig = {
  revenue: { label: 'Revenue', color: 'var(--color-brand)' },
  cost: { label: 'Cost', color: 'var(--color-brand-hi)' },
  margin: { label: 'Margin', color: 'var(--color-blue)' },
} satisfies ChartConfig

export function ProfitabilityReportPanel({
  report,
  isLoading,
}: {
  report: ProfitabilityReport | null
  isLoading: boolean
}) {
  if (isLoading && !report) {
    return (
      <div className="rounded-2xl bg-white px-5 py-16 text-center shadow-card">
        <p className="text-body text-navy/55">Loading profitability report…</p>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="rounded-2xl bg-white px-5 py-16 text-center shadow-card">
        <EmptyNote text="No profitability data for these filters." />
      </div>
    )
  }

  const topProjects = report.projects.slice(0, TOP_N)
  const lowProjects = [...report.projects].sort((a, b) => a.margin - b.margin).slice(0, TOP_N)

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total logged" value={formatHoursLabel(report.kpis.totalSeconds)} />
        <StatTile label="Billable" value={`${report.kpis.billablePct.toFixed(1)}%`} />
        <StatTile label="Projects" value={String(report.kpis.activeProjects)} />
        <StatTile label="Members" value={String(report.kpis.activeMembers)} />
      </div>

      {report.byCurrency.length === 0 ? (
        <div className="rounded-2xl bg-white px-5 py-10 text-center shadow-card">
          <EmptyNote text="No project-linked time to price in this range." />
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {report.byCurrency.map((currency) => (
            <div key={currency.currencyCode} className="rounded-2xl bg-white p-4 shadow-card">
              <h2 className="font-display text-base font-bold text-navy">
                {currency.currencyCode}
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <StatTile
                  label="Revenue"
                  value={formatReportMoney(currency.revenue, currency.currencyCode)}
                />
                <StatTile
                  label="Labour cost"
                  value={formatReportMoney(currency.cost, currency.currencyCode)}
                />
                <StatTile
                  label="Margin"
                  value={formatReportMoney(currency.margin, currency.currencyCode)}
                />
                <StatTile
                  label="Margin %"
                  value={
                    currency.marginPct == null ? '—' : `${currency.marginPct.toFixed(1)}%`
                  }
                />
              </div>
              <p className="mt-3 text-caption text-navy/45">
                {currency.projectCount} projects · {currency.billableHours.toFixed(1)} billable
                hours
              </p>
            </div>
          ))}
        </div>
      )}

      {report.weeklyTrend.length > 0 ? (
        <ChartCard title="Weekly financial trend">
          <FinancialTrendChart trend={report.weeklyTrend} />
        </ChartCard>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <ProjectTable title="Top margin" projects={topProjects} />
        <ProjectTable title="Lowest margin" projects={lowProjects} />
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-card">
        <div className="border-b border-canvas px-4 py-3">
          <h2 className="font-display text-base font-bold text-navy">Member labour cost</h2>
          <p className="text-caption text-navy/45">
            Calculated labour cost in range — not payroll.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-body">
            <thead>
              <tr className="border-b border-canvas bg-surface-muted/60">
                <th className="px-4 py-2.5 text-caption font-medium uppercase tracking-wide text-navy/45">
                  Member
                </th>
                <th className="px-4 py-2.5 text-caption font-medium uppercase tracking-wide text-navy/45">
                  Currency
                </th>
                <th className="px-4 py-2.5 text-right text-caption font-medium uppercase tracking-wide text-navy/45">
                  Hours
                </th>
                <th className="px-4 py-2.5 text-right text-caption font-medium uppercase tracking-wide text-navy/45">
                  Labour cost
                </th>
              </tr>
            </thead>
            <tbody>
              {report.members.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-navy/55">
                    No labour cost in this range.
                  </td>
                </tr>
              ) : (
                report.members.map((member) => (
                  <tr
                    key={`${member.userId}-${member.currencyCode}`}
                    className="border-b border-canvas/80"
                  >
                    <td className="px-4 py-2.5 font-medium text-navy">{member.displayName}</td>
                    <td className="px-4 py-2.5 text-navy/70">{member.currencyCode}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-navy">
                      {formatHoursLabel(member.totalSeconds)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-navy">
                      {formatReportMoney(member.labourCost, member.currencyCode)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

function FinancialTrendChart({ trend }: { trend: ProfitabilityReport['weeklyTrend'] }) {
  const { data, currencies } = useMemo(() => {
    const codes = [...new Set(trend.map(t => t.currencyCode))].sort()
    const points = codes.length === 1
      ? trend.map(t => ({
          week: formatWeekLabel(t.weekStartDate),
          revenue: t.revenue,
          cost: t.cost,
          margin: t.margin,
        }))
      : []
    return { data: points, currencies: codes }
  }, [trend])

  if (data.length === 0) return <EmptyNote text="No trend data available." />
  if (currencies.length > 1) return <EmptyNote text="Trend shown per currency in exports." />

  const currencyCode = currencies[0]

  return (
    <ChartContainer config={trendConfig} className="h-48 w-full">
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--color-gray-tint)" />
        <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={6} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={70}
          tickFormatter={(v: number) => formatReportMoney(v, currencyCode)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => formatReportMoney(Number(value), currencyCode)}
            />
          }
        />
        <Area
          dataKey="revenue"
          type="monotone"
          stroke="var(--color-brand)"
          fill="var(--color-brand)"
          fillOpacity={0.1}
          strokeWidth={2}
        />
        <Area
          dataKey="cost"
          type="monotone"
          stroke="var(--color-brand-hi)"
          fill="var(--color-brand-hi)"
          fillOpacity={0.1}
          strokeWidth={2}
        />
        <Area
          dataKey="margin"
          type="monotone"
          stroke="var(--color-blue)"
          fill="var(--color-blue)"
          fillOpacity={0.1}
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  )
}

function ProjectTable({
  title,
  projects,
}: {
  title: string
  projects: ProfitabilityReport['projects']
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-card">
      <div className="border-b border-canvas px-4 py-3">
        <h2 className="font-display text-base font-bold text-navy">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-body">
          <thead>
            <tr className="border-b border-canvas bg-surface-muted/60">
              <th className="px-4 py-2.5 text-caption font-medium uppercase tracking-wide text-navy/45">
                Project
              </th>
              <th className="px-4 py-2.5 text-right text-caption font-medium uppercase tracking-wide text-navy/45">
                Revenue
              </th>
              <th className="px-4 py-2.5 text-right text-caption font-medium uppercase tracking-wide text-navy/45">
                Margin
              </th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-navy/55">
                  No projects.
                </td>
              </tr>
            ) : (
              projects.map((project) => (
                <tr key={`${title}-${project.projectId}`} className="border-b border-canvas/80">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-navy">{project.name}</div>
                    <div className="text-caption text-navy/45">
                      {project.clientName || '—'} · {project.billingModel} ·{' '}
                      {project.currencyCode}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-navy">
                    {formatReportMoney(project.revenue, project.currencyCode)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-navy">
                    {formatReportMoney(project.margin, project.currencyCode)}
                    {project.marginPct != null
                      ? ` (${project.marginPct.toFixed(1)}%)`
                      : ''}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
