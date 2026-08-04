import { ChartCard } from '../ChartCard'
import type { ProseResult } from '../../../types/customReport'

export function ProseBlockView({ block }: { block: ProseResult }) {
  const title = block.title ?? 'Notes'

  if (block.paragraphs.length === 0) return null

  return (
    <ChartCard title={title}>
      <div className="space-y-3 text-body leading-relaxed text-navy/80">
        {block.paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
      {block.footnote ? (
        <p className="mt-3 text-caption text-navy/45">{block.footnote}</p>
      ) : null}
    </ChartCard>
  )
}
