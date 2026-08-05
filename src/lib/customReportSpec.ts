import { cloneReportQuery, defaultReportQuery } from './reportQuery'
import type {
  ChartKind,
  ComparisonMode,
  ComputedColumnSpec,
  CustomReportSpec,
  ReportBlockSpec,
} from '../types/customReport'

export const MAX_BLOCKS = 12
export const MAX_METRICS = 8
export const MAX_CHART_METRICS = 3
export const MAX_DIMENSIONS = 2
export const MAX_COMPUTED = 4
export const MAX_ENTRIES_LIMIT = 1000
export const MAX_NOTE_LENGTH = 2000
/** Mirrors BlockEvaluators.MaxBreakdownRows — the server clamps topN to this. */
export const MAX_TOP_N = 500

export type BlockTypeId = ReportBlockSpec['type']

/** Shared by the breakdown and chart Top N inputs. */
export function clampTopN(raw: string): number | null {
  if (raw === '') return null
  return Math.min(MAX_TOP_N, Math.max(1, Number(raw) || 1))
}

export function emptyCustomReportSpec(): CustomReportSpec {
  return {
    version: 1,
    query: defaultReportQuery(),
    blocks: [],
    comparison: 'None',
  }
}

export const COMPARISON_OPTIONS: ReadonlyArray<{ value: ComparisonMode; label: string }> = [
  { value: 'None', label: 'No comparison' },
  { value: 'PreviousPeriod', label: 'vs previous period' },
  { value: 'SamePeriodLastYear', label: 'vs same period last year' },
]

export function cloneSpec(spec: CustomReportSpec): CustomReportSpec {
  return {
    version: spec.version,
    query: cloneReportQuery(spec.query),
    blocks: spec.blocks.map(cloneBlock),
    comparison: spec.comparison ?? 'None',
  }
}

export function cloneBlock(block: ReportBlockSpec): ReportBlockSpec {
  switch (block.type) {
    case 'kpi':
      return { ...block, metrics: [...block.metrics] }
    case 'breakdown':
      return {
        ...block,
        dimensions: [...block.dimensions],
        metrics: [...block.metrics],
        computed: (block.computed ?? []).map((column) => ({ ...column })),
      }
    case 'chart':
      return { ...block, metrics: [...block.metrics] }
    case 'entries':
      return {
        ...block,
        columns: [...block.columns],
        groupBy: [...(block.groupBy ?? [])],
      }
    case 'note':
    case 'narrative':
      return { ...block }
  }
}

/** Stable cache key — sorted object keys, array order preserved. */
export function specHash(spec: CustomReportSpec): string {
  return JSON.stringify(sortKeys(cloneSpec(spec)))
}

export function specsEqual(left: CustomReportSpec, right: CustomReportSpec): boolean {
  return specHash(left) === specHash(right)
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(record).sort()) {
      sorted[key] = sortKeys(record[key])
    }
    return sorted
  }
  return value
}

export function newBlockId(): string {
  return crypto.randomUUID()
}

/** Sensible catalogue seeds so a freshly-added block validates on run. */
export function createBlock(type: BlockTypeId): ReportBlockSpec {
  const id = newBlockId()
  switch (type) {
    case 'kpi':
      return { type: 'kpi', id, metrics: ['totalHours'] }
    case 'breakdown':
      return {
        type: 'breakdown',
        id,
        title: 'Breakdown',
        dimensions: ['client'],
        metrics: ['totalHours'],
        computed: [],
        sortDescending: true,
        includeOthers: false,
        showTotals: true,
      }
    case 'chart':
      return {
        type: 'chart',
        id,
        title: 'Chart',
        dimension: 'week',
        metrics: ['totalHours'],
        kind: 'Bar' satisfies ChartKind,
      }
    case 'entries':
      return {
        type: 'entries',
        id,
        title: 'Entries',
        columns: ['date', 'user', 'project', 'hours'],
        groupBy: [],
        limit: 100,
      }
    case 'note':
      return { type: 'note', id, text: '' }
    case 'narrative':
      return { type: 'narrative', id }
  }
}

export function addBlock(
  spec: CustomReportSpec,
  type: BlockTypeId,
  atIndex?: number,
): CustomReportSpec {
  // No-ops return the same reference so React can skip the re-render, and so the
  // draft/applied dirty check does not flip on a change that never happened.
  if (spec.blocks.length >= MAX_BLOCKS) return spec
  const next = cloneSpec(spec)
  const block = createBlock(type)
  const index = atIndex === undefined ? next.blocks.length : Math.max(0, Math.min(atIndex, next.blocks.length))
  next.blocks.splice(index, 0, block)
  return next
}

export function removeBlock(spec: CustomReportSpec, blockId: string): CustomReportSpec {
  if (!spec.blocks.some((block) => block.id === blockId)) return spec
  const next = cloneSpec(spec)
  next.blocks = next.blocks.filter((block) => block.id !== blockId)
  return next
}

export function duplicateBlock(spec: CustomReportSpec, blockId: string): CustomReportSpec {
  if (spec.blocks.length >= MAX_BLOCKS) return spec
  if (!spec.blocks.some((block) => block.id === blockId)) return spec
  const next = cloneSpec(spec)
  const index = next.blocks.findIndex((block) => block.id === blockId)
  const copy = cloneBlock(next.blocks[index]!)
  const duplicated = { ...copy, id: newBlockId() } as ReportBlockSpec
  next.blocks.splice(index + 1, 0, duplicated)
  return next
}

export function moveBlock(spec: CustomReportSpec, fromIndex: number, toIndex: number): CustomReportSpec {
  if (
    fromIndex < 0 ||
    fromIndex >= spec.blocks.length ||
    toIndex < 0 ||
    toIndex >= spec.blocks.length ||
    fromIndex === toIndex
  ) {
    return spec
  }
  const next = cloneSpec(spec)
  const [block] = next.blocks.splice(fromIndex, 1)
  if (!block) return next
  next.blocks.splice(toIndex, 0, block)
  return next
}

export function updateBlock(
  spec: CustomReportSpec,
  blockId: string,
  updater: (block: ReportBlockSpec) => ReportBlockSpec,
): CustomReportSpec {
  const index = spec.blocks.findIndex((block) => block.id === blockId)
  if (index < 0) return spec
  const next = cloneSpec(spec)
  next.blocks[index] = updater(next.blocks[index]!)
  return next
}

export function replaceBlock(spec: CustomReportSpec, block: ReportBlockSpec): CustomReportSpec {
  return updateBlock(spec, block.id, () => cloneBlock(block))
}

/**
 * Metrics are validated against the block's dimensions server-side. Changing the
 * dimensions can strand a metric that was legal before (revenue is project-scope, so it
 * survives `client` but not `day`) and the report then fails on Run with a 400 that
 * points at a picker the user is no longer looking at. Prune instead.
 */
export function metricsCompatibleWith(
  metricIds: string[],
  dimensions: string[],
  catalogueMetrics: ReadonlyArray<{ id: string; compatibleDimensions: string[] }>,
): string[] {
  if (dimensions.length === 0) return metricIds
  const byId = new Map(catalogueMetrics.map((metric) => [metric.id, metric]))
  return metricIds.filter((id) => {
    const metric = byId.get(id)
    if (!metric || metric.compatibleDimensions.length === 0) return true
    return dimensions.every((dimension) => metric.compatibleDimensions.includes(dimension))
  })
}

/** Only metrics and computed columns carry values the server can order rows by. */
export function sortableKeys(block: {
  metrics: string[]
  computed?: Array<{ id: string }>
}): string[] {
  return [...block.metrics, ...(block.computed ?? []).map((column) => column.id)]
}

/** Left/right must be metrics already selected on the breakdown (server validates that). */
export function newComputedColumn(availableMetricIds: string[]): ComputedColumnSpec | null {
  const left = availableMetricIds[0]
  if (!left) return null
  const right = availableMetricIds.find((id) => id !== left)
  return {
    id: newBlockId(),
    label: 'Computed',
    left,
    operator: right ? 'Divide' : 'PctOfTotal',
    right: right ?? null,
    rightValue: null,
  }
}

/** The server accepts a metric id or a literal, never both. */
export function withRightMetric(column: ComputedColumnSpec, right: string | null): ComputedColumnSpec {
  return { ...column, right, rightValue: null }
}

export function withRightValue(column: ComputedColumnSpec, rightValue: number | null): ComputedColumnSpec {
  return { ...column, right: null, rightValue }
}
