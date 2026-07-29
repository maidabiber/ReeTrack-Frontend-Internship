import { useState } from 'react'
import { apiErrorMessage } from '../api/client'
import { downloadSummaryReport, type ReportExportFormat } from '../api/reports'
import { BillableSplitCard } from '../components/charts/BillableSplitCard'
import { ProjectBreakdown } from '../components/charts/ProjectBreakdown'
import { RecentWeeksTrend } from '../components/charts/RecentWeeksTrend'
import { WeekHoursBarChart } from '../components/charts/WeekHoursBarChart'
import { formatHoursLabel } from '../components/charts/chartFormat'
import { AttentionCard } from '../components/reports/AttentionCard'
import { ChartCard, EmptyNote } from '../components/reports/ChartCard'
import { ExportMenu } from '../components/reports/ExportMenu'
import { ReportFilterBar } from '../components/reports/ReportFilterBar'
import { SavedFilterSets } from '../components/reports/SavedFilterSets'
import { SegmentedTabs } from '../components/directory/DirectoryControls'
import { Icon } from '../components/ui/Icon'
import { StatTile } from '../components/ui/StatTile'
import { useAuth } from '../hooks/useAuth'
import { useReportWorkspace } from '../hooks/useReportWorkspace'
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
import type { ReportType } from '../types/reportQuery'

const TOP_N = 5

const REPORT_TABS: ReadonlyArray<{ value: ReportType; label: string }> = [
  { value: 'summary', label: 'Summary' },
  { value: 'detailed', label: 'Detailed' },
  { value: 'workload', label: 'Workload' },
  { value: 'profitability', label: 'Profitability' },
]

/**
 * RT-50 / RT-54 — admin portfolio reports. Nav is adminOnly; the page also
 * gates itself because routes aren't role-guarded. Backend is [Authorize(Roles="Admin")].
 */
export default function ReportsPage() {
  const { role } = useAuth()
  if (role !== 'Admin') return <AdminsOnly />
  return <ReportsWorkspace />
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

function ReportsWorkspace() {
  const {
    draftQuery,
    appliedQuery,
    activeTab,
    setActiveTab,
    summary,
    isLoading,
    error,
    isDirty,
    patchDraft,
    replaceDraft,
    applyFilters,
    resetFilters,
  } = useReportWorkspace()

  const [exportError, setExportError] = useState<string | null>(null)
  const [exporting, setExporting] = useState<ReportExportFormat | null>(null)

  async function handleExport(format: ReportExportFormat) {
    setExporting(format)
    setExportError(null)
    try {
      await downloadSummaryReport(format, appliedQuery)
    } catch (cause) {
      setExportError(apiErrorMessage(cause, 'Could not download the export.'))
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-page px-10 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-navy">Reports</h1>
          {summary && activeTab === 'summary' ? (
            <p className="mt-1 font-mono text-xs uppercase tracking-[0.12em] text-navy/45">
              {formatPeriodLabel(summary)}
            </p>
          ) : null}
        </div>
        {activeTab === 'summary' && summary ? (
          <ExportMenu exporting={exporting} onExport={handleExport} disabled={isLoading} />
        ) : null}
      </div>

      <div className="mb-4">
        <SegmentedTabs options={REPORT_TABS} value={activeTab} onChange={setActiveTab} />
      </div>

      <div className="mb-4 flex items-center gap-2">
        <ReportFilterBar
          draft={draftQuery}
          isDirty={isDirty}
          onPatch={patchDraft}
          onReset={resetFilters}
        />
        <SavedFilterSets draft={draftQuery} onLoad={replaceDraft} />
        <button
          type="button"
          onClick={applyFilters}
          disabled={!isDirty}
          className="rounded-full bg-brand px-4 py-2 text-body font-medium text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          Apply
        </button>
      </div>

      {isDirty ? (
        <div className="mb-4 rounded-lg bg-brand-tint px-4 py-3 text-body text-navy">
          Filters changed — click Apply to refresh this report.
        </div>
      ) : null}

      {error && activeTab === 'summary' ? (
        <div className="mb-4 rounded-lg bg-red-tint px-4 py-3 text-body text-red" role="alert">
          {error}
        </div>
      ) : null}

      {exportError ? (
        <div className="mb-4 rounded-lg bg-red-tint px-4 py-3 text-body text-red" role="alert">
          {exportError}
        </div>
      ) : null}

      {activeTab === 'summary' ? (
        <SummaryReportPanel report={summary} isLoading={isLoading} />
      ) : (
        <ComingSoonPanel type={activeTab} />
      )}
    </div>
  )
}

function ComingSoonPanel({ type }: { type: Exclude<ReportType, 'summary'> }) {
  const copy: Record<Exclude<ReportType, 'summary'>, { title: string; body: string }> = {
    detailed: {
      title: 'Detailed report',
      body: 'Entry-level breakdown arrives in a follow-up PR. Filters above are already shared.',
    },
    workload: {
      title: 'Workload report',
      body: 'Employee × client/project workload arrives next. Your applied filters will carry over.',
    },
    profitability: {
      title: 'Profitability report',
      body: 'Revenue, labour cost, and margin views land after Detailed and Workload.',
    },
  }
  const panel = copy[type]

  return (
    <div className="rounded-2xl bg-white px-5 py-16 text-center shadow-card">
      <h2 className="font-display text-lg font-bold text-navy">{panel.title}</h2>
      <p className="mx-auto mt-2 max-w-md text-body text-navy/55">{panel.body}</p>
    </div>
  )
}

function SummaryReportPanel({
  report,
  isLoading,
}: {
  report: SummaryReport | null
  isLoading: boolean
}) {
  const [showAllProjects, setShowAllProjects] = useState(false)
  const [showAllMembers, setShowAllMembers] = useState(false)

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white px-5 py-16 text-center text-body text-navy/50 shadow-card">
        Loading summary…
      </div>
    )
  }

  if (!report) return null

  const activityData = toActivityChartData(report.activity)
  const trendData = toWeeklyTrendChartData(report.weeklyTrend)
  const projectData = toProjectBreakdownData(report.projects, report.kpis.unassignedSeconds)
  const attention = buildAttentionItems(report)
  const hoursDelta = trendDelta(report.weeklyTrend)

  const visibleProjectData = showAllProjects ? projectData : projectData.slice(0, TOP_N)
  const visibleProjects = showAllProjects ? report.projects : report.projects.slice(0, TOP_N)
  const visibleMembers = showAllMembers ? report.members : report.members.slice(0, TOP_N)

  return (
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
  )
}

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

function formatDecimalHours(hours: number): string {
  return formatHoursLabel(Math.round(hours * 3600))
}
