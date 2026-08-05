import { StatTile, type StatDelta } from '../../ui/StatTile'
import type { ComparisonMode, KpiCell, KpiGroupResult } from '../../../types/customReport'

const COMPARISON_CAPTIONS: Record<ComparisonMode, string> = {
  None: '',
  PreviousPeriod: 'vs previous period',
  SamePeriodLastYear: 'vs last year',
}

export function KpiBlockView({
  block,
  comparisonMode,
}: {
  block: KpiGroupResult
  comparisonMode?: ComparisonMode | null
}) {
  if (block.cells.length === 0) return null

  const caption = comparisonMode ? COMPARISON_CAPTIONS[comparisonMode] : ''

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {block.cells.map((cell) => (
        <StatTile
          key={cell.key}
          label={cell.label}
          value={cell.display}
          delta={caption ? toDelta(cell, caption) : undefined}
        />
      ))}
    </div>
  )
}

/**
 * Percent change against the comparison window. A zero baseline has no meaningful percentage
 * — going from nothing to something is not "infinity percent" — so the tile says there was no
 * prior figure instead.
 */
function toDelta(cell: KpiCell, caption: string): StatDelta {
  const previous = cell.previousValue
  if (previous == null || previous === 0 || cell.value == null) {
    return { pct: null, caption }
  }

  return { pct: ((cell.value - previous) / Math.abs(previous)) * 100, caption }
}
