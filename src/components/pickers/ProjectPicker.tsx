import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../ui/Icon'
import type { Project } from '../../types/project'

/**
 * Single-select project dropdown, grouped by client, with each project's accent
 * colour as a leading dot (RT-44). Deliberately props-driven and fetch-free so
 * the timer bar and manual-entry form (owned by other tickets) can feed it their
 * own already-loaded project list and control the selection.
 */
export function ProjectPicker({
  projects,
  value,
  onChange,
  placeholder = 'Select a project…',
  disabled = false,
  allowClear = false,
}: {
  projects: Project[]
  value: string | null
  onChange: (projectId: string | null) => void
  placeholder?: string
  disabled?: boolean
  allowClear?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  const selected = useMemo(() => projects.find((p) => p.id === value) ?? null, [projects, value])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  // Filter, then group by client name (groups sorted alphabetically, projects
  // within a group by name).
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matched = q
      ? projects.filter(
          (p) => p.name.toLowerCase().includes(q) || p.clientName.toLowerCase().includes(q),
        )
      : projects

    const byClient = new Map<string, Project[]>()
    for (const project of matched) {
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
  }, [projects, query])

  const close = () => {
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((v) => !v)
        }}
        className={`flex w-full items-center gap-2 rounded-[10px] border-[1.5px] bg-white px-3 py-[9px] text-left text-[13px] outline-none ${
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
        <div className="absolute top-[calc(100%+4px)] left-0 z-40 max-h-[300px] w-full min-w-[220px] overflow-hidden rounded-[14px] bg-white p-[5px] shadow-[0_16px_36px_rgba(31,43,77,0.16)]">
          <label className="mb-1 flex items-center gap-1.5 rounded-md border-[1.5px] border-navy/[0.08] px-2.5 py-1.5 focus-within:border-brand">
            <Icon name="search" className="h-3.5 w-3.5 flex-shrink-0 text-navy/50" />
            <input
              autoFocus
              className="w-full border-none bg-transparent text-[12.5px] text-navy outline-none placeholder:text-navy/45"
              placeholder="Search projects…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onClick={(event) => event.stopPropagation()}
            />
          </label>

          <div className="max-h-[228px] overflow-y-auto">
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
                No project
              </button>
            )}

            {groups.map((group) => (
              <div key={group.clientName} className="pt-1">
                <div className="px-2.5 py-1 font-display text-[10px] font-bold tracking-[0.05em] text-navy/45 uppercase">
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
                    className={`flex w-full items-center gap-2 rounded-md px-2.5 py-[7px] text-left text-[12.5px] hover:bg-surface-muted ${
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
            ))}

            {groups.length === 0 && (
              <div className="px-2.5 py-3 text-center text-[12px] text-navy/45">No projects.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
