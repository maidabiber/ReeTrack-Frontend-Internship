import { Icon } from '../../ui/Icon'
import { SearchSelect } from '../../ui/SearchSelect'
import type { ComputedColumnSpec, ComputedOperator, MetricCatalogueItem } from '../../../types/customReport'
import {
  MAX_COMPUTED,
  newComputedColumn,
  withRightMetric,
  withRightValue,
} from '../../../lib/customReportSpec'

const OPERATORS: ReadonlyArray<{ value: ComputedOperator; label: string; needsRight: boolean }> = [
  { value: 'Add', label: 'Add', needsRight: true },
  { value: 'Subtract', label: 'Subtract', needsRight: true },
  { value: 'Multiply', label: 'Multiply', needsRight: true },
  { value: 'Divide', label: 'Divide', needsRight: true },
  { value: 'PctOfTotal', label: '% of total', needsRight: false },
]

const RIGHT_KIND_OPTIONS = [
  { value: 'metric', label: 'Metric' },
  { value: 'number', label: 'Number' },
] as const

/**
 * Computed columns may only reference metrics already selected on the breakdown —
 * the API rejects any other id as "unknown".
 */
export function ComputedColumnEditor({
  columns,
  metrics,
  selectedMetricIds,
  onChange,
}: {
  columns: ComputedColumnSpec[]
  metrics: MetricCatalogueItem[]
  selectedMetricIds: string[]
  onChange: (next: ComputedColumnSpec[]) => void
}) {
  const available = metrics.filter((metric) => selectedMetricIds.includes(metric.id))
  const metricOptions = available.map((metric) => ({ value: metric.id, label: metric.label }))
  const fallbackId = selectedMetricIds[0] ?? null

  function patch(index: number, next: ComputedColumnSpec) {
    onChange(columns.map((column, i) => (i === index ? next : column)))
  }

  function addColumn() {
    const created = newComputedColumn(selectedMetricIds)
    if (!created) return
    onChange([...columns, created])
  }

  if (selectedMetricIds.length === 0) {
    return (
      <p className="text-body text-navy/50">
        Select at least one metric above before adding a computed column.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-caption text-navy/50">
        Uses metrics selected on this block, or a fixed number (e.g. billable hours × 85).
      </p>
      {columns.map((column, index) => {
        const operator = OPERATORS.find((item) => item.value === column.operator) ?? OPERATORS[0]!
        const usesLiteral = column.rightValue != null
        return (
          <div
            key={column.id}
            className="grid gap-2 rounded-xl bg-surface-muted/60 p-3 sm:grid-cols-[1fr_1fr_auto_1fr_auto]"
          >
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-navy/45">Label</span>
              <input
                value={column.label}
                onChange={(event) => patch(index, { ...column, label: event.target.value })}
                className="mt-1 w-full rounded-lg border border-navy/10 bg-white px-2.5 py-1.5 text-body text-navy outline-none focus:border-brand"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-navy/45">Left</span>
              <div className="mt-1">
                <SearchSelect
                  options={metricOptions}
                  value={selectedMetricIds.includes(column.left) ? column.left : fallbackId}
                  onChange={(value) => patch(index, { ...column, left: value ?? column.left })}
                  ariaLabel="Left metric"
                />
              </div>
            </label>
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-navy/45">Op</span>
              <div className="mt-1">
                <SearchSelect
                  options={OPERATORS.map((item) => ({ value: item.value, label: item.label }))}
                  value={column.operator}
                  onChange={(value) => {
                    const nextOp = (value as ComputedOperator | null) ?? column.operator
                    const needsRight = OPERATORS.find((item) => item.value === nextOp)?.needsRight ?? true
                    if (!needsRight) {
                      patch(index, { ...column, operator: nextOp, right: null, rightValue: null })
                      return
                    }
                    if (column.rightValue != null) {
                      patch(index, { ...column, operator: nextOp })
                      return
                    }
                    const rightFallback =
                      column.right && selectedMetricIds.includes(column.right)
                        ? column.right
                        : (selectedMetricIds.find((id) => id !== column.left) ?? column.left)
                    patch(index, withRightMetric({ ...column, operator: nextOp }, rightFallback))
                  }}
                  ariaLabel="Operator"
                />
              </div>
            </label>
            {operator.needsRight ? (
              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-navy/45">Right</span>
                <div className="mt-1 flex gap-1.5">
                  <div className="w-[92px] flex-shrink-0">
                    <SearchSelect
                      options={RIGHT_KIND_OPTIONS.map((item) => ({ ...item }))}
                      value={usesLiteral ? 'number' : 'metric'}
                      onChange={(value) =>
                        patch(
                          index,
                          value === 'number'
                            ? withRightValue(column, column.rightValue ?? 1)
                            : withRightMetric(
                                column,
                                selectedMetricIds.find((id) => id !== column.left) ?? column.left,
                              ),
                        )
                      }
                      ariaLabel="Right operand kind"
                    />
                  </div>
                  {usesLiteral ? (
                    <input
                      type="number"
                      step="any"
                      value={column.rightValue ?? ''}
                      onChange={(event) =>
                        patch(
                          index,
                          withRightValue(
                            column,
                            event.target.value === '' ? null : Number(event.target.value),
                          ),
                        )
                      }
                      aria-label="Right value"
                      className="min-w-0 flex-1 rounded-lg border border-navy/10 bg-white px-2.5 py-1.5 font-mono text-body text-navy tabular-nums outline-none focus:border-brand"
                    />
                  ) : (
                    <div className="min-w-0 flex-1">
                      <SearchSelect
                        options={metricOptions}
                        value={
                          column.right && selectedMetricIds.includes(column.right)
                            ? column.right
                            : fallbackId
                        }
                        onChange={(value) => patch(index, withRightMetric(column, value))}
                        ariaLabel="Right metric"
                      />
                    </div>
                  )}
                </div>
              </label>
            ) : (
              <div />
            )}
            <div className="flex items-end justify-end">
              <button
                type="button"
                aria-label="Remove computed column"
                onClick={() => onChange(columns.filter((_, i) => i !== index))}
                className="flex h-9 w-9 items-center justify-center rounded-full text-navy/45 hover:bg-white hover:text-red"
              >
                <Icon name="trash" className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      })}

      {columns.length < MAX_COMPUTED ? (
        <button
          type="button"
          onClick={addColumn}
          className="text-body font-medium text-brand hover:text-brand-hi"
        >
          + Add computed column
        </button>
      ) : null}
    </div>
  )
}
