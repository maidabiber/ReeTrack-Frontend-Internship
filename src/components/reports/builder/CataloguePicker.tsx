import { useMemo, useRef, useState } from 'react'
import { useDismissOnOutside } from '../../../hooks/useDismissOnOutside'
import { Icon } from '../../ui/Icon'
import { MetadataBubble } from '../../ui/MetadataBubble'

export interface CataloguePickerItem {
  id: string
  label: string
  /** Right-aligned hint in the list (metric unit, "fan-out", …). */
  meta?: string | null
  /** Blocked because of the current selection elsewhere on the block. */
  disabledReason?: string | null
}

/**
 * Compact multi-select shared by the metric and dimension pickers: selected items render as
 * chips, the rest live in a searchable popover. The two were byte-for-byte the same apart
 * from labels and the eligibility rule, so they drifted independently.
 */
export function CataloguePicker({
  items,
  selected,
  onChange,
  max,
  chipColor,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  toggleLabel,
  /** With one slot, picking replaces the current choice instead of being blocked. */
  replaceWhenSingle = false,
}: {
  items: CataloguePickerItem[]
  selected: string[]
  onChange: (next: string[]) => void
  max: number
  chipColor: string
  placeholder: string
  searchPlaceholder: string
  emptyLabel: string
  toggleLabel: string
  replaceWhenSingle?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  useDismissOnOutside(rootRef, open, () => setOpen(false), { closeOnEscape: true })

  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items])
  const selectedItems = selected
    .map((id) => byId.get(id))
    .filter((item): item is CataloguePickerItem => Boolean(item))

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? items.filter(
          (item) => item.label.toLowerCase().includes(q) || item.id.toLowerCase().includes(q),
        )
      : items
    return [...list].sort((a, b) => a.label.localeCompare(b.label))
  }, [items, query])

  function toggle(id: string) {
    const item = byId.get(id)
    if (!item) return
    if (selected.includes(id)) {
      onChange(selected.filter((current) => current !== id))
      return
    }
    if (item.disabledReason) return
    if (replaceWhenSingle && max === 1) {
      onChange([id])
      return
    }
    if (selected.length >= max) return
    onChange([...selected, id])
  }

  return (
    <div ref={rootRef} className="relative">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setOpen(true)
          }
        }}
        className={`flex min-h-[40px] w-full flex-wrap items-center gap-1.5 rounded-md border-control bg-white px-2 py-1.5 ${
          open ? 'border-brand' : 'border-navy/[0.08]'
        } cursor-text hover:border-brand/60`}
      >
        {selectedItems.length === 0 ? (
          <span className="px-1 text-body text-navy/45">{placeholder}</span>
        ) : (
          selectedItems.map((item) => (
            <MetadataBubble
              key={item.id}
              label={item.label}
              color={chipColor}
              title={item.meta ? `${item.label} (${item.meta})` : item.label}
              onRemove={() => toggle(item.id)}
            />
          ))
        )}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            setOpen((value) => !value)
          }}
          aria-label={toggleLabel}
          className="ml-auto flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-xs text-navy/45 hover:bg-surface-muted"
        >
          <Icon name="chevron-down" className="h-3 w-3" />
        </button>
      </div>

      {open ? (
        <div className="absolute top-[calc(100%+4px)] left-0 z-40 max-h-[280px] w-full min-w-[220px] overflow-hidden rounded-xl bg-white p-menu shadow-dropdown">
          <label className="mb-1 flex items-center gap-1.5 rounded-xs border-control border-navy/[0.08] px-2.5 py-1.5 focus-within:border-brand">
            <Icon name="search" className="h-3.5 w-3.5 flex-shrink-0 text-navy/50" />
            <input
              autoFocus
              className="w-full border-none bg-transparent text-sm text-navy outline-none placeholder:text-navy/45"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onClick={(event) => event.stopPropagation()}
            />
          </label>

          <div className="max-h-[210px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-2.5 py-3 text-center text-sm text-navy/45">{emptyLabel}</div>
            ) : (
              filtered.map((item) => {
                const active = selected.includes(item.id)
                const atCap =
                  !active && selected.length >= max && !(replaceWhenSingle && max === 1)
                const blocked = !active && (Boolean(item.disabledReason) || atCap)
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={blocked}
                    title={
                      item.disabledReason ?? (atCap ? `At most ${max} selected` : item.label)
                    }
                    onClick={(event) => {
                      event.stopPropagation()
                      toggle(item.id)
                    }}
                    className={`flex w-full items-center gap-2 rounded-xs px-2.5 py-compact text-left text-caption font-medium ${
                      blocked ? 'cursor-not-allowed text-navy/30' : 'text-navy hover:bg-surface-muted'
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-xs border-control ${
                        active ? 'border-brand bg-brand text-white' : 'border-navy/25'
                      }`}
                    >
                      {active ? (
                        <span aria-hidden="true" className="text-xs leading-none">
                          ✓
                        </span>
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.meta ? (
                      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-navy/35">
                        {item.meta}
                      </span>
                    ) : null}
                  </button>
                )
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
