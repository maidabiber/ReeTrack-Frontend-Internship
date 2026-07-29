import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { apiErrorMessage } from '../../api/client'
import type { PagedResult } from '../../types/paged'
import { useDismissOnOutside } from '../../hooks/useDismissOnOutside'
import { usePaginatedList } from '../../hooks/usePaginatedList'
import { Icon } from '../ui/Icon'

export interface ReportEntityOption {
  id: string
  name: string
  color?: string | null
  hint?: string
  projectId?: string
  clientId?: string
  projectName?: string | null
  clientName?: string | null
  isFallback?: boolean
}

/**
 * Chip multi-select for report filters. Supports a static option list (members /
 * clients) or a paginated fetchPage (projects / tasks / tags).
 */
export function ReportEntityMultiSelect({
  selectedIds,
  onChange,
  placeholder,
  searchPlaceholder = 'Search…',
  disabled = false,
  options,
  fetchPage,
  knownOptions = [],
}: {
  selectedIds: string[]
  onChange: (selectedIds: string[], selected: ReportEntityOption[]) => void
  placeholder: string
  searchPlaceholder?: string
  disabled?: boolean
  options?: ReportEntityOption[]
  fetchPage?: (page: number, pageSize: number, q: string) => Promise<PagedResult<ReportEntityOption>>
  knownOptions?: ReportEntityOption[]
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const [selectedCache, setSelectedCache] = useState<ReportEntityOption[]>([])
  const [menuPosition, setMenuPosition] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)

  const pagedFetch = useCallback(
    (page: number, pageSize: number, q: string) => {
      if (!fetchPage) {
        return Promise.resolve({ items: [], totalCount: 0, page: 1, pageSize })
      }
      return fetchPage(page, pageSize, q)
    },
    [fetchPage],
  )

  const {
    items: loadedItems,
    loading,
    loadingMore,
    error,
    hasMore,
    handleScroll,
  } = usePaginatedList({
    fetchPage: pagedFetch,
    enabled: open && Boolean(fetchPage),
    query,
  })

  const staticFiltered = useMemo(() => {
    if (!options) return []
    const q = query.trim().toLowerCase()
    const list = q
      ? options.filter((option) => option.name.toLowerCase().includes(q))
      : options
    return [...list].sort((a, b) => a.name.localeCompare(b.name))
  }, [options, query])

  const optionById = useMemo(() => {
    const next = new Map<string, ReportEntityOption>()
    for (const option of knownOptions) next.set(option.id, option)
    for (const option of selectedCache) next.set(option.id, option)
    for (const option of options ?? []) next.set(option.id, option)
    for (const option of loadedItems) next.set(option.id, option)
    return next
  }, [knownOptions, selectedCache, options, loadedItems])

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const selectedOptions = useMemo(
    () =>
      selectedIds.map(
        (id): ReportEntityOption =>
          optionById.get(id) ?? {
            id,
            name: `Saved · ${id.slice(0, 8)}`,
            isFallback: true,
          },
      ),
    [selectedIds, optionById],
  )

  const menuOptions = fetchPage
    ? [...loadedItems].sort((a, b) => a.name.localeCompare(b.name))
    : staticFiltered

  useDismissOnOutside(rootRef, open, () => setOpen(false), {
    closeOnEscape: true,
    ignoreSelector: '[data-report-entity-menu]',
  })

  const updateMenuPosition = useCallback(() => {
    const rect = rootRef.current?.getBoundingClientRect()
    if (!rect) return
    const width = Math.max(rect.width, 220)
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
    const below = rect.bottom + 4
    const top = below + 280 <= window.innerHeight
      ? below
      : Math.max(8, rect.top - 284)
    setMenuPosition({ top, left, width })
  }, [])

  useEffect(() => {
    if (!open) return
    window.addEventListener('resize', updateMenuPosition)
    window.addEventListener('scroll', updateMenuPosition, true)
    return () => {
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
    }
  }, [open, updateMenuPosition])

  const toggle = (id: string) => {
    const nextIds = selectedSet.has(id)
      ? selectedIds.filter((selected) => selected !== id)
      : [...selectedIds, id]

    let nextCache = selectedCache
    if (!selectedSet.has(id)) {
      const option = optionById.get(id)
      if (option && !selectedCache.some((item) => item.id === id)) {
        nextCache = [...selectedCache, option]
        setSelectedCache(nextCache)
      }
    }

    const lookup = new Map(optionById)
    for (const option of nextCache) lookup.set(option.id, option)
    const nextSelected = nextIds
      .map((selectedId) => lookup.get(selectedId))
      .filter((item): item is ReportEntityOption => Boolean(item))

    onChange(nextIds, nextSelected)
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      <div
        className={`flex min-h-[40px] w-full flex-wrap items-center gap-1.5 rounded-md border-control bg-white px-2 py-1.5 text-md ${
          open ? 'border-brand' : 'border-navy/[0.08]'
        } ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-brand/60'}`}
      >
        {selectedOptions.map((option) => (
          <span
            key={option.id}
            className="flex items-center gap-1.5 rounded-full bg-surface-muted py-1 pr-1 pl-2 text-sm font-medium text-navy"
          >
            {option.color ? (
              <span
                aria-hidden="true"
                className="h-2 w-2 flex-shrink-0 rounded-full"
                style={{ backgroundColor: option.color }}
              />
            ) : null}
            <span
              className={`max-w-[9rem] truncate ${
                option.isFallback ? 'font-mono tabular-nums' : ''
              }`}
            >
              {option.name}
            </span>
            {!disabled ? (
              <button
                type="button"
                aria-label={`Remove ${option.name}`}
                onClick={(event) => {
                  event.stopPropagation()
                  toggle(option.id)
                }}
                className="flex h-4 w-4 items-center justify-center rounded-full text-navy/45 hover:bg-navy/10 hover:text-navy"
              >
                <span aria-hidden="true" className="text-md leading-none">
                  ×
                </span>
              </button>
            ) : null}
          </span>
        ))}

        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!open) updateMenuPosition()
            setOpen((value) => !value)
          }}
          aria-label={open ? 'Close options' : `Choose ${placeholder.toLowerCase()}`}
          aria-expanded={open}
          aria-haspopup="listbox"
          className="ml-auto flex min-h-6 min-w-12 flex-1 items-center justify-end gap-2 rounded-xs px-1 text-left text-navy/45 outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
        >
          {selectedOptions.length === 0 ? (
            <span className="mr-auto truncate text-md">{placeholder}</span>
          ) : null}
          <Icon name="chevron-down" className="h-3 w-3" />
        </button>
      </div>

      {open && menuPosition
        ? createPortal(
        <div
          data-report-entity-menu
          className="fixed z-60 max-h-[280px] overflow-hidden rounded-xl bg-white/95 p-menu shadow-dropdown backdrop-blur-xl"
          style={menuPosition}
        >
          <label className="mb-1 flex items-center gap-1.5 rounded-xs border-control border-navy/[0.08] px-2.5 py-1.5 focus-within:border-brand">
            <Icon name="search" className="h-3.5 w-3.5 flex-shrink-0 text-navy/50" />
            <input
              autoFocus
              aria-label={searchPlaceholder}
              className="w-full border-none bg-transparent text-sm text-navy outline-none placeholder:text-navy/45"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onClick={(event) => event.stopPropagation()}
            />
          </label>

          <div
            className="max-h-[210px] overflow-y-auto"
            onScroll={fetchPage ? handleScroll : undefined}
            role="listbox"
            aria-multiselectable="true"
          >
            {error ? (
              <div className="rounded-lg bg-red-tint px-2.5 py-2 text-sm text-red" role="alert">
                {apiErrorMessage(error, 'Could not load filter options.')}
              </div>
            ) : loading && menuOptions.length === 0 ? (
              <div className="px-2.5 py-3 text-center text-sm text-navy/45">Loading…</div>
            ) : (
              menuOptions.map((option) => {
                const checked = selectedSet.has(option.id)
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      toggle(option.id)
                    }}
                    role="option"
                    aria-selected={checked}
                    className="flex w-full items-center gap-2 rounded-xs px-2.5 py-compact text-left text-caption font-medium text-navy hover:bg-surface-muted"
                  >
                    <span
                      className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-xs border-control ${
                        checked ? 'border-brand bg-brand text-white' : 'border-navy/25'
                      }`}
                    >
                      {checked ? (
                        <span aria-hidden="true" className="text-xs leading-none">
                          ✓
                        </span>
                      ) : null}
                    </span>
                    {option.color ? (
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: option.color }}
                      />
                    ) : null}
                    <span className="min-w-0 flex-1 truncate">{option.name}</span>
                    {option.hint ? (
                      <span className="shrink-0 text-xs text-navy/40">{option.hint}</span>
                    ) : null}
                  </button>
                )
              })
            )}

            {!error && !loading && menuOptions.length === 0 ? (
              <div className="px-2.5 py-3 text-center text-sm text-navy/45">No matches.</div>
            ) : null}

            {loadingMore ? (
              <div className="px-2.5 py-2 text-center text-sm text-navy/45">Loading more…</div>
            ) : null}

            {!loading && !loadingMore && hasMore && menuOptions.length > 0 ? (
              <div className="px-2.5 py-2 text-center text-sm text-navy/45">Scroll for more…</div>
            ) : null}
          </div>
        </div>,
        document.body,
      )
        : null}
    </div>
  )
}
