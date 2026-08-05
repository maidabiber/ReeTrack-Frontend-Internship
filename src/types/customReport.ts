import type { ReportBasis, ReportKpis } from './report'
import type { ReportGroupBy, ReportQuery } from './reportQuery'

/** Spec types — mirrors backend CustomReportSpec (camelCase JSON, `type` discriminators). */

export type ComputedOperator = 'Add' | 'Subtract' | 'Multiply' | 'Divide' | 'PctOfTotal'

export type ChartKind = 'Bar' | 'Line' | 'Area' | 'Donut'

export type MetricUnit = 'Hours' | 'Money' | 'Percent' | 'Count' | 'Rate'

export type MetricScope = 'Entry' | 'Project' | 'User'

export type TableColumnType = 'Text' | 'Integer' | 'Hours' | 'Money' | 'Percent' | 'Date'

export interface ComputedColumnSpec {
  id: string
  label: string
  left: string
  operator: ComputedOperator
  /** Another metric on the same block. Mutually exclusive with `rightValue`. */
  right?: string | null
  /** Literal number, for cases two metrics cannot express (hours × a rate). */
  rightValue?: number | null
}

interface ReportBlockSpecBase {
  id: string
  title?: string | null
}

export interface KpiBlockSpec extends ReportBlockSpecBase {
  type: 'kpi'
  metrics: string[]
}

export interface BreakdownBlockSpec extends ReportBlockSpecBase {
  type: 'breakdown'
  dimensions: string[]
  metrics: string[]
  computed?: ComputedColumnSpec[]
  sortKey?: string | null
  sortDescending?: boolean
  topN?: number | null
  includeOthers?: boolean
  showTotals?: boolean
}

export interface ChartBlockSpec extends ReportBlockSpecBase {
  type: 'chart'
  dimension: string
  metrics: string[]
  kind?: ChartKind
  topN?: number | null
}

export interface EntriesBlockSpec extends ReportBlockSpecBase {
  type: 'entries'
  columns: string[]
  groupBy?: ReportGroupBy[]
  limit?: number
}

export interface NoteBlockSpec extends ReportBlockSpecBase {
  type: 'note'
  text: string
}

export interface NarrativeBlockSpec extends ReportBlockSpecBase {
  type: 'narrative'
  focus?: string | null
  cachedText?: string | null
  generatedAtUtc?: string | null
}

export type ReportBlockSpec =
  | KpiBlockSpec
  | BreakdownBlockSpec
  | ChartBlockSpec
  | EntriesBlockSpec
  | NoteBlockSpec
  | NarrativeBlockSpec

export interface CustomReportSpec {
  version: number
  query: ReportQuery
  blocks: ReportBlockSpec[]
}

/** IR block results — mirrors backend ReportBlockResult (`type` discriminators). */

interface ReportBlockResultBase {
  id: string
  title?: string | null
  footnote?: string | null
}

export interface KpiCell {
  key: string
  label: string
  value: number | null
  unit: MetricUnit
  currencyCode?: string | null
  display: string
}

export interface KpiGroupResult extends ReportBlockResultBase {
  type: 'kpi'
  cells: KpiCell[]
}

export interface TableColumn {
  key: string
  label: string
  columnType: TableColumnType
  currencyCode?: string | null
}

export interface TableCell {
  number: number | null
  display: string
}

export type TableRowKind = 'Detail' | 'GroupHeader' | 'GroupSubtotal'

export interface TableRow {
  key: string
  cells: Record<string, TableCell>
  /** Detail unless the row is a grouping header/subtotal produced by an entries block's groupBy. */
  kind?: TableRowKind
  /** Nesting depth for multi-level grouping; 0 on an ungrouped table or a top-level group. */
  depth?: number
}

export interface TableResult extends ReportBlockResultBase {
  type: 'table'
  columns: TableColumn[]
  rows: TableRow[]
  totals?: TableRow | null
}

export interface NamedSeries {
  key: string
  label: string
  values: number[]
}

export interface SeriesResult extends ReportBlockResultBase {
  type: 'series'
  kind: ChartKind
  categories: string[]
  series: NamedSeries[]
}

export interface ProseResult extends ReportBlockResultBase {
  type: 'prose'
  paragraphs: string[]
}

export type ReportBlockResult = KpiGroupResult | TableResult | SeriesResult | ProseResult

export interface CustomReportResult {
  kpis: ReportKpis
  basis: ReportBasis
  generatedAtUtc: string
  generatedByName: string | null
  firstEntryDate: string | null
  filterFromDate: string | null
  filterToDate: string | null
  blocks: ReportBlockResult[]
  warnings: string[]
}

/** Catalogue — mirrors backend CustomReportCatalogueDto. */

export interface DimensionCatalogueItem {
  id: string
  label: string
  fansOut: boolean
}

export interface MetricCatalogueItem {
  id: string
  label: string
  unit: MetricUnit
  scope: MetricScope
  compatibleDimensions: string[]
}

export interface BlockTypeCatalogueItem {
  type: string
  label: string
}

export interface EntryColumnCatalogueItem {
  id: string
  label: string
}

export interface CustomReportCatalogue {
  dimensions: DimensionCatalogueItem[]
  metrics: MetricCatalogueItem[]
  blockTypes: BlockTypeCatalogueItem[]
  entryColumns: EntryColumnCatalogueItem[]
  operators: string[]
}

/** Shared is visible to every admin; Private is visible only to its creator. */
export type CustomReportVisibility = 'Private' | 'Shared'

/** Saved definition — mirrors backend CustomReportDefinitionResponse. */
export interface CustomReportDefinition {
  id: string
  name: string
  description: string | null
  spec: CustomReportSpec
  schemaVersion: number
  createdByUserId: string
  visibility: CustomReportVisibility
  createdAtUtc: string
  updatedAtUtc: string
  canEdit: boolean
}

export interface SaveCustomReportDefinitionInput {
  name: string
  description?: string | null
  spec: CustomReportSpec
  visibility: CustomReportVisibility
}

/** Narrows the library list to the caller's own reports or every Shared one; omit for both. */
export type CustomReportOwnerFilter = 'mine' | 'shared'
