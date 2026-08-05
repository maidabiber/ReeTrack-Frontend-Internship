import { useMemo } from 'react'
import { MAX_DIMENSIONS } from '../../../lib/customReportSpec'
import type { DimensionCatalogueItem } from '../../../types/customReport'
import { CataloguePicker, type CataloguePickerItem } from './CataloguePicker'

export function DimensionPicker({
  dimensions,
  selected,
  onChange,
  max = MAX_DIMENSIONS,
}: {
  dimensions: DimensionCatalogueItem[]
  selected: string[]
  onChange: (next: string[]) => void
  max?: number
}) {
  const items = useMemo<CataloguePickerItem[]>(
    () =>
      dimensions.map((dimension) => ({
        id: dimension.id,
        label: dimension.label,
        meta: dimension.fansOut ? 'fan-out' : null,
      })),
    [dimensions],
  )

  return (
    <CataloguePicker
      items={items}
      selected={selected}
      onChange={onChange}
      max={max}
      replaceWhenSingle
      chipColor="#2F6FED"
      placeholder="Add dimensions…"
      searchPlaceholder="Search dimensions…"
      emptyLabel="No dimensions."
      toggleLabel="Toggle dimensions list"
    />
  )
}
