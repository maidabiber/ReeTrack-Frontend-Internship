import { useEffect, useState } from 'react'
import { apiErrorMessage } from '../api/client'
import { downloadSummaryReport, getSummaryReport, type ReportExportFormat } from '../api/reports'
import { BillableSplitCard } from '../components/charts/BillableSplitCard'
import { ProjectBreakdown } from '../components/charts/ProjectBreakdown'
import { RecentWeeksTrend } from '../components/charts/RecentWeeksTrend'
import { WeekHoursBarChart } from '../components/charts/WeekHoursBarChart'
import { formatHoursLabel } from '../components/charts/chartFormat'
import { AttentionCard } from '../components/reports/AttentionCard'
import { ChartCard, EmptyNote } from '../components/reports/ChartCard'
import { ExportMenu } from '../components/reports/ExportMenu'
import { Icon } from '../components/ui/Icon'
import { StatTile } from '../components/ui/StatTile'
import { useAuth } from '../hooks/useAuth'
import {
  basisLines,
  buildAttentionItems,
  formatPeriodLabel,
  formatReportMoney,
  toActivityChartData,
  toProjectBreakdownData,
  toWeeklyTrendChartData,
  trendDelta,
} from '../lib/reportView'
import type { SummaryReport } from '../types/report'

/** Rows shown before a list offers "show all". */
const TOP_N = 5

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
  const [exportError, setExportError] = useState<string | null>(null)
  const [exporting, setExporting] = useState<ReportExportFormat | null>(null)
  const [showAllProjects, setShowAllProjects] = useState(false)
  const [showAllMembers, setShowAllMembers] = useState(false)

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

  async function handleExport(format: ReportExportFormat) {
    setExporting(format)
    setExportError(null)
    try {
      await downloadSummaryReport(format)
    } catch (cause) {
      setExportError(apiErrorMessage(cause, 'Could not download the export.'))
    } finally {
      setExporting(null)
    }
  }

  const activityData = report ? toActivityChartData(report.activity) : []
  const trendData = report ? toWeeklyTrendChartData(report.weeklyTrend) : []
  const projectData = report
    ? toProjectBreakdownData(report.projects, report.kpis.unassignedSeconds)
    : []
  const attention = report ? buildAttentionItems(report) : []
  // Hours are the only KPI with a clean period basis in the trend payload.
  const hoursDelta = report ? trendDelta(report.weeklyTrend) : null

  // A dashboard ranks; the detailed report enumerates. Uncapped, ProjectBreakdown
  // grows 40px per row and a large portfolio pushes everything else off-screen.
  const visibleProjectData = showAllProjects ? projectData : projectData.slice(0, TOP_N)
  const visibleProjects = report
    ? showAllProjects
      ? report.projects
      : report.projects.slice(0, TOP_N)
    : []
  const visibleMembers = report
    ? showAllMembers
      ? report.members
      : report.members.slice(0, TOP_N)
    : []

  return (
    <div className="mx-auto w-full max-w-[980px] px-10 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Reports</h1>
          <p className="mt-1 text-md text-navy/55">
            Portfolio-wide summary of confirmed time across every project and member.
          </p>
          {/* Date filtering isn't built yet, so name the window — otherwise lifetime
              totals read as recent figures. */}
          {report ? (
            <p className="mt-1 font-mono text-xs uppercase tracking-[0.12em] text-navy/45">
              {formatPeriodLabel(report)}
            </p>
          ) : null}
        </div>
        {report ? (
          <ExportMenu exporting={exporting} onExport={handleExport} disabled={isLoading} />
        ) : null}
      </div>

      {error ? (
        <div className="mb-4 rounded-lg bg-red-tint px-4 py-3 text-body text-red" role="alert">
          {error}
        </div>
      ) : null}

      {exportError ? (
        <div className="mb-4 rounded-lg bg-red-tint px-4 py-3 text-body text-red" role="alert">
          {exportError}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl bg-white px-5 py-16 text-center text-body text-navy/50 shadow-card">
          Loading summary…
        </div>
      ) : report ? (
        <div className="space-y-4">
          {attention.length > 0 ? <AttentionCard items={attention} /> : null}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <StatTile
              label="Total logged"
              value={formatHoursLabel(report.kpis.totalSeconds)}
              delta={
                hoursDelta
                  ? { pct: hoursDelta.pct, caption: `vs prior ${hoursDelta.weeks} weeks` }
                  : undefined
              }
            />
            <StatTile label="Billable" value={`${formatPct(report.kpis.billablePct)}%`} />
            <StatTile label="Entries" value={String(report.kpis.entryCount)} />
            <StatTile label="Active members" value={String(report.kpis.activeMembers)} />
            <StatTile label="Active projects" value={String(report.kpis.activeProjects)} />
            <StatTile label="Overtime" value={formatDecimalHours(report.kpis.overtimeHours)} />
            <StatTile label="Weekend" value={formatDecimalHours(report.kpis.weekendHours)} />
            <StatTile label="Holiday" value={formatDecimalHours(report.kpis.holidayHours)} />
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
            <ChartCard
              title="By project"
              action={
                <ShowAllToggle
                  total={projectData.length}
                  showingAll={showAllProjects}
                  onToggle={() => setShowAllProjects((value) => !value)}
                />
              }
            >
              {projectData.length === 0 ? (
                <EmptyNote text="No project-linked time yet." />
              ) : (
                <>
                  <ProjectBreakdown data={visibleProjectData} />
                  <ul className="mt-4 space-y-2 border-t border-navy/8 pt-3">
                    {visibleProjects.map((project) => (
                      <li
                        key={project.projectId}
                        className="flex items-baseline justify-between gap-3 text-caption"
                      >
                        <span className="min-w-0 truncate text-navy">
                          {project.name}
                          {project.clientName ? (
                            <span className="text-navy/45"> · {project.clientName}</span>
                          ) : null}
                        </span>
                        <span className="shrink-0 font-mono tabular-nums text-navy/70">
                          {formatReportMoney(project.calculatedCost, project.currencyCode)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </ChartCard>

            <ChartCard
              title="By member"
              action={
                <ShowAllToggle
                  total={report.members.length}
                  showingAll={showAllMembers}
                  onToggle={() => setShowAllMembers((value) => !value)}
                />
              }
            >
              {report.members.length === 0 ? (
                <EmptyNote text="No confirmed time yet." />
              ) : (
                <ul className="space-y-2">
                  {visibleMembers.map((member) => (
                    <li
                      key={member.userId}
                      className="flex items-baseline justify-between gap-3 text-body"
                    >
                      <span className="min-w-0 truncate text-navy">{member.displayName}</span>
                      <span className="shrink-0 font-mono tabular-nums text-navy/70">
                        {formatHoursLabel(member.totalSeconds)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </ChartCard>
          </div>

          <details className="rounded-2xl bg-white px-5 py-4 shadow-card">
            <summary className="cursor-pointer text-caption font-medium text-navy/60">
              Basis &amp; assumptions
            </summary>
            <ul className="mt-3 space-y-1.5">
              {basisLines(report).map((line) => (
                <li key={line} className="text-caption text-navy/55">
                  {line}
                </li>
              ))}
            </ul>
          </details>

          <p className="text-xs text-navy/40">
            Generated {new Date(report.generatedAtUtc).toLocaleString()}
            {report.generatedByName ? ` · by ${report.generatedByName}` : ''}
          </p>
        </div>
      ) : null}
    </div>
  )
}

/** Flips a ranked list between its top rows and the full set. */
function ShowAllToggle({
  total,
  showingAll,
  onToggle,
}: {
  total: number
  showingAll: boolean
  onToggle: () => void
}) {
  if (total <= TOP_N) return null

  return (
    <button
      type="button"
      onClick={onToggle}
      className="text-caption font-medium text-brand transition hover:text-brand-deep"
    >
      {showingAll ? `Show top ${TOP_N}` : `Show all ${total}`}
    </button>
  )
}

function formatPct(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

/**
 * The calculator hands overtime / weekend / holiday back as decimal hours rather than
 * seconds, so they can't go through formatHoursLabel. Kept to the same "12h 30m" shape.
 */
function formatDecimalHours(hours: number): string {
  return formatHoursLabel(Math.round(hours * 3600))
}
