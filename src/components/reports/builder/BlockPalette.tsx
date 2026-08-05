import { useDraggable } from '@dnd-kit/core'
import { Icon } from '../../ui/Icon'
import type { BlockTypeCatalogueItem } from '../../../types/customReport'
import { MAX_BLOCKS, type BlockTypeId } from '../../../lib/customReportSpec'
import { PALETTE_PREFIX } from './paletteIds'

const GROUPS: ReadonlyArray<{ label: string; types: BlockTypeId[] }> = [
  { label: 'Numbers', types: ['kpi', 'breakdown', 'entries'] },
  { label: 'Charts', types: ['chart'] },
  { label: 'Prose', types: ['note', 'narrative'] },
]

export function BlockPalette({
  blockTypes,
  blockCount,
  onAdd,
}: {
  blockTypes: BlockTypeCatalogueItem[]
  blockCount: number
  onAdd: (type: BlockTypeId) => void
}) {
  const labelByType = new Map(blockTypes.map((item) => [item.type, item.label]))
  const atCap = blockCount >= MAX_BLOCKS

  return (
    <div className="flex h-full flex-col">
      <p className="font-mono text-eyebrow uppercase tracking-[0.12em] text-navy/45">Blocks</p>
      <p className="mt-1 text-caption text-navy/50">
        {atCap ? `Limit of ${MAX_BLOCKS} blocks reached.` : 'Drag onto the canvas, or tap to add.'}
      </p>

      <div className="mt-4 space-y-5">
        {GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-navy/40">
              {group.label}
            </p>
            <ul className="space-y-1.5">
              {group.types.map((type) => (
                <PaletteItem
                  key={type}
                  type={type}
                  label={labelByType.get(type) ?? type}
                  disabled={atCap}
                  onAdd={() => onAdd(type)}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

function PaletteItem({
  type,
  label,
  disabled,
  onAdd,
}: {
  type: BlockTypeId
  label: string
  disabled: boolean
  onAdd: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${PALETTE_PREFIX}${type}`,
    disabled,
    data: { fromPalette: true, blockType: type },
  })

  return (
    <li>
      <div
        ref={setNodeRef}
        className={`flex items-center gap-1 rounded-xl bg-white shadow-soft ${
          isDragging ? 'opacity-40' : ''
        } ${disabled ? 'opacity-50' : ''}`}
      >
        <button
          type="button"
          aria-label={`Drag ${label}`}
          disabled={disabled}
          className="flex h-10 w-9 flex-shrink-0 cursor-grab items-center justify-center text-navy/35 hover:text-navy disabled:cursor-not-allowed active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <span aria-hidden="true" className="font-mono text-sm leading-none tracking-tighter">
            ⠿
          </span>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onAdd}
          className="flex min-w-0 flex-1 items-center justify-between gap-2 py-2.5 pr-3 text-left text-body font-medium text-navy hover:text-brand disabled:cursor-not-allowed"
        >
          <span className="truncate">{label}</span>
          <Icon name="plus" className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />
        </button>
      </div>
    </li>
  )
}
