import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from './Icon'

export interface SearchSelectOption {
  value: string
  label: string
  /** Optional leading colour dot (hex), e.g. a project accent. */
  color?: string | null
  /** Optional muted trailing text, e.g. "(archived)". */
  hint?: string
}

/**
 * Generic single-select dropdown with a filter box, styled after the members
 * FilterDropdown. Self-manages its open state and closes on outside click, so
 * it drops into modals and pages without wiring. Reused by the project/client
 * pickers (RT-44).
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
  const rootRef = useRef<HTMLDivElement>(null)

  const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value])

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  const close = () => {
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((v) => !v)
        }}
        className={`flex w-full items-center gap-2 rounded-[10px] border-[1.5px] bg-white px-3 py-[9px] text-left text-[13px] outline-none ${
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

      {open && (
        <div className="absolute top-[calc(100%+4px)] left-0 z-40 max-h-[280px] w-full min-w-[200px] overflow-hidden rounded-[14px] bg-white p-[5px] shadow-[0_16px_36px_rgba(31,43,77,0.16)]">
          <label className="mb-1 flex items-center gap-1.5 rounded-md border-[1.5px] border-navy/[0.08] px-2.5 py-1.5 focus-within:border-brand">
            <Icon name="search" className="h-3.5 w-3.5 flex-shrink-0 text-navy/50" />
            <input
              autoFocus
              className="w-full border-none bg-transparent text-[12.5px] text-navy outline-none placeholder:text-navy/45"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onClick={(event) => event.stopPropagation()}
            />
          </label>

          <div className="max-h-[210px] overflow-y-auto">
            {allowClear && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onChange(null)
                  close()
                }}
                className="flex w-full items-center rounded-md px-2.5 py-[7px] text-left text-[12.5px] font-medium text-navy/55 hover:bg-surface-muted"
              >
                Clear selection
              </button>
            )}

            {filtered.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onChange(option.value)
                  close()
                }}
                className={`flex w-full items-center gap-2 rounded-md px-2.5 py-[7px] text-left text-[12.5px] hover:bg-surface-muted ${
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
              <div className="px-2.5 py-3 text-center text-[12px] text-navy/45">No matches.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
