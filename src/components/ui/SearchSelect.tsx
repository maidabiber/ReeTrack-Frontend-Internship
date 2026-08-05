import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'
import { useDismissOnOutside } from '../../hooks/useDismissOnOutside'

export interface SearchSelectOption {
  value: string
  label: string
  /** Optional leading colour dot (hex), e.g. a project accent. */
  color?: string | null
  /** Optional muted trailing text, e.g. "(archived)". */
  hint?: string
}

interface MenuPosition {
  top: number
  left: number
  width: number
  maxHeight: number
}

/**
 * Generic single-select dropdown with a filter box, styled after the members
 * FilterDropdown. Self-manages its open state and closes on outside click, so
 * it drops into modals and pages without wiring. Reused by the project/client
 * pickers (RT-44).
 *
 * The menu is portalled to document.body so it is not clipped by overflow
 * ancestors (e.g. the Jira import modal list).
 */
export function SearchSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  disabled = false,
  allowClear = false,
  ariaLabel,
}: {
  options: SearchSelectOption[]
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  searchPlaceholder?: string
  disabled?: boolean
  allowClear?: boolean
  ariaLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value])

  useDismissOnOutside(rootRef, open, () => {
    setOpen(false)
    setQuery('')
    setMenuPosition(null)
  }, {
    ignoreSelector: '[data-search-select-menu]',
  })

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  const updateMenuPosition = useCallback(() => {
    const rect = rootRef.current?.getBoundingClientRect()
    if (!rect) return
    const width = Math.max(rect.width, 180)
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
    const spaceBelow = window.innerHeight - rect.bottom - 12
    const spaceAbove = rect.top - 12

    let top: number
    let maxHeight: number

    if (spaceBelow >= 140 || spaceBelow >= spaceAbove) {
      top = rect.bottom + 4
      maxHeight = Math.min(280, Math.max(120, spaceBelow))
    } else {
      maxHeight = Math.min(280, Math.max(120, spaceAbove))
      top = Math.max(8, rect.top - 4 - maxHeight)
      if (top === 8) {
        maxHeight = Math.max(100, rect.top - 12)
      }
    }

    setMenuPosition({ top, left, width, maxHeight })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    updateMenuPosition()
    window.addEventListener('resize', updateMenuPosition)
    window.addEventListener('scroll', updateMenuPosition, true)
    return () => {
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
    }
  }, [open, updateMenuPosition])

  const close = () => {
    setOpen(false)
    setQuery('')
    setMenuPosition(null)
  }

  return (
    <div ref={rootRef} className="relative w-full min-w-0">
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={(event) => {
          event.stopPropagation()
          if (!open) {
            rootRef.current?.scrollIntoView({ block: 'nearest' })
          }
          setOpen((v) => !v)
        }}
        className={`flex w-full items-center gap-2 rounded-md border-control bg-white px-3 py-field text-left text-body outline-none ${
          open ? 'border-brand' : 'border-navy/[0.08]'
        } ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-brand/60'}`}
      >
        {selected?.color && (
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
            style={{ backgroundColor: selected.color }}
          />
        )}
        <span className={`flex-1 truncate ${selected ? 'text-navy' : 'text-navy/45'}`}>
          {selected ? selected.label : placeholder}
          {selected?.hint && <span className="text-navy/45"> {selected.hint}</span>}
        </span>
        <Icon name="chevron-down" className="h-3 w-3 flex-shrink-0 text-navy/50" />
      </button>

      {open &&
        menuPosition &&
        createPortal(
          <div
            data-search-select-menu
            className="fixed z-110 flex flex-col overflow-hidden rounded-xl bg-white p-menu shadow-dropdown"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
              maxHeight: menuPosition.maxHeight,
            }}
          >
            <label className="mb-1 flex shrink-0 items-center gap-1.5 rounded-xs border-control border-navy/[0.08] px-2.5 py-1.5 focus-within:border-brand">
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

            <div className="min-h-0 flex-1 overflow-y-auto" role="listbox">
              {allowClear && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onChange(null)
                    close()
                  }}
                  className="flex w-full items-center rounded-xs px-2.5 py-compact text-left text-caption font-medium text-navy/55 hover:bg-surface-muted"
                >
                  Clear selection
                </button>
              )}

              {filtered.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onClick={(event) => {
                    event.stopPropagation()
                    onChange(option.value)
                    close()
                  }}
                  className={`flex w-full items-center gap-2 rounded-xs px-2.5 py-compact text-left text-caption hover:bg-surface-muted ${
                    option.value === value ? 'font-bold text-navy' : 'font-medium text-navy'
                  }`}
                >
                  {option.color && (
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: option.color }}
                    />
                  )}
                  <span className="flex-1 truncate">{option.label}</span>
                  {option.hint && <span className="text-navy/45">{option.hint}</span>}
                </button>
              ))}

              {filtered.length === 0 && (
                <div className="px-2.5 py-3 text-center text-sm text-navy/45">No matches.</div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
