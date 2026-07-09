import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { Pill } from '../components/ui/Pill'
import { ProjectModal } from '../components/projects/ProjectModal'
import { apiErrorMessage } from '../api/client'
import {
  deleteProject,
  listProjects,
  updateProject,
  type ProjectStatusFilter,
} from '../api/projects'
import { formatBillingSummary } from '../lib/projectFormat'
import type { Project } from '../types/project'

type ModalState = { mode: 'create' } | { mode: 'edit'; project: Project } | null

const STATUS_DOT: Record<'active' | 'archived', string> = {
  active: 'bg-[#1E8A57]',
  archived: 'bg-navy/35',
}

const GRID =
  'grid grid-cols-[2fr_1.1fr_1.5fr_0.6fr_0.8fr_32px] items-center gap-2.5 px-3.5 py-2'

/**
 * RT-37/RT-38 — the project directory. Lists projects with their client, billing
 * summary and task count (GET /api/projects), with create/edit (modal),
 * archive/restore and soft-delete. Deleting is blocked server-side (409) while a
 * project has tracked time; archiving retires it without losing history.
 */
export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<ProjectStatusFilter>('active')
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const closeMenus = () => setOpenRowMenuId(null)

  useEffect(() => {
    let cancelled = false

    listProjects(tab)
      .then((loaded) => {
        if (cancelled) return
        setProjects(loaded)
        setLoadError(null)
      })
      .catch((error) => {
        if (cancelled) return
        setLoadError(apiErrorMessage(error, 'Could not load projects. Is the backend running?'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [tab, reloadKey])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return projects
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(query) ||
        project.clientName.toLowerCase().includes(query),
    )
  }, [projects, search])

  const showNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice((current) => (current === message ? null : current)), 4000)
  }

  const refresh = () => setReloadKey((key) => key + 1)

  const changeTab = (next: ProjectStatusFilter) => {
    if (next === tab) return
    setTab(next)
    setIsLoading(true)
  }

  const handleToggleArchived = (project: Project) => {
    setOpenRowMenuId(null)
    const nextStatus = project.status === 'active' ? 'archived' : 'active'

    updateProject(project.id, { status: nextStatus })
      .then((updated) => {
        refresh()
        showNotice(
          updated.status === 'active' ? `${updated.name} was restored.` : `${updated.name} was archived.`,
        )
      })
      .catch((error) => showNotice(apiErrorMessage(error, `Could not update ${project.name}.`)))
  }

  const handleDelete = (project: Project) => {
    setOpenRowMenuId(null)

    deleteProject(project.id)
      .then(() => {
        refresh()
        showNotice(`${project.name} was deleted.`)
      })
      .catch((error) => showNotice(apiErrorMessage(error, `Could not delete ${project.name}.`)))
  }

  return (
    <div className="min-h-full flex-1 px-10 py-8" onClick={closeMenus}>
      <div className="mx-auto flex w-full max-w-[1340px] flex-col gap-4">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-[19px] font-bold text-navy">Projects</h1>
            <p className="mt-[3px] max-w-[560px] text-[13px] leading-[1.5] text-navy/60">
              The work you track time against. Each project belongs to a client and holds its own
              tasks, budget and billing.
            </p>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              setModal({ mode: 'create' })
            }}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-brand px-[18px] py-[9px] font-display text-[13px] font-semibold text-white transition-colors hover:bg-brand-deep"
          >
            <Icon name="plus" className="h-[13px] w-[13px]" />
            New project
          </button>
        </header>

        {notice && (
          <div className="flex items-center gap-2 rounded-[14px] bg-brand-tint px-4 py-3 text-[13px] font-medium text-navy">
            <span aria-hidden="true" className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand" />
            {notice}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full bg-surface-muted p-[3px]">
            {(['active', 'archived', 'all'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => changeTab(option)}
                className={`rounded-full px-3.5 py-[7px] font-display text-[12.5px] font-semibold capitalize ${
                  tab === option ? 'bg-navy text-cream' : 'text-navy/55'
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <span className="flex-1" />

          <label className="flex min-w-[180px] max-w-[280px] flex-1 items-center gap-1.5 rounded-full border-[1.5px] border-navy/[0.08] bg-white px-3.5 py-[7px] focus-within:border-brand">
            <Icon name="search" className="h-3.5 w-3.5 flex-shrink-0 text-navy/50" />
            <input
              className="w-full border-none bg-transparent text-[13px] text-navy outline-none placeholder:text-navy/45"
              placeholder="Search projects..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onClick={(event) => event.stopPropagation()}
            />
          </label>
        </div>

        <div className="rounded-[18px] bg-white shadow-card">
          <div className={`${GRID} border-b border-navy/[0.08]`}>
            <HeaderCell icon="projects" label="Name" />
            <HeaderCell icon="clients" label="Client" />
            <HeaderCell icon="billable" label="Billing" />
            <HeaderCell icon="check-badge" label="Tasks" />
            <HeaderCell icon="check-badge" label="Status" />
            <span />
          </div>

          <div className="divide-y divide-navy/[0.08]">
            {isLoading && <LoadingRow />}

            {!isLoading && loadError && (
              <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
                <span className="text-[13px] text-red">{loadError}</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsLoading(true)
                    setLoadError(null)
                    refresh()
                  }}
                  className="rounded-full border-[1.5px] border-navy px-4 py-1.5 font-display text-[12.5px] font-semibold text-navy"
                >
                  Try again
                </button>
              </div>
            )}

            {!isLoading &&
              !loadError &&
              filtered.map((project) => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  menuOpen={openRowMenuId === project.id}
                  onToggleMenu={(event) => {
                    event.stopPropagation()
                    setOpenRowMenuId(openRowMenuId === project.id ? null : project.id)
                  }}
                  onEdit={() => {
                    setOpenRowMenuId(null)
                    setModal({ mode: 'edit', project })
                  }}
                  onToggleArchived={() => handleToggleArchived(project)}
                  onDelete={() => handleDelete(project)}
                />
              ))}

            {!isLoading && !loadError && filtered.length === 0 && (
              <div className="px-5 py-10 text-center text-[13px] text-navy/50">
                {projects.length === 0
                  ? tab === 'active'
                    ? 'No projects yet. Create your first project to start tracking time against it.'
                    : 'Nothing here.'
                  : 'No projects match your search.'}
              </div>
            )}
          </div>
        </div>

        {modal && (
          <ProjectModal
            project={modal.mode === 'edit' ? modal.project : null}
            onClose={() => setModal(null)}
            onSaved={(saved, created) => {
              setModal(null)
              refresh()
              showNotice(created ? `${saved.name} was added.` : `${saved.name} was updated.`)
            }}
          />
        )}
      </div>
    </div>
  )
}

function LoadingRow() {
  return (
    <div className="flex items-center justify-center px-5 py-10">
      <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-navy/20 border-t-navy" />
    </div>
  )
}

function HeaderCell({ icon, label }: { icon: Parameters<typeof Icon>[0]['name']; label: string }) {
  return (
    <div className="flex items-center gap-1.5 py-1.5 font-display text-[10.5px] font-bold tracking-[0.05em] text-navy/60 uppercase">
      <Icon name={icon} className="h-3 w-3 text-brand" />
      {label}
    </div>
  )
}

function ProjectRow({
  project,
  menuOpen,
  onToggleMenu,
  onEdit,
  onToggleArchived,
  onDelete,
}: {
  project: Project
  menuOpen: boolean
  onToggleMenu: (event: React.MouseEvent) => void
  onEdit: () => void
  onToggleArchived: () => void
  onDelete: () => void
}) {
  const isActive = project.status === 'active'

  return (
    <div className={`${GRID} hover:bg-surface-muted`}>
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden="true"
          className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
          style={{ backgroundColor: project.color ?? 'var(--color-navy)', opacity: project.color ? 1 : 0.2 }}
        />
        <Link
          to={`/projects/${project.id}`}
          onClick={(event) => event.stopPropagation()}
          className="truncate text-[13px] font-semibold text-navy hover:text-brand"
        >
          {project.name}
        </Link>
      </div>

      <span className="truncate text-[12.5px] text-navy/70">{project.clientName}</span>

      <span className="truncate text-[12.5px] text-navy/70">{formatBillingSummary(project)}</span>

      <span
        className={`font-mono text-[12.5px] tabular-nums ${
          project.taskCount > 0 ? 'font-medium' : 'font-normal opacity-40'
        }`}
      >
        {project.taskCount}
      </span>

      <Pill label={isActive ? 'Active' : 'Archived'} dotClassName={STATUS_DOT[isActive ? 'active' : 'archived']} />

      <div className="relative flex justify-end">
        <button
          type="button"
          onClick={onToggleMenu}
          aria-label="Row actions"
          className="flex h-6 w-6 items-center justify-center rounded-md text-navy/50 hover:bg-surface-muted hover:text-navy"
        >
          <Icon name="more" className="h-[15px] w-[15px]" />
        </button>
        {menuOpen && (
          <div className="absolute top-[calc(100%+4px)] right-0 z-30 min-w-[170px] rounded-[14px] bg-white p-[5px] shadow-[0_16px_36px_rgba(31,43,77,0.16)]">
            <RowMenuItem icon="settings" label="Edit" onClick={onEdit} />
            <RowMenuItem
              icon="check-badge"
              label={isActive ? 'Archive' : 'Restore'}
              onClick={onToggleArchived}
            />
            <RowMenuItem icon="ban" label="Delete" danger onClick={onDelete} />
          </div>
        )}
      </div>
    </div>
  )
}

function RowMenuItem({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: Parameters<typeof Icon>[0]['name']
  label: string
  danger?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onClick?.()
      }}
      className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[12.5px] font-medium hover:bg-surface-muted ${
        danger ? 'text-red' : 'text-navy'
      }`}
    >
      <Icon name={icon} className={`h-[13px] w-[13px] ${danger ? 'opacity-80' : 'opacity-65'}`} />
      {label}
    </button>
  )
}
