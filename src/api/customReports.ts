import type {
  BlockTypeCatalogueItem,
  CustomReportCatalogue,
  CustomReportResult,
  CustomReportSpec,
  DimensionCatalogueItem,
  EntryColumnCatalogueItem,
  KpiCell,
  KpiGroupResult,
  MetricCatalogueItem,
  NamedSeries,
  ProseResult,
  ReportBlockResult,
  SeriesResult,
  TableCell,
  TableColumn,
  TableResult,
  TableRow,
} from '../types/customReport'
import type { ReportBasis, ReportKpis } from '../types/report'
import { apiClient } from './client'

/** Mirrors backend CustomReportCatalogueResponse (camelCase JSON). */
interface CustomReportCatalogueResponse {
  dimensions: DimensionCatalogueItemResponse[]
  metrics: MetricCatalogueItemResponse[]
  blockTypes: BlockTypeCatalogueItemResponse[]
  entryColumns: EntryColumnCatalogueItemResponse[]
  operators: string[]
}

interface DimensionCatalogueItemResponse {
  id: string
  label: string
  fansOut: boolean
}

interface MetricCatalogueItemResponse {
  id: string
  label: string
  unit: MetricCatalogueItem['unit']
  scope: MetricCatalogueItem['scope']
  compatibleDimensions: string[]
}

interface BlockTypeCatalogueItemResponse {
  type: string
  label: string
}

interface EntryColumnCatalogueItemResponse {
  id: string
  label: string
}

/** Mirrors backend CustomReportRunResponse (camelCase JSON). */
interface CustomReportRunResponse {
  kpis: ReportKpisResponse
  basis: ReportBasisResponse
  generatedAtUtc: string
  generatedByName: string | null
  firstEntryDate: string | null
  filterFromDate: string | null
  filterToDate: string | null
  blocks: ReportBlockResultResponse[]
  warnings: string[]
}

interface ReportKpisResponse {
  totalSeconds: number
  billableSeconds: number
  nonBillableSeconds: number
  billablePct: number
  entryCount: number
  activeMembers: number
  activeProjects: number
  overtimeHours: number
  weekendHours: number
  holidayHours: number
  unassignedSeconds: number
}

interface ReportBasisResponse {
  weekendPremium: number
  holidayPremium: number
  overtimePremium: number
  weeklyOvertimeThresholdHours: number
}

type ReportBlockResultResponse =
  | KpiGroupResultResponse
  | TableResultResponse
  | SeriesResultResponse
  | ProseResultResponse

interface ReportBlockResultBaseResponse {
  id: string
  title?: string | null
  footnote?: string | null
}

interface KpiGroupResultResponse extends ReportBlockResultBaseResponse {
  type: 'kpi'
  cells: KpiCellResponse[]
}

interface KpiCellResponse {
  key: string
  label: string
  value: number | null
  unit: KpiCell['unit']
  currencyCode?: string | null
  display: string
}

interface TableResultResponse extends ReportBlockResultBaseResponse {
  type: 'table'
  columns: TableColumnResponse[]
  rows: TableRowResponse[]
  totals?: TableRowResponse | null
}

interface TableColumnResponse {
  key: string
  label: string
  columnType: TableColumn['columnType']
  currencyCode?: string | null
}

interface TableRowResponse {
  key: string
  cells: Record<string, TableCellResponse>
}

interface TableCellResponse {
  number: number | null
  display: string
}

interface SeriesResultResponse extends ReportBlockResultBaseResponse {
  type: 'series'
  kind: SeriesResult['kind']
  categories: string[]
  series: NamedSeriesResponse[]
}

interface NamedSeriesResponse {
  key: string
  label: string
  values: number[]
}

interface ProseResultResponse extends ReportBlockResultBaseResponse {
  type: 'prose'
  paragraphs: string[]
}

function toKpis(response: ReportKpisResponse): ReportKpis {
  return {
    totalSeconds: response.totalSeconds,
    billableSeconds: response.billableSeconds,
    nonBillableSeconds: response.nonBillableSeconds,
    billablePct: response.billablePct,
    entryCount: response.entryCount,
    activeMembers: response.activeMembers,
    activeProjects: response.activeProjects,
    overtimeHours: response.overtimeHours,
    weekendHours: response.weekendHours,
    holidayHours: response.holidayHours,
    unassignedSeconds: response.unassignedSeconds,
  }
}

function toBasis(response: ReportBasisResponse): ReportBasis {
  return {
    weekendPremium: response.weekendPremium,
    holidayPremium: response.holidayPremium,
    overtimePremium: response.overtimePremium,
    weeklyOvertimeThresholdHours: response.weeklyOvertimeThresholdHours,
  }
}

function toKpiCell(response: KpiCellResponse): KpiCell {
  return {
    key: response.key,
    label: response.label,
    value: response.value,
    unit: response.unit,
    currencyCode: response.currencyCode ?? null,
    display: response.display,
  }
}

function toTableCell(response: TableCellResponse): TableCell {
  return {
    number: response.number,
    display: response.display,
  }
}

function toTableRow(response: TableRowResponse): TableRow {
  const cells: Record<string, TableCell> = {}
  for (const [key, cell] of Object.entries(response.cells ?? {})) {
    cells[key] = toTableCell(cell)
  }
  return { key: response.key, cells }
}

function toTableColumn(response: TableColumnResponse): TableColumn {
  return {
    key: response.key,
    label: response.label,
    columnType: response.columnType,
    currencyCode: response.currencyCode ?? null,
  }
}

function toNamedSeries(response: NamedSeriesResponse): NamedSeries {
  return {
    key: response.key,
    label: response.label,
    values: response.values ?? [],
  }
}

function toBlockResult(response: ReportBlockResultResponse): ReportBlockResult {
  switch (response.type) {
    case 'kpi':
      return {
        type: 'kpi',
        id: response.id,
        title: response.title ?? null,
        footnote: response.footnote ?? null,
        cells: (response.cells ?? []).map(toKpiCell),
      } satisfies KpiGroupResult
    case 'table':
      return {
        type: 'table',
        id: response.id,
        title: response.title ?? null,
        footnote: response.footnote ?? null,
        columns: (response.columns ?? []).map(toTableColumn),
        rows: (response.rows ?? []).map(toTableRow),
        totals: response.totals ? toTableRow(response.totals) : null,
      } satisfies TableResult
    case 'series':
      return {
        type: 'series',
        id: response.id,
        title: response.title ?? null,
        footnote: response.footnote ?? null,
        kind: response.kind,
        categories: response.categories ?? [],
        series: (response.series ?? []).map(toNamedSeries),
      } satisfies SeriesResult
    case 'prose':
      return {
        type: 'prose',
        id: response.id,
        title: response.title ?? null,
        footnote: response.footnote ?? null,
        paragraphs: response.paragraphs ?? [],
      } satisfies ProseResult
  }
}

function toCustomReportResult(response: CustomReportRunResponse): CustomReportResult {
  return {
    kpis: toKpis(response.kpis),
    basis: toBasis(response.basis),
    generatedAtUtc: response.generatedAtUtc,
    generatedByName: response.generatedByName,
    firstEntryDate: response.firstEntryDate,
    filterFromDate: response.filterFromDate ?? null,
    filterToDate: response.filterToDate ?? null,
    blocks: (response.blocks ?? []).map(toBlockResult),
    warnings: response.warnings ?? [],
  }
}

function toDimensionItem(response: DimensionCatalogueItemResponse): DimensionCatalogueItem {
  return {
    id: response.id,
    label: response.label,
    fansOut: response.fansOut,
  }
}

function toMetricItem(response: MetricCatalogueItemResponse): MetricCatalogueItem {
  return {
    id: response.id,
    label: response.label,
    unit: response.unit,
    scope: response.scope,
    compatibleDimensions: response.compatibleDimensions ?? [],
  }
}

function toBlockTypeItem(response: BlockTypeCatalogueItemResponse): BlockTypeCatalogueItem {
  return { type: response.type, label: response.label }
}

function toEntryColumnItem(response: EntryColumnCatalogueItemResponse): EntryColumnCatalogueItem {
  return { id: response.id, label: response.label }
}

function toCatalogue(response: CustomReportCatalogueResponse): CustomReportCatalogue {
  return {
    dimensions: (response.dimensions ?? []).map(toDimensionItem),
    metrics: (response.metrics ?? []).map(toMetricItem),
    blockTypes: (response.blockTypes ?? []).map(toBlockTypeItem),
    entryColumns: (response.entryColumns ?? []).map(toEntryColumnItem),
    operators: response.operators ?? [],
  }
}

/** Admin custom report catalogue — GET /api/reports/custom/catalogue. */
export function getCustomReportCatalogue(): Promise<CustomReportCatalogue> {
  return apiClient
    .get<CustomReportCatalogueResponse>('/reports/custom/catalogue')
    .then(toCatalogue)
}

/** Run a custom report spec — POST /api/reports/custom/run. */
export function runCustomReport(spec: CustomReportSpec): Promise<CustomReportResult> {
  return apiClient
    .post<CustomReportRunResponse>('/reports/custom/run', { spec })
    .then(toCustomReportResult)
}
