import type { BreakdownBlockSpec, CustomReportCatalogue } from '../../../../types/customReport'
import {
  MAX_TOP_N,
  clampTopN,
  metricsCompatibleWith,
  sortableKeys,
} from '../../../../lib/customReportSpec'
import { ComputedColumnEditor } from '../ComputedColumnEditor'
import { DimensionPicker } from '../DimensionPicker'
import { MetricPicker } from '../MetricPicker'

export function BreakdownBlockEditor({
  block,
  catalogue,
  onChange,
}: {
  block: BreakdownBlockSpec
  catalogue: CustomReportCatalogue
  onChange: (next: BreakdownBlockSpec) => void
}) {
  // Dimensions are deliberately absent: the server orders rows by looking the sort key up
  // in the row's measured values, so a dimension id sorts every row by nothing.
  const sortKeys = sortableKeys(block)
  const metricLabels = new Map(catalogue.metrics.map((metric) => [metric.id, metric.label]))
  const computedLabels = new Map(
    (block.computed ?? []).map((column) => [column.id, column.label || 'Computed']),
  )
  const sortOptions = sortKeys.map((key) => ({
    key,
    label: metricLabels.get(key) ?? computedLabels.get(key) ?? key,
  }))

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Dimensions</FieldLabel>
        <div className="mt-2">
          <DimensionPicker
            dimensions={catalogue.dimensions}
            selected={block.dimensions}
            onChange={(dimensions) => {
              const metrics = metricsCompatibleWith(block.metrics, dimensions, catalogue.metrics)
              const allowed = new Set(metrics)
              const computed = keepComputed(block.computed, allowed)
              onChange({
                ...block,
                dimensions,
                metrics,
                computed,
                sortKey: keepSortKey(block.sortKey, metrics, computed),
              })
            }}
          />
        </div>
      </div>

      <div>
        <FieldLabel>Metrics</FieldLabel>
        <div className="mt-2">
          <MetricPicker
            metrics={catalogue.metrics}
            selected={block.metrics}
            dimensions={block.dimensions}
            onChange={(metrics) => {
              const allowed = new Set(metrics)
              const computed = keepComputed(block.computed, allowed)
              onChange({
                ...block,
                metrics,
                computed,
                sortKey: keepSortKey(block.sortKey, metrics, computed),
              })
            }}
          />
        </div>
      </div>

      <div>
        <FieldLabel>Computed columns</FieldLabel>
        <div className="mt-2">
          <ComputedColumnEditor
            columns={block.computed ?? []}
            metrics={catalogue.metrics}
            selectedMetricIds={block.metrics}
            onChange={(computed) =>
              onChange({
                ...block,
                computed,
                sortKey: keepSortKey(block.sortKey, block.metrics, computed),
              })
            }
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <FieldLabel>Sort by</FieldLabel>
          <select
            value={block.sortKey ?? ''}
            onChange={(event) =>
              onChange({ ...block, sortKey: event.target.value || null })
            }
            className="mt-1 w-full rounded-lg border border-navy/10 bg-white px-2.5 py-1.5 text-body text-navy"
          >
            <option value="">Default</option>
            {sortOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-end gap-2 pb-1.5 text-body text-navy">
          <input
            type="checkbox"
            checked={block.sortDescending ?? true}
            onChange={(event) => onChange({ ...block, sortDescending: event.target.checked })}
            className="size-4 rounded border-navy/20"
          />
          Descending
        </label>

        <label className="block">
          <FieldLabel>Top N</FieldLabel>
          <input
            type="number"
            min={1}
            max={MAX_TOP_N}
            value={block.topN ?? ''}
            placeholder="All"
            onChange={(event) => onChange({ ...block, topN: clampTopN(event.target.value) })}
            className="mt-1 w-full rounded-lg border border-navy/10 bg-white px-2.5 py-1.5 font-mono text-body text-navy tabular-nums"
          />
        </label>

        <div className="flex flex-col justify-end gap-2 pb-1.5">
          <label className="flex items-center gap-2 text-body text-navy">
            <input
              type="checkbox"
              checked={block.includeOthers ?? false}
              onChange={(event) => onChange({ ...block, includeOthers: event.target.checked })}
              className="size-4 rounded border-navy/20"
            />
            Include others
          </label>
          <label className="flex items-center gap-2 text-body text-navy">
            <input
              type="checkbox"
              checked={block.showTotals ?? true}
              onChange={(event) => onChange({ ...block, showTotals: event.target.checked })}
              className="size-4 rounded border-navy/20"
            />
            Show totals
          </label>
        </div>
      </div>
    </div>
  )
}

/**
 * Drops computed columns whose operands are gone. A literal right operand has no metric to
 * check, so it survives any metric change as long as the left metric is still selected.
 */
function keepComputed(
  computed: BreakdownBlockSpec['computed'],
  allowed: Set<string>,
): NonNullable<BreakdownBlockSpec['computed']> {
  return (computed ?? []).filter(
    (column) =>
      allowed.has(column.left) &&
      (column.rightValue != null || column.right == null || allowed.has(column.right)),
  )
}

/** Drops a sort key whose column no longer exists on the block. */
function keepSortKey(
  sortKey: string | null | undefined,
  metrics: string[],
  computed: ReadonlyArray<{ id: string }>,
): string | null {
  if (!sortKey) return null
  const available = new Set([...metrics, ...computed.map((column) => column.id)])
  return available.has(sortKey) ? sortKey : null
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-navy/45">{children}</p>
  )
}
