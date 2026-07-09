import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../ui/Icon'
import type { Tag } from '../../types/tag'

/**
 * Multi-select tag control: selected tags render as removable chips, and a
 * popover lists the rest with a filter box (RT-44). Props-driven and fetch-free
 * so the timer bar and manual-entry form (other tickets) supply the tag list
 * and own the selection.
 */
export function TagMultiSelect({
  tags,
  selectedIds,
  onChange,
  placeholder = 'Add tags…',
  disabled = false,
}: {
  tags: Tag[]
  selectedIds: string[]
  onChange: (selectedIds: string[]) => void
  placeholder?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const selectedTags = useMemo(
    () => selectedIds.map((id) => tags.find((t) => t.id === id)).filter((t): t is Tag => Boolean(t)),
    [selectedIds, tags],
  )

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const options = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tags
      .filter((t) => !q || t.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [tags, query])

  const toggle = (id: string) => {
    if (selectedSet.has(id)) onChange(selectedIds.filter((selected) => selected !== id))
    else onChange([...selectedIds, id])
  }

  return (
    <div ref={rootRef} className="relative">
      <div
        onClick={() => !disabled && setOpen(true)}
        className={`flex min-h-[40px] w-full flex-wrap items-center gap-1.5 rounded-[10px] border-[1.5px] bg-white px-2 py-1.5 text-[13px] ${
          open ? 'border-brand' : 'border-navy/[0.08]'
        } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-text hover:border-brand/60'}`}
      >
        {selectedTags.length === 0 && <span className="px-1 text-navy/45">{placeholder}</span>}

        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className="flex items-center gap-1.5 rounded-full bg-surface-muted py-1 pr-1 pl-2 text-[12px] font-medium text-navy"
          >
            <span
              aria-hidden="true"
              className="h-2 w-2 flex-shrink-0 rounded-full"
              style={{ backgroundColor: tag.color ?? '#C7CDDB' }}
            />
            {tag.name}
            {!disabled && (
              <button
                type="button"
                aria-label={`Remove ${tag.name}`}
                onClick={(event) => {
                  event.stopPropagation()
                  toggle(tag.id)
                }}
                className="flex h-4 w-4 items-center justify-center rounded-full text-navy/45 hover:bg-navy/10 hover:text-navy"
              >
                <span aria-hidden="true" className="text-[13px] leading-none">
                  ×
                </span>
              </button>
            )}
          </span>
        ))}

        <button
          type="button"
          disabled={disabled}
          onClick={(event) => {
            event.stopPropagation()
            setOpen((v) => !v)
          }}
          aria-label="Toggle tag list"
          className="ml-auto flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-navy/45 hover:bg-surface-muted"
        >
          <Icon name="chevron-down" className="h-3 w-3" />
        </button>
      </div>

      {open && (
        <div className="absolute top-[calc(100%+4px)] left-0 z-40 max-h-[280px] w-full min-w-[200px] overflow-hidden rounded-[14px] bg-white p-[5px] shadow-[0_16px_36px_rgba(31,43,77,0.16)]">
          <label className="mb-1 flex items-center gap-1.5 rounded-md border-[1.5px] border-navy/[0.08] px-2.5 py-1.5 focus-within:border-brand">
            <Icon name="search" className="h-3.5 w-3.5 flex-shrink-0 text-navy/50" />
            <input
              autoFocus
              className="w-full border-none bg-transparent text-[12.5px] text-navy outline-none placeholder:text-navy/45"
              placeholder="Search tags…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onClick={(event) => event.stopPropagation()}
            />
          </label>

          <div className="max-h-[210px] overflow-y-auto">
            {options.map((tag) => {
              const checked = selectedSet.has(tag.id)
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    toggle(tag.id)
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-[7px] text-left text-[12.5px] font-medium text-navy hover:bg-surface-muted"
                >
                  <span
                    className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[5px] border-[1.5px] ${
                      checked ? 'border-brand bg-brand text-white' : 'border-navy/25'
                    }`}
                  >
                    {checked && (
                      <span aria-hidden="true" className="text-[10px] leading-none">
                        ✓
                      </span>
                    )}
                  </span>
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: tag.color ?? '#C7CDDB' }}
                  />
                  <span className="flex-1 truncate">{tag.name}</span>
                </button>
              )
            })}

            {options.length === 0 && (
              <div className="px-2.5 py-3 text-center text-[12px] text-navy/45">No tags.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
