import { useMemo } from 'react'
import { MAX_CHART_METRICS, MAX_METRICS } from '../../../lib/customReportSpec'
import type { MetricCatalogueItem } from '../../../types/customReport'
import { CataloguePicker, type CataloguePickerItem } from './CataloguePicker'

export function MetricPicker({
  metrics,
  selected,
  onChange,
  dimensions = [],
  max = MAX_METRICS,
  chart = false,
}: {
  metrics: MetricCatalogueItem[]
  selected: string[]
  onChange: (next: string[]) => void
  dimensions?: string[]
  max?: number
  chart?: boolean
}) {
  const limit = chart ? Math.min(max, MAX_CHART_METRICS) : max

  const items = useMemo<CataloguePickerItem[]>(
    () =>
      metrics.map((metric) => ({
        id: metric.id,
        label: metric.label,
        meta: metric.unit,
        disabledReason:
          dimensions.length > 0 &&
          metric.compatibleDimensions.length > 0 &&
          !dimensions.every((dimension) => metric.compatibleDimensions.includes(dimension))
            ? 'Not compatible with the selected dimensions'
            : null,
      })),
    [metrics, dimensions],
  )

  return (
    <CataloguePicker
      items={items}
      selected={selected}
      onChange={onChange}
      max={limit}
      chipColor="#1B2B4B"
      placeholder="Add metrics…"
      searchPlaceholder="Search metrics…"
      emptyLabel="No metrics."
      toggleLabel="Toggle metrics list"
    />
  )
}
