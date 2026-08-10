import { BlockRenderer } from './render/BlockRenderer'
import { formatPeriodLabel } from '../../lib/reportView'
import type { ComparisonMode, ReportBlockResult } from '../../types/customReport'

export interface CustomReportPanelProps {
  blocks: ReportBlockResult[]
  warnings: string[]
  comparison?: { mode: ComparisonMode } | null
  filterFromDate: string | null
  filterToDate: string | null
  firstEntryDate: string | null
  generatedAtUtc: string
}

export function CustomReportPanel({
  blocks,
  warnings,
  comparison,
  filterFromDate,
  filterToDate,
  firstEntryDate,
  generatedAtUtc,
}: CustomReportPanelProps) {
  return (
    <>
      <p className="mt-1 text-sm text-navy/50">
        {formatPeriodLabel({ filterFromDate, filterToDate, firstEntryDate, generatedAtUtc })}
      </p>
      {warnings.length > 0 ? (
        <div className="mb-4 rounded-lg bg-brand-tint px-4 py-3 text-body text-navy">
          {warnings.join(' ')}
        </div>
      ) : null}
      <div className="space-y-4">
        {blocks.map((block) => (
          <BlockRenderer key={block.id} block={block} comparisonMode={comparison?.mode} />
        ))}
      </div>
    </>
  )
}
