import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'
import { RowMenu, RowMenuItem } from '../../directory/DirectoryTable'
import { BREAKPOINT, useMediaQuery } from '../../../hooks/useMediaQuery'
import { BlockRenderer } from '../render/BlockRenderer'
import type {
  CustomReportCatalogue,
  ReportBlockResult,
  ReportBlockSpec,
} from '../../../types/customReport'
import { BreakdownBlockEditor } from './blocks/BreakdownBlockEditor'
import { ChartBlockEditor } from './blocks/ChartBlockEditor'
import { EntriesBlockEditor } from './blocks/EntriesBlockEditor'
import { KpiBlockEditor } from './blocks/KpiBlockEditor'
import { NarrativeBlockEditor } from './blocks/NarrativeBlockEditor'
import { NoteBlockEditor } from './blocks/NoteBlockEditor'

const BLOCK_LABELS: Record<ReportBlockSpec['type'], string> = {
  kpi: 'KPI row',
  breakdown: 'Breakdown',
  chart: 'Chart',
  entries: 'Entries',
  note: 'Note',
  narrative: 'Narrative',
}

export function SortableBlockCard({
  block,
  catalogue,
  preview,
  collapsedDefault,
  canMoveUp,
  canMoveDown,
  menuOpen,
  onToggleMenu,
  onChange,
  onDuplicate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  block: ReportBlockSpec
  catalogue: CustomReportCatalogue
  preview?: ReportBlockResult | null
  collapsedDefault?: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  menuOpen: boolean
  onToggleMenu: (event: React.MouseEvent) => void
  onChange: (next: ReportBlockSpec) => void
  onDuplicate: () => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const isLg = useMediaQuery(BREAKPOINT.lg)
  const [collapsed, setCollapsed] = useState(collapsedDefault ?? false)
  const [showPreview, setShowPreview] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Unmount chart previews when hidden — Recharts errors if ResponsiveContainer is 0×0.
  const previewVisible = showPreview || (!collapsed && isLg)
  const editorVisible = !collapsed && (isLg || !showPreview)

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl bg-white shadow-card ${isDragging ? 'z-20 opacity-90 shadow-dropdown' : ''}`}
    >
      <header className="flex items-center gap-2 border-b border-navy/5 px-3 py-2.5 sm:px-4">
        <button
          type="button"
          aria-label="Drag to reorder"
          className="flex h-8 w-8 flex-shrink-0 cursor-grab items-center justify-center rounded-lg text-navy/40 hover:bg-surface-muted hover:text-navy active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <span aria-hidden="true" className="font-mono text-sm leading-none tracking-tighter">
            ⠿
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-navy/40">
            {BLOCK_LABELS[block.type]}
          </p>
          <input
            value={block.title ?? ''}
            placeholder={BLOCK_LABELS[block.type]}
            onChange={(event) => onChange({ ...block, title: event.target.value || null })}
            className="w-full truncate bg-transparent font-display text-body font-bold text-navy outline-none placeholder:text-navy/35"
          />
        </div>

        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="hidden rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-navy/50 hover:bg-surface-muted sm:inline-flex"
        >
          {collapsed ? 'Expand' : 'Collapse'}
        </button>

        <button
          type="button"
          onClick={() => setShowPreview((value) => !value)}
          className="rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-navy/50 hover:bg-surface-muted lg:hidden"
        >
          {showPreview ? 'Edit' : 'Preview'}
        </button>

        <RowMenu open={menuOpen} onToggle={onToggleMenu} ariaLabel="Block actions">
          <RowMenuItem
            icon="chevron-right"
            label="Move up"
            disabled={!canMoveUp}
            onClick={onMoveUp}
          />
          <RowMenuItem
            icon="chevron-down"
            label="Move down"
            disabled={!canMoveDown}
            onClick={onMoveDown}
          />
          <RowMenuItem icon="share" label="Duplicate" onClick={onDuplicate} />
          <RowMenuItem icon="trash" label="Remove" danger onClick={onRemove} />
        </RowMenu>
      </header>

      {editorVisible ? (
        <div className="px-3 py-3 sm:px-4">
          <BlockEditor block={block} catalogue={catalogue} onChange={onChange} />
        </div>
      ) : null}

      {previewVisible ? (
        <div className="border-t border-navy/5 px-3 py-3 sm:px-4">
          {preview ? (
            <BlockRenderer block={preview} />
          ) : (
            <p className="text-body text-navy/45">Run the report to preview this block.</p>
          )}
        </div>
      ) : null}
    </article>
  )
}

function BlockEditor({
  block,
  catalogue,
  onChange,
}: {
  block: ReportBlockSpec
  catalogue: CustomReportCatalogue
  onChange: (next: ReportBlockSpec) => void
}) {
  switch (block.type) {
    case 'kpi':
      return <KpiBlockEditor block={block} catalogue={catalogue} onChange={onChange} />
    case 'breakdown':
      return <BreakdownBlockEditor block={block} catalogue={catalogue} onChange={onChange} />
    case 'chart':
      return <ChartBlockEditor block={block} catalogue={catalogue} onChange={onChange} />
    case 'entries':
      return <EntriesBlockEditor block={block} catalogue={catalogue} onChange={onChange} />
    case 'note':
      return <NoteBlockEditor block={block} onChange={onChange} />
    case 'narrative':
      return <NarrativeBlockEditor block={block} onChange={onChange} />
  }
}
