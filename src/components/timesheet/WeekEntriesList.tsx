import { useMemo } from 'react'
import { formatFullDate, formatTimeRange } from '../calendar/dateUtils'
import { formatDurationHms } from '../../lib/formatDuration'
import { toDateInputValue } from '../../lib/manualEntry'
import { Pill } from '../ui/Pill'
import type { TimesheetEntry } from '../../types/timesheet'

/**
 * Read-only list of a timesheet's entries grouped by their local start date.
 * Shared by the user timesheet view (RT-71) and the admin review modal (RT-72)
 * so both render logged time identically.
 *
 * Grouping by the entries' own dates (rather than the week's Mon–Sun) means a
 * boundary entry — the backend keys weeks by UTC Monday, so an entry's local
 * date can land on the neighbouring Sunday/Monday — still shows up under its
 * real date instead of silently disappearing. Entries without a start time
 * can't be placed on a day but still count toward the totals, so they get their
 * own group.
 */
export function WeekEntriesList({
  entries,
  emptyMessage,
}: {
  entries: TimesheetEntry[]
  /** Overrides the default two-line empty state (e.g. in the review modal). */
  emptyMessage?: React.ReactNode
}) {
  const dayGroups = useMemo(() => {
    const groups = new Map<string, { day: Date; entries: TimesheetEntry[] }>()
    for (const entry of entries) {
      if (!entry.startedAtUtc) continue
      const day = new Date(entry.startedAtUtc)
      const key = toDateInputValue(day)
      const group = groups.get(key) ?? { day, entries: [] }
      group.entries.push(entry)
      groups.set(key, group)
    }
    return [...groups.values()].sort((a, b) => a.day.getTime() - b.day.getTime())
  }, [entries])
  const unscheduled = useMemo(() => entries.filter((entry) => !entry.startedAtUtc), [entries])

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-card">
      <h3 className="border-b border-navy/8 px-5 py-4 font-display text-body font-bold text-navy">
        Entries
      </h3>
      {dayGroups.length === 0 && unscheduled.length === 0 ? (
        <div className="px-5 py-16 text-center text-body leading-[1.6] text-navy/50">
          {emptyMessage ?? (
            <>
              No time logged in this week.
              <br />
              Entries you log on the Timer page will show up here.
            </>
          )}
        </div>
      ) : (
        <>
          {dayGroups.map(({ day, entries: dayEntries }) => (
            <EntryGroup key={day.toDateString()} heading={formatFullDate(day)} entries={dayEntries} />
          ))}
          {unscheduled.length > 0 && <EntryGroup heading="No start time" entries={unscheduled} />}
        </>
      )}
    </div>
  )
}

function EntryGroup({ heading, entries }: { heading: string; entries: TimesheetEntry[] }) {
  return (
    <section>
      <h4 className="bg-surface-muted px-5 py-2 text-sm font-semibold text-navy/60">{heading}</h4>
      <ul className="divide-y divide-navy/6">
        {entries.map((entry) => (
          <li key={entry.id} className="px-5 py-3">
            {/* Mobile: description + duration on one line, everything else wraps below it —
                the single-row desktop layout below crushes the description at narrow widths. */}
            <div className="sm:hidden">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 truncate text-md font-medium text-navy">
                  {entry.description?.trim() || 'No description'}
                </p>
                <span className="shrink-0 font-mono text-md tabular-nums text-navy">
                  {formatDurationHms(entry.durationSeconds)}
                </span>
              </div>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-navy/50">
                {entry.projectName && <span>{entry.projectName}</span>}
                {entry.projectName && entry.clientName && <span aria-hidden="true">·</span>}
                {entry.clientName && <span>{entry.clientName}</span>}
                {entry.status === 'Pending' && <Pill label="Pending" dotClassName="bg-brand/50" />}
                {entry.isBillable && <Pill label="Billable" dotClassName="bg-green" />}
                {entry.startedAtUtc && entry.endedAtUtc && (
                  <span>
                    {formatTimeRange(new Date(entry.startedAtUtc), new Date(entry.endedAtUtc))}
                  </span>
                )}
              </p>
            </div>

            <div className="hidden items-center gap-4 sm:flex">
              <div className="min-w-0 flex-1">
                <p className="truncate text-md font-medium text-navy">
                  {entry.description?.trim() || 'No description'}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-navy/50">
                  {entry.projectName && <span>{entry.projectName}</span>}
                  {entry.projectName && entry.clientName && <span aria-hidden="true">·</span>}
                  {entry.clientName && <span>{entry.clientName}</span>}
                  {entry.status === 'Pending' && <Pill label="Pending" dotClassName="bg-brand/50" />}
                </p>
              </div>
              {entry.isBillable && <Pill label="Billable" dotClassName="bg-green" />}
              {entry.startedAtUtc && entry.endedAtUtc && (
                <span className="shrink-0 text-sm text-navy/50">
                  {formatTimeRange(new Date(entry.startedAtUtc), new Date(entry.endedAtUtc))}
                </span>
              )}
              <span className="shrink-0 font-mono text-md tabular-nums text-navy">
                {formatDurationHms(entry.durationSeconds)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
