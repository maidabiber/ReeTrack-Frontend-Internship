import type { ComparisonMode, ReportBlockResult } from '../../../types/customReport'
import { ChartBlockView } from './ChartBlockView'
import { KpiBlockView } from './KpiBlockView'
import { ProseBlockView } from './ProseBlockView'
import { TableBlockView } from './TableBlockView'

/** Renders a custom report IR block by its `type` discriminator only. */
export function BlockRenderer({
  block,
  comparisonMode,
}: {
  block: ReportBlockResult
  /** Labels the KPI deltas; omit when the report ran without a baseline. */
  comparisonMode?: ComparisonMode | null
}) {
  switch (block.type) {
    case 'kpi':
      return <KpiBlockView block={block} comparisonMode={comparisonMode} />
    case 'table':
      return <TableBlockView block={block} />
    case 'series':
      return <ChartBlockView block={block} />
    case 'prose':
      return <ProseBlockView block={block} />
  }
}
