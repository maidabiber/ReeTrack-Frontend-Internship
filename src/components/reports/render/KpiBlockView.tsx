import { StatTile } from '../../ui/StatTile'
import type { KpiGroupResult } from '../../../types/customReport'

export function KpiBlockView({ block }: { block: KpiGroupResult }) {
  if (block.cells.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {block.cells.map((cell) => (
        <StatTile key={cell.key} label={cell.label} value={cell.display} />
      ))}
    </div>
  )
}
