import type { CustomReportCatalogue, EntriesBlockSpec } from '../../../../types/customReport'
import type { ReportGroupBy } from '../../../../types/reportQuery'
import { MAX_DIMENSIONS, MAX_ENTRIES_LIMIT } from '../../../../lib/customReportSpec'

const GROUP_BY_OPTIONS: ReadonlyArray<{ value: ReportGroupBy; label: string }> = [
  { value: 'user', label: 'User' },
  { value: 'project', label: 'Project' },
  { value: 'client', label: 'Client' },
  { value: 'task', label: 'Task' },
  { value: 'tag', label: 'Tag' },
  { value: 'billable', label: 'Billable' },
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
]

export function EntriesBlockEditor({
  block,
  catalogue,
  onChange,
}: {
  block: EntriesBlockSpec
  catalogue: CustomReportCatalogue
  onChange: (next: EntriesBlockSpec) => void
}) {
  const groupBy = block.groupBy ?? []

  function toggleColumn(id: string) {
    if (block.columns.includes(id)) {
      // The server rejects a columnless entries block, and it would only surface on Run.
      if (block.columns.length === 1) return
      onChange({ ...block, columns: block.columns.filter((column) => column !== id) })
      return
    }
    onChange({ ...block, columns: [...block.columns, id] })
  }

  function toggleGroup(value: ReportGroupBy) {
    if (groupBy.includes(value)) {
      onChange({ ...block, groupBy: groupBy.filter((item) => item !== value) })
      return
    }
    // Order is nesting order — the first pick is the outer group, so capping (rather than
    // dropping the oldest) keeps that order predictable instead of silently reshuffling it.
    if (groupBy.length >= MAX_DIMENSIONS) return
    onChange({ ...block, groupBy: [...groupBy, value] })
  }

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Columns</FieldLabel>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {catalogue.entryColumns.map((column) => {
            const active = block.columns.includes(column.id)
            return (
              <button
                key={column.id}
                type="button"
                onClick={() => toggleColumn(column.id)}
                className={`rounded-full px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors ${
                  active ? 'bg-navy text-cream' : 'bg-surface-muted text-navy/70 hover:bg-navy/10'
                }`}
              >
                {column.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <FieldLabel>Group by</FieldLabel>
        <p className="mt-1 text-caption text-navy/45">
          Adds a header and subtotal row per group. Pick order sets the nesting — the first pick
          is the outer group. Up to {MAX_DIMENSIONS} levels.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {GROUP_BY_OPTIONS.map((option) => {
            const active = groupBy.includes(option.value)
            const disabled = !active && groupBy.length >= MAX_DIMENSIONS
            const level = groupBy.indexOf(option.value)
            return (
              <button
                key={option.value}
                type="button"
                disabled={disabled}
                onClick={() => toggleGroup(option.value)}
                className={`rounded-full px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors ${
                  active
                    ? 'bg-navy text-cream'
                    : disabled
                      ? 'cursor-not-allowed bg-surface-muted text-navy/30'
                      : 'bg-surface-muted text-navy/70 hover:bg-navy/10'
                }`}
              >
                {option.label}
                {active && groupBy.length > 1 ? ` · ${level + 1}` : ''}
              </button>
            )
          })}
        </div>
      </div>

      <label className="block max-w-[12rem]">
        <FieldLabel>Row limit</FieldLabel>
        <input
          type="number"
          min={1}
          max={MAX_ENTRIES_LIMIT}
          value={block.limit ?? 100}
          onChange={(event) =>
            onChange({
              ...block,
              limit: Math.min(MAX_ENTRIES_LIMIT, Math.max(1, Number(event.target.value) || 1)),
            })
          }
          className="mt-1 w-full rounded-lg border border-navy/10 bg-white px-2.5 py-1.5 font-mono text-body text-navy tabular-nums"
        />
      </label>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-navy/45">{children}</p>
  )
}
