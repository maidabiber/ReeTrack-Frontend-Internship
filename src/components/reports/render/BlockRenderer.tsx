import type { ReportBlockResult } from '../../../types/customReport'
import { ChartBlockView } from './ChartBlockView'
import { KpiBlockView } from './KpiBlockView'
import { ProseBlockView } from './ProseBlockView'
import { TableBlockView } from './TableBlockView'

/** Renders a custom report IR block by its `type` discriminator only. */
export function BlockRenderer({ block }: { block: ReportBlockResult }) {
  switch (block.type) {
    case 'kpi':
      return <KpiBlockView block={block} />
    case 'table':
      return <TableBlockView block={block} />
    case 'series':
      return <ChartBlockView block={block} />
    case 'prose':
      return <ProseBlockView block={block} />
  }
}
