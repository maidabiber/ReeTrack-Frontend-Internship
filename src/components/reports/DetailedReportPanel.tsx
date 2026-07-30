import { formatHoursLabel } from '../charts/chartFormat'
import { StatTile } from '../ui/StatTile'
import { basisLines, formatFullDate, formatReportMoney } from '../../lib/reportView'
import type { DetailedEntry, DetailedReport } from '../../types/report'
import type { ReportGroupBy } from '../../types/reportQuery'
import { EmptyNote } from './ChartCard'

const GROUP_OPTIONS: ReadonlyArray<{ value: ReportGroupBy; label: string }> = [
  { value: 'user', label: 'Member' },
  { value: 'client', label: 'Client' },
  { value: 'project', label: 'Project' },
  { value: 'task', label: 'Task' },
  { value: 'tag', label: 'Tag' },
  { value: 'billable', label: 'Billable' },
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
]

function Th({ children, align = 'left' }: { children: string; align?: 'left' | 'right' }) {
  return (
    <th
      scope="col"
      className={`px-4 py-2.5 text-caption font-medium uppercase tracking-wide text-navy/45 ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  )
}

export function DetailedReportPanel({
  report,
  isLoading,
  page,
  pageSize,
  onPageChange,
  draftGroupBy,
  onToggleGroupBy,
}: {
  report: DetailedReport | null
  isLoading: boolean
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  draftGroupBy: ReportGroupBy[]
  onToggleGroupBy: (value: ReportGroupBy) => void
}) {
  if (isLoading && !report) {
    return (
      <div className="rounded-2xl bg-white px-5 py-16 text-center shadow-card">
        <p className="text-body text-navy/55">Loading detailed report…</p>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="rounded-2xl bg-white px-5 py-16 text-center shadow-card">
        <EmptyNote text="No detailed report data for these filters." />
      </div>
    )
  }

  const totalPages = Math.max(1, Math.ceil(report.totalCount / pageSize))
  const groupsOnPage = report.groups.filter(
    (group) =>
      group.endIndexExclusive > (page - 1) * pageSize &&
      group.startIndex < page * pageSize,
  )

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total logged" value={formatHoursLabel(report.kpis.totalSeconds)} />
        <StatTile label="Billable" value={`${report.kpis.billablePct.toFixed(1)}%`} />
        <StatTile label="Entries" value={String(report.kpis.entryCount)} />
        <StatTile
          label="Members / projects"
          value={`${report.kpis.activeMembers} / ${report.kpis.activeProjects}`}
        />
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-base font-bold text-navy">Group by</h2>
          <p className="text-caption text-navy/45">Applies after you click Apply</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {GROUP_OPTIONS.map((option) => {
            const active = draftGroupBy.includes(option.value)
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onToggleGroupBy(option.value)}
                className={
                  active
                    ? 'rounded-full bg-navy px-3 py-1.5 text-caption font-medium text-white'
                    : 'rounded-full bg-surface-muted px-3 py-1.5 text-caption font-medium text-navy/70 hover:bg-navy/10'
                }
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-body">
            <thead>
              <tr className="border-b border-canvas bg-surface-muted/60">
                <Th>Date</Th>
                <Th>Member</Th>
                <Th>Client</Th>
                <Th>Project</Th>
                <Th>Task</Th>
                <Th>Tags</Th>
                <Th>Billable</Th>
                <Th align="right">Hours</Th>
                <Th align="right">Cost</Th>
                <Th>Flags</Th>
              </tr>
            </thead>
            <tbody>
              {report.entries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-navy/50">
                    No entries match these filters.
                  </td>
                </tr>
              ) : (
                <>
                  {groupsOnPage.length > 0
                    ? groupsOnPage.map((group) => (
                        <GroupSection
                          key={`${group.startIndex}-${group.label}`}
                          label={group.label}
                          entryCount={group.entryCount}
                          totalSeconds={group.totalSeconds}
                          rows={report.entries.filter((_, index) => {
                            const absolute = (page - 1) * pageSize + index
                            return absolute >= group.startIndex && absolute < group.endIndexExclusive
                          })}
                        />
                      ))
                    : report.entries.map((entry) => (
                        <EntryRow key={entry.entryId} entry={entry} />
                      ))}
                </>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-canvas px-4 py-3">
          <p className="text-caption text-navy/50">
            {report.totalCount === 0
              ? '0 entries'
              : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, report.totalCount)} of ${report.totalCount}`}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => onPageChange(page - 1)}
              className="rounded-full bg-surface-muted px-3 py-1.5 text-caption font-medium text-navy disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-caption text-navy/55">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || isLoading}
              onClick={() => onPageChange(page + 1)}
              className="rounded-full bg-surface-muted px-3 py-1.5 text-caption font-medium text-navy disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <details className="rounded-2xl bg-white px-5 py-4 shadow-card">
        <summary className="cursor-pointer font-display text-sm font-bold text-navy">
          Basis &amp; assumptions
        </summary>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-body text-navy/60">
          {basisLines(report).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {report.generatedByName ? (
          <p className="mt-3 text-caption text-navy/45">
            Generated {formatFullDate(report.generatedAtUtc)} by {report.generatedByName}
          </p>
        ) : null}
      </details>
    </div>
  )
}

function GroupSection({
  label,
  entryCount,
  totalSeconds,
  rows,
}: {
  label: string
  entryCount: number
  totalSeconds: number
  rows: DetailedEntry[]
}) {
  return (
    <>
      <tr className="bg-brand-tint/40">
        <td colSpan={10} className="px-4 py-2 font-medium text-navy">
          {label}
          <span className="ml-2 text-caption font-normal text-navy/55">
            {entryCount} entries · {formatHoursLabel(totalSeconds)}
          </span>
        </td>
      </tr>
      {rows.map((entry) => (
        <EntryRow key={entry.entryId} entry={entry} />
      ))}
    </>
  )
}

function EntryRow({ entry }: { entry: DetailedEntry }) {
  const flags = [
    entry.isWeekend ? 'Weekend' : null,
    entry.isHoliday ? 'Holiday' : null,
    entry.overtimeHours > 0 ? 'OT' : null,
  ].filter(Boolean)

  return (
    <tr className="border-b border-canvas/80 last:border-0">
      <td className="whitespace-nowrap px-4 py-2.5 text-navy">{formatFullDate(entry.entryDate)}</td>
      <td className="px-4 py-2.5 text-navy">{entry.displayName}</td>
      <td className="px-4 py-2.5 text-navy/70">{entry.clientName ?? '—'}</td>
      <td className="px-4 py-2.5 text-navy">{entry.projectName ?? 'Unassigned'}</td>
      <td className="px-4 py-2.5 text-navy/70">{entry.taskName ?? '—'}</td>
      <td className="max-w-[10rem] truncate px-4 py-2.5 text-navy/60" title={entry.tags.join(', ')}>
        {entry.tags.length > 0 ? entry.tags.join(', ') : '—'}
      </td>
      <td className="px-4 py-2.5 text-navy/70">{entry.isBillable ? 'Yes' : 'No'}</td>
      <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-navy">
        {formatHoursLabel(entry.durationSeconds)}
      </td>
      <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-navy">
        {entry.currencyCode
          ? formatReportMoney(entry.calculatedCost, entry.currencyCode)
          : entry.calculatedCost.toFixed(2)}
      </td>
      <td className="px-4 py-2.5 text-caption text-navy/55">{flags.length > 0 ? flags.join(' · ') : '—'}</td>
    </tr>
  )
}
