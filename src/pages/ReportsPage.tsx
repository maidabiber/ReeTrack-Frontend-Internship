import { useEffect, useState } from 'react'
import { apiErrorMessage } from '../api/client'
import { getSummaryReport } from '../api/reports'
import { BillableSplitCard } from '../components/charts/BillableSplitCard'
import { ProjectBreakdown } from '../components/charts/ProjectBreakdown'
import { RecentWeeksTrend } from '../components/charts/RecentWeeksTrend'
import { WeekHoursBarChart } from '../components/charts/WeekHoursBarChart'
import { Icon } from '../components/ui/Icon'
import { StatTile } from '../components/ui/StatTile'
import { useAuth } from '../hooks/useAuth'
import { formatDurationHms } from '../lib/formatDuration'
import { formatMoney } from '../lib/projectFormat'
import {
  toActivityChartData,
  toProjectBreakdownData,
  toWeeklyTrendChartData,
} from '../lib/reportView'
import type { SummaryReport } from '../types/report'

/**
 * RT-50 — admin portfolio Summary Report. Nav is adminOnly; the page also
 * gates itself because routes aren't role-guarded. Backend is [Authorize(Roles="Admin")].
 */
export default function ReportsPage() {
  const { role } = useAuth()
  if (role !== 'Admin') return <AdminsOnly />
  return <SummaryReportView />
}

function AdminsOnly() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-10 py-8">
      <div className="max-w-sm rounded-2xl bg-white px-8 py-10 text-center shadow-card">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted text-navy/60">
          <Icon name="shield" className="h-5 w-5" />
        </span>
        <h1 className="mt-4 font-display text-lg font-bold text-navy">Admins only</h1>
        <p className="mt-1.5 text-body leading-[1.5] text-navy/60">
          Portfolio reports are available to workspace admins.
        </p>
      </div>
    </div>
  )
}

function SummaryReportView() {
  const [report, setReport] = useState<SummaryReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    getSummaryReport()
      .then((loaded) => {
        if (cancelled) return
        setReport(loaded)
        setError(null)
      })
      .catch((cause) => {
        if (cancelled) return
        setError(apiErrorMessage(cause, 'Could not load the summary report. Is the backend running?'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const activityData = report ? toActivityChartData(report.activity) : []
  const trendData = report ? toWeeklyTrendChartData(report.weeklyTrend) : []
  const projectData = report ? toProjectBreakdownData(report.projects) : []

  return (
    <div className="mx-auto w-full max-w-[980px] px-10 py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-navy">Reports</h1>
        <p className="mt-1 text-md text-navy/55">
          Portfolio-wide summary of confirmed time across every project and member.
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg bg-red-tint px-4 py-3 text-body text-red" role="alert">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl bg-white px-5 py-16 text-center text-body text-navy/50 shadow-card">
          Loading summary…
        </div>
      ) : report ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <StatTile label="Total logged" value={formatDurationHms(report.kpis.totalSeconds)} />
            <StatTile label="Billable" value={`${formatPct(report.kpis.billablePct)}%`} />
            <StatTile label="Entries" value={String(report.kpis.entryCount)} />
            <StatTile label="Active members" value={String(report.kpis.activeMembers)} />
            <StatTile label="Active projects" value={String(report.kpis.activeProjects)} />
            <StatTile label="Overtime" value={formatHours(report.kpis.overtimeHours)} />
            <StatTile label="Weekend" value={formatHours(report.kpis.weekendHours)} />
            <StatTile label="Holiday" value={formatHours(report.kpis.holidayHours)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Activity by day">
              <WeekHoursBarChart data={activityData} />
            </ChartCard>
            <ChartCard title="Billable split">
              <BillableSplitCard
                split={{
                  billableSeconds: report.kpis.billableSeconds,
                  nonBillableSeconds: report.kpis.nonBillableSeconds,
                  totalSeconds: report.kpis.totalSeconds,
                  billablePct: report.kpis.billablePct,
                }}
              />
            </ChartCard>
          </div>

          <ChartCard title="Weekly trend">
            <RecentWeeksTrend data={trendData} />
          </ChartCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="By project">
              {projectData.length === 0 ? (
                <EmptyNote text="No project-linked time yet." />
              ) : (
                <>
                  <ProjectBreakdown data={projectData} />
                  <ul className="mt-4 space-y-2 border-t border-navy/8 pt-3">
                    {report.projects.map((project) => (
                      <li
                        key={project.projectId}
                        className="flex items-baseline justify-between gap-3 text-caption"
                      >
                        <span className="min-w-0 truncate text-navy">{project.name}</span>
                        <span className="shrink-0 font-mono tabular-nums text-navy/70">
                          {formatMoney(project.calculatedCost, project.currencyCode)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </ChartCard>

            <ChartCard title="By member">
              {report.members.length === 0 ? (
                <EmptyNote text="No confirmed time yet." />
              ) : (
                <ul className="space-y-2">
                  {report.members.map((member) => (
                    <li
                      key={member.userId}
                      className="flex items-baseline justify-between gap-3 text-body"
                    >
                      <span className="min-w-0 truncate text-navy">{member.displayName}</span>
                      <span className="shrink-0 font-mono tabular-nums text-navy/70">
                        {formatDurationHms(member.totalSeconds)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </ChartCard>
          </div>

          <p className="text-xs text-navy/40">
            Generated {new Date(report.generatedAtUtc).toLocaleString()}
          </p>
        </div>
      ) : null}
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white px-5 py-4 shadow-card">
      <h3 className="font-display text-body font-bold text-navy">{title}</h3>
      <span aria-hidden className="mt-1.5 mb-3 block h-px w-9 bg-brand-gradient" />
      {children}
    </div>
  )
}

function EmptyNote({ text }: { text: string }) {
  return <p className="py-6 text-center text-body text-navy/50">{text}</p>
}

function formatPct(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function formatHours(hours: number): string {
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(hours)} h`
}
