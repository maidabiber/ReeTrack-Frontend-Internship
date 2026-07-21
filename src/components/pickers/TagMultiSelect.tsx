import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { listTags } from '../../api/tags'
import { usePaginatedList } from '../../hooks/usePaginatedList'
import type { Tag } from '../../types/tag'
import { Icon } from '../ui/Icon'

/**
 * Multi-select tag control: selected tags render as removable chips, and a
 * popover lists the rest with a filter box (RT-44). Fetches tags lazily when
 * opened with server-side search and infinite scroll.
 *
 * `variant="popover"` renders only the search + checklist panel (for IconButton
 * anchors). `variant="field"` (default) keeps the chip input trigger.
 */
export function TagMultiSelect({
  selectedIds,
  onChange,
  placeholder = 'Add tags…',
  disabled = false,
  variant = 'field',
  knownTags = [],
}: {
  selectedIds: string[]
  onChange: (selectedIds: string[], selectedTags: Pick<Tag, 'id' | 'name' | 'color'>[]) => void
  placeholder?: string
  disabled?: boolean
  variant?: 'field' | 'popover'
  /** Pre-selected tag metadata for chip display before lazy-loaded pages include them. */
  knownTags?: Pick<Tag, 'id' | 'name' | 'color'>[]
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  /** Tags selected in this session that may fall off the current loaded page. */
  const [selectedCache, setSelectedCache] = useState<Tag[]>([])

  const isPopover = variant === 'popover'
  const showPanel = isPopover || open

  const fetchPage = useCallback(
    (page: number, pageSize: number, q: string) =>
      listTags({ page, pageSize, q: q || undefined }),
    [],
  )

  const { items: loadedTags, loading, loadingMore, hasMore, handleScroll } = usePaginatedList({
    fetchPage,
    enabled: showPanel,
    query,
  })

  const tagById = useMemo(() => {
    const next = new Map<string, Tag>()
    for (const tag of knownTags) {
      next.set(tag.id, {
        id: tag.id,
        name: tag.name,
        color: tag.color,
        usageCount: 0,
        createdAtUtc: '',
      })
    }
    for (const tag of selectedCache) {
      next.set(tag.id, tag)
    }
    for (const tag of loadedTags) {
      next.set(tag.id, tag)
    }
    return next
  }, [knownTags, selectedCache, loadedTags])

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const selectedTags = useMemo(
    () =>
      selectedIds
        .map((id) => tagById.get(id))
        .filter((t): t is Tag => Boolean(t)),
    [selectedIds, tagById],
  )

  const options = useMemo(
    () => [...loadedTags].sort((a, b) => a.name.localeCompare(b.name)),
    [loadedTags],
  )

  useEffect(() => {
    if (!open || isPopover) return
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open, isPopover])

  const toggle = (id: string) => {
    const nextIds = selectedSet.has(id)
      ? selectedIds.filter((selected) => selected !== id)
      : [...selectedIds, id]

    if (!selectedSet.has(id)) {
      const tag = tagById.get(id)
      if (tag) {
        setSelectedCache((prev) =>
          prev.some((t) => t.id === id) ? prev : [...prev, tag],
        )
      }
    }

    const nextTags = nextIds
      .map((tagId) => tagById.get(tagId))
      .filter((t): t is Tag => Boolean(t))
      .map(({ id: tagId, name, color }) => ({ id: tagId, name, color }))
    onChange(nextIds, nextTags)
  }

  const panel = (
    <div
      className={
        isPopover
          ? 'max-h-[280px] w-full min-w-[200px] overflow-hidden rounded-xl bg-white p-menu shadow-dropdown'
          : 'absolute top-[calc(100%+4px)] left-0 z-40 max-h-[280px] w-full min-w-[200px] overflow-hidden rounded-xl bg-white p-menu shadow-dropdown'
      }
    >
      <label className="mb-1 flex items-center gap-1.5 rounded-xs border-control border-navy/[0.08] px-2.5 py-1.5 focus-within:border-brand">
        <Icon name="search" className="h-3.5 w-3.5 flex-shrink-0 text-navy/50" />
        <input
          autoFocus={isPopover || open}
          className="w-full border-none bg-transparent text-sm text-navy outline-none placeholder:text-navy/45"
          placeholder="Search tags…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onClick={(event) => event.stopPropagation()}
        />
      </label>

      <div className="max-h-[210px] overflow-y-auto" onScroll={handleScroll}>
        {loading && options.length === 0 ? (
          <div className="px-2.5 py-3 text-center text-sm text-navy/45">Loading…</div>
        ) : (
          options.map((tag) => {
            const checked = selectedSet.has(tag.id)
            return (
              <button
                key={tag.id}
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  toggle(tag.id)
                }}
                className="flex w-full items-center gap-2 rounded-xs px-2.5 py-compact text-left text-caption font-medium text-navy hover:bg-surface-muted"
              >
                <span
                  className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-xs border-control ${
                    checked ? 'border-brand bg-brand text-white' : 'border-navy/25'
                  }`}
                >
                  {checked && (
                    <span aria-hidden="true" className="text-xs leading-none">
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
          })
        )}

        {!loading && options.length === 0 && (
          <div className="px-2.5 py-3 text-center text-sm text-navy/45">No tags.</div>
        )}

        {loadingMore && (
          <div className="px-2.5 py-2 text-center text-sm text-navy/45">Loading more…</div>
        )}

        {!loading && !loadingMore && hasMore && options.length > 0 && (
          <div className="px-2.5 py-2 text-center text-sm text-navy/45">Scroll for more…</div>
        )}
      </div>
    </div>
  )

  if (isPopover) {
    return <div ref={rootRef}>{panel}</div>
  }

  return (
    <div ref={rootRef} className="relative">
      <div
        onClick={() => !disabled && setOpen(true)}
        className={`flex min-h-[40px] w-full flex-wrap items-center gap-1.5 rounded-md border-control bg-white px-2 py-1.5 text-md ${
          open ? 'border-brand' : 'border-navy/[0.08]'
        } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-text hover:border-brand/60'}`}
      >
        {selectedTags.length === 0 && <span className="px-1 text-navy/45">{placeholder}</span>}

        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className="flex items-center gap-1.5 rounded-full bg-surface-muted py-1 pr-1 pl-2 text-sm font-medium text-navy"
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
                <span aria-hidden="true" className="text-md leading-none">
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
          className="ml-auto flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-xs text-navy/45 hover:bg-surface-muted"
        >
          <Icon name="chevron-down" className="h-3 w-3" />
        </button>
      </div>

      {showPanel ? panel : null}
    </div>
  )
}
