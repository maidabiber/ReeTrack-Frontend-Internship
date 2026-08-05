import type { ChartBlockSpec, ChartKind, CustomReportCatalogue } from '../../../../types/customReport'
import { MAX_TOP_N, clampTopN, metricsCompatibleWith } from '../../../../lib/customReportSpec'
import { DimensionPicker } from '../DimensionPicker'
import { MetricPicker } from '../MetricPicker'

const KINDS: ReadonlyArray<{ value: ChartKind; label: string }> = [
  { value: 'Bar', label: 'Bar' },
  { value: 'Line', label: 'Line' },
  { value: 'Area', label: 'Area' },
  { value: 'Donut', label: 'Donut' },
]

export function ChartBlockEditor({
  block,
  catalogue,
  onChange,
}: {
  block: ChartBlockSpec
  catalogue: CustomReportCatalogue
  onChange: (next: ChartBlockSpec) => void
}) {
  // A donut plots one value per slice; extra series are silently dropped by the renderer.
  const isDonut = (block.kind ?? 'Bar') === 'Donut'

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Dimension</FieldLabel>
        <div className="mt-2">
          <DimensionPicker
            dimensions={catalogue.dimensions}
            selected={block.dimension ? [block.dimension] : []}
            max={1}
            onChange={(dimensions) => {
              const dimension = dimensions[0] ?? block.dimension
              // A chart always has exactly one dimension, so clearing the chip keeps the
              // current one rather than producing a spec the server rejects.
              onChange({
                ...block,
                dimension,
                metrics: metricsCompatibleWith(block.metrics, [dimension], catalogue.metrics),
              })
            }}
          />
        </div>
      </div>

      <div>
        <FieldLabel>Metrics</FieldLabel>
        <div className="mt-2">
          <MetricPicker
            metrics={catalogue.metrics}
            selected={block.metrics}
            dimensions={block.dimension ? [block.dimension] : []}
            chart
            max={isDonut ? 1 : undefined}
            onChange={(metrics) => onChange({ ...block, metrics })}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel>Kind</FieldLabel>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {KINDS.map((kind) => {
              const active = (block.kind ?? 'Bar') === kind.value
              return (
                <button
                  key={kind.value}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...block,
                      kind: kind.value,
                      metrics:
                        kind.value === 'Donut' ? block.metrics.slice(0, 1) : block.metrics,
                    })
                  }
                  className={`rounded-full px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors ${
                    active ? 'bg-navy text-cream' : 'bg-surface-muted text-navy/70 hover:bg-navy/10'
                  }`}
                >
                  {kind.label}
                </button>
              )
            })}
          </div>
        </div>

        <label className="block">
          <FieldLabel>Top N</FieldLabel>
          <input
            type="number"
            min={1}
            max={MAX_TOP_N}
            value={block.topN ?? ''}
            placeholder="All"
            onChange={(event) => onChange({ ...block, topN: clampTopN(event.target.value) })}
            className="mt-1 w-full rounded-lg border border-navy/10 bg-white px-2.5 py-1.5 font-mono text-body text-navy tabular-nums"
          />
        </label>
      </div>

      {isDonut ? (
        <p className="text-caption text-navy/50">
          A donut shows one metric split across slices — only the first metric is plotted.
        </p>
      ) : null}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-navy/45">{children}</p>
  )
}
