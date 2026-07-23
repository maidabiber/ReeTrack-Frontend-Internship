import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getProject, listProjects, type ProjectStatusFilter } from '../../api/projects'
import { usePaginatedList } from '../../hooks/usePaginatedList'
import type { Project } from '../../types/project'
import { Icon } from '../ui/Icon'

/**
 * Single-select project dropdown, grouped by client, with each project's accent
 * colour as a leading dot (RT-44). Fetches projects lazily when opened with
 * server-side search and infinite scroll.
 */
export function ProjectPicker({
  value,
  onChange,
  placeholder = 'Select a project…',
  disabled = false,
  allowClear = false,
  statusFilter = 'active',
}: {
  value: string | null
  onChange: (projectId: string | null) => void
  placeholder?: string
  disabled?: boolean
  allowClear?: boolean
  statusFilter?: ProjectStatusFilter
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [resolvedProject, setResolvedProject] = useState<Project | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const fetchPage = useCallback(
    (page: number, pageSize: number, q: string) =>
      listProjects(statusFilter, { page, pageSize, q: q || undefined }),
    [statusFilter],
  )

  const { items: projects, loading, loadingMore, hasMore, handleScroll } = usePaginatedList({
    fetchPage,
    enabled: open,
    query,
  })

  const selectedFromList = useMemo(
    () => projects.find((p) => p.id === value) ?? null,
    [projects, value],
  )
  const selected =
    !value
      ? null
      : (selectedFromList ?? (resolvedProject?.id === value ? resolvedProject : null))

  useEffect(() => {
    if (!value || selectedFromList) return

    let cancelled = false
    void getProject(value)
      .then((project) => {
        if (!cancelled) setResolvedProject(project)
      })
      .catch(() => {
        if (!cancelled) setResolvedProject(null)
      })

    return () => {
      cancelled = true
    }
  }, [value, selectedFromList])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const groups = useMemo(() => {
    const byClient = new Map<string, Project[]>()
    for (const project of projects) {
      const list = byClient.get(project.clientName)
      if (list) list.push(project)
      else byClient.set(project.clientName, [project])
    }

    return [...byClient.entries()]
      .map(([clientName, list]) => ({
        clientName,
        projects: [...list].sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.clientName.localeCompare(b.clientName))
  }, [projects])

  const close = () => {
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={rootRef} className="relative w-full min-w-0">
      <button
        type="button"
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((v) => !v)
        }}
        className={`flex w-full items-center gap-2 rounded-md border-control bg-white px-3 py-field text-left text-body outline-none ${
          open ? 'border-brand' : 'border-navy/[0.08]'
        } ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-brand/60'}`}
      >
        <span
          aria-hidden="true"
          className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
          style={{ backgroundColor: selected?.color ?? '#C7CDDB' }}
        />
        <span className={`flex-1 truncate ${selected ? 'text-navy' : 'text-navy/45'}`}>
          {selected ? selected.name : placeholder}
          {selected && <span className="text-navy/45"> · {selected.clientName}</span>}
        </span>
        <Icon name="chevron-down" className="h-3 w-3 flex-shrink-0 text-navy/50" />
      </button>

      {open && (
        <div className="absolute inset-x-0 top-[calc(100%+4px)] z-40 max-h-[300px] overflow-hidden rounded-xl bg-white p-menu shadow-dropdown">
          <label className="mb-1 flex items-center gap-1.5 rounded-xs border-control border-navy/[0.08] px-2.5 py-1.5 focus-within:border-brand">
            <Icon name="search" className="h-3.5 w-3.5 flex-shrink-0 text-navy/50" />
            <input
              autoFocus
              className="w-full border-none bg-transparent text-sm text-navy outline-none placeholder:text-navy/45"
              placeholder="Search projects…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onClick={(event) => event.stopPropagation()}
            />
          </label>

          <div className="max-h-[228px] overflow-y-auto" onScroll={handleScroll}>
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
                No project
              </button>
            )}

            {loading && projects.length === 0 ? (
              <div className="px-2.5 py-3 text-center text-sm text-navy/45">Loading…</div>
            ) : (
              groups.map((group) => (
                <div key={group.clientName} className="pt-1">
                  <div className="px-2.5 py-1 font-display text-eyebrow font-bold tracking-[0.05em] text-navy/45 uppercase">
                    {group.clientName}
                  </div>
                  {group.projects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onChange(project.id)
                        close()
                      }}
                      className={`flex w-full items-center gap-2 rounded-xs px-2.5 py-compact text-left text-caption hover:bg-surface-muted ${
                        project.id === value ? 'font-bold text-navy' : 'font-medium text-navy'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: project.color ?? '#C7CDDB' }}
                      />
                      <span className="flex-1 truncate">{project.name}</span>
                    </button>
                  ))}
                </div>
              ))
            )}

            {!loading && groups.length === 0 && (
              <div className="px-2.5 py-3 text-center text-sm text-navy/45">No projects.</div>
            )}

            {loadingMore && (
              <div className="px-2.5 py-2 text-center text-sm text-navy/45">Loading more…</div>
            )}

            {!loading && !loadingMore && hasMore && projects.length > 0 && (
              <div className="px-2.5 py-2 text-center text-sm text-navy/45">Scroll for more…</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
