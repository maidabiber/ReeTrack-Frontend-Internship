import type { CustomReportCatalogue, KpiBlockSpec } from '../../../../types/customReport'
import { MetricPicker } from '../MetricPicker'

export function KpiBlockEditor({
  block,
  catalogue,
  onChange,
}: {
  block: KpiBlockSpec
  catalogue: CustomReportCatalogue
  onChange: (next: KpiBlockSpec) => void
}) {
  return (
    <div className="space-y-3">
      <FieldLabel>Metrics</FieldLabel>
      <MetricPicker
        metrics={catalogue.metrics}
        selected={block.metrics}
        onChange={(metrics) => onChange({ ...block, metrics })}
      />
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-navy/45">{children}</p>
  )
}
