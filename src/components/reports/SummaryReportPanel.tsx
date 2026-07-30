import { useState } from 'react'
import { BillableSplitCard } from '../charts/BillableSplitCard'
import { ProjectBreakdown } from '../charts/ProjectBreakdown'
import { RecentWeeksTrend } from '../charts/RecentWeeksTrend'
import { WeekHoursBarChart } from '../charts/WeekHoursBarChart'
import { formatHoursLabel } from '../charts/chartFormat'
import { AttentionCard } from './AttentionCard'
import { ChartCard, EmptyNote } from './ChartCard'
import { StatTile } from '../ui/StatTile'
import {
  buildAttentionItems,
  formatReportMoney,
  toActivityChartData,
  toProjectBreakdownData,
  toWeeklyTrendChartData,
  trendDelta,
} from '../../lib/reportView'
import type { SummaryReport } from '../../types/report'

const TOP_N = 5

export function SummaryReportPanel({
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
