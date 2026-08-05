import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useMemo, useState, type ReactNode } from 'react'
import type {
  BlockTypeCatalogueItem,
  CustomReportCatalogue,
  CustomReportSpec,
  ReportBlockResult,
  ReportBlockSpec,
} from '../../../types/customReport'
import { MAX_BLOCKS, type BlockTypeId } from '../../../lib/customReportSpec'
import { BlockPalette } from './BlockPalette'
import { paletteTypeFromId } from './paletteIds'
import { SortableBlockCard } from './SortableBlockCard'

export function BuilderDndShell({
  blocks,
  catalogue,
  onBlocksChange,
  onAdd,
  children,
}: {
  blocks: ReportBlockSpec[]
  catalogue: CustomReportCatalogue
  onBlocksChange: (blocks: ReportBlockSpec[]) => void
  onAdd: (type: BlockTypeId, atIndex?: number) => void
  children: (args: {
    dropIndex: number | null
    openMenuId: string | null
    setOpenMenuId: (id: string | null) => void
  }) => ReactNode
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const activePaletteType = activeId ? paletteTypeFromId(activeId) : null
  const activeBlock = activeId ? blocks.find((block) => block.id === activeId) : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
    setOpenMenuId(null)
  }

  function handleDragOver(event: {
    over: { id: string | number } | null
    active: { id: string | number }
  }) {
    const overId = event.over ? String(event.over.id) : null
    if (!overId || !paletteTypeFromId(String(event.active.id))) {
      setDropIndex(null)
      return
    }
    if (overId === 'canvas-end') {
      setDropIndex(blocks.length)
      return
    }
    const index = blocks.findIndex((block) => block.id === overId)
    setDropIndex(index >= 0 ? index : null)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    const activeDragId = String(active.id)
    const paletteType = paletteTypeFromId(activeDragId)
    const insertAt = dropIndex

    setActiveId(null)
    setDropIndex(null)

    if (paletteType) {
      if (!over && insertAt === null) return
      if (blocks.length >= MAX_BLOCKS) return
      onAdd(paletteType, insertAt ?? blocks.length)
      return
    }

    if (!over || activeDragId === String(over.id)) return
    const fromIndex = blocks.findIndex((block) => block.id === activeDragId)
    const toIndex = blocks.findIndex((block) => block.id === String(over.id))
    if (fromIndex < 0 || toIndex < 0) return
    onBlocksChange(arrayMove(blocks, fromIndex, toIndex))
  }

  function handleDragCancel() {
    setActiveId(null)
    setDropIndex(null)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      accessibility={{
        announcements: {
          onDragStart({ active }) {
            return `Picked up ${String(active.id)}`
          },
          onDragOver({ active, over }) {
            if (!over) return `Item ${String(active.id)} is no longer over a droppable area`
            return `Item ${String(active.id)} is over ${String(over.id)}`
          },
          onDragEnd({ active, over }) {
            if (!over) return `Item ${String(active.id)} was dropped`
            return `Item ${String(active.id)} was dropped over ${String(over.id)}`
          },
          onDragCancel({ active }) {
            return `Dragging ${String(active.id)} was cancelled`
          },
        },
      }}
    >
      {children({ dropIndex, openMenuId, setOpenMenuId })}

      <DragOverlay dropAnimation={null}>
        {activePaletteType ? (
          <div className="rounded-xl bg-white px-4 py-3 text-body font-medium text-navy shadow-dropdown">
            {catalogue.blockTypes.find((item) => item.type === activePaletteType)?.label ??
              activePaletteType}
          </div>
        ) : activeBlock ? (
          <div className="rounded-2xl bg-white px-4 py-3 font-display text-body font-bold text-navy shadow-dropdown">
            {activeBlock.title || activeBlock.type}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

export function BlockCanvasList({
  blocks,
  spec,
  catalogue,
  previews,
  compactEditors,
  dropIndex,
  openMenuId,
  setOpenMenuId,
  onUpdate,
  onDuplicate,
  onRemove,
  onMove,
}: {
  blocks: ReportBlockSpec[]
  spec: CustomReportSpec
  catalogue: CustomReportCatalogue
  previews: Map<string, ReportBlockResult>
  compactEditors?: boolean
  dropIndex: number | null
  openMenuId: string | null
  setOpenMenuId: (id: string | null) => void
  onUpdate: (block: ReportBlockSpec) => void
  onDuplicate: (blockId: string) => void
  onRemove: (blockId: string) => void
  onMove: (fromIndex: number, toIndex: number) => void
}) {
  const ids = useMemo(() => blocks.map((block) => block.id), [blocks])
  const { setNodeRef: setCanvasEndRef } = useDroppable({ id: 'canvas-end' })

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-eyebrow uppercase tracking-[0.12em] text-navy/45">Canvas</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-navy/35 tabular-nums">
          {blocks.length}/{MAX_BLOCKS}
        </p>
      </div>

      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {blocks.length === 0 ? (
          <div
            ref={setCanvasEndRef}
            className="rounded-2xl border border-dashed border-navy/15 bg-white/60 px-6 py-12 text-center"
          >
            <p className="font-display text-base font-bold text-navy">Add your first block</p>
            <p className="mt-1 text-body text-navy/55">
              Start with a KPI row, then a breakdown or chart.
            </p>
            {dropIndex === 0 || dropIndex === blocks.length ? <DropBand /> : null}
          </div>
        ) : null}

        {blocks.map((block, index) => (
          <div key={block.id}>
            {dropIndex === index ? <DropBand /> : null}
            <SortableBlockCard
              block={block}
              spec={spec}
              catalogue={catalogue}
              preview={previews.get(block.id) ?? null}
              collapsedDefault={compactEditors}
              canMoveUp={index > 0}
              canMoveDown={index < blocks.length - 1}
              menuOpen={openMenuId === block.id}
              onToggleMenu={(event) => {
                event.stopPropagation()
                setOpenMenuId(openMenuId === block.id ? null : block.id)
              }}
              onChange={onUpdate}
              onDuplicate={() => {
                setOpenMenuId(null)
                onDuplicate(block.id)
              }}
              onRemove={() => {
                setOpenMenuId(null)
                onRemove(block.id)
              }}
              onMoveUp={() => {
                setOpenMenuId(null)
                onMove(index, index - 1)
              }}
              onMoveDown={() => {
                setOpenMenuId(null)
                onMove(index, index + 1)
              }}
            />
          </div>
        ))}
        {blocks.length > 0 ? (
          <div ref={setCanvasEndRef}>{dropIndex === blocks.length ? <DropBand /> : null}</div>
        ) : null}
      </SortableContext>
    </div>
  )
}

function DropBand() {
  return <div className="my-1 h-2 rounded-full bg-brand-tint" aria-hidden="true" />
}

export function BlockPalettePane({
  blockTypes,
  blockCount,
  onAdd,
}: {
  blockTypes: BlockTypeCatalogueItem[]
  blockCount: number
  onAdd: (type: BlockTypeId) => void
}) {
  return (
    <aside className="sticky top-16 rounded-2xl bg-white p-4 shadow-card lg:max-h-[calc(100vh-8.5rem)] lg:overflow-y-auto">
      <BlockPalette blockTypes={blockTypes} blockCount={blockCount} onAdd={onAdd} />
    </aside>
  )
}
