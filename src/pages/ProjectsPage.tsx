import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ProjectModal } from '../components/projects/ProjectModal'
import { JiraImportModal } from '../components/integrations/JiraImportModal'
import {
  DirectoryHeader,
  DirectorySearch,
  LoadErrorState,
  NoticeBanner,
  SegmentedTabs,
} from '../components/directory/DirectoryControls'
import {
  HeaderCell,
  RowMenu,
  RowMenuItem,
  SkeletonRow,
  StatusMark,
} from '../components/directory/DirectoryTable'
import { riseDelay, STATUS_COLOR } from '../components/directory/directoryChrome'
import { apiErrorMessage } from '../api/client'
import {
  deleteProject,
  listProjects,
  updateProject,
  type ProjectStatusFilter,
} from '../api/projects'
import { fetchAllPages } from '../api/pagination'
import { formatBillingSummary } from '../lib/projectFormat'
import { useAuth } from '../hooks/useAuth'
import { softAccentFill } from '../lib/color'
import type { Project } from '../types/project'

type ModalState = { mode: 'create' } | { mode: 'edit'; project: Project } | null

/* Name · client · billing · budget · estimate · tasks · status · menu.
 * Numeric columns sit right-aligned — this is the money directory, so it
 * reads like a ledger rather than a contact list. */
const GRID =
  'grid grid-cols-[2.1fr_1.2fr_1.4fr_0.8fr_0.6fr_0.8fr_32px] items-center gap-2.5 px-3.5 py-2'

/**
 * RT-37/RT-38 — the project directory. A ledger-style table: every project
 * with its client, billing model, budget, time estimate and task count
 * (GET /api/projects) visible at a glance, with per-currency totals for the
 * rows on screen. Create/edit (modal), archive/restore and soft-delete;
 * deleting is blocked server-side (409) while a project has tracked time,
 * archiving retires it without losing history.
 */
export default function ProjectsPage() {
  const { user, role } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<ProjectStatusFilter>('active')
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>(null)
  const [jiraImportOpen, setJiraImportOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const closeMenus = () => setOpenRowMenuId(null)

  useEffect(() => {
    let cancelled = false

    fetchAllPages((page, pageSize) => listProjects(tab, { page, pageSize }))
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
      <div className="mx-auto flex w-full max-w-page flex-col gap-4">
        <DirectoryHeader
          title="Projects"
          count={!isLoading && !loadError ? filtered.length : null}
          actionLabel="New project"
          onAction={(event) => {
            event.stopPropagation()
            setModal({ mode: 'create' })
          }}
          secondaryActionLabel="Import from Jira"
          onSecondaryAction={(event) => {
            event.stopPropagation()
            setJiraImportOpen(true)
          }}
        />

        {notice && <NoticeBanner>{notice}</NoticeBanner>}

        <div className="flex flex-wrap items-center gap-2">
          <SegmentedTabs
            options={[
              { value: 'active', label: 'Active' },
              { value: 'archived', label: 'Archived' },
              { value: 'all', label: 'All' },
            ]}
            value={tab}
            onChange={changeTab}
          />

          <span className="flex-1" />

          <DirectorySearch placeholder="Search projects..." value={search} onChange={setSearch} />
        </div>

        {!isLoading && !loadError && filtered.length === 0 && projects.length === 0 && tab === 'active' ? (
          <EmptyDirectory
            onCreate={(event) => {
              event.stopPropagation()
              setModal({ mode: 'create' })
            }}
          />
        ) : (
          <div className="rounded-2xl bg-white shadow-card">
            <div className={`${GRID} border-b border-navy/[0.08]`}>
              <HeaderCell icon="projects" label="Name" />
              <HeaderCell icon="clients" label="Client" />
              <HeaderCell icon="billable" label="Billing" />
              <HeaderCell icon="timer" label="Estimate" alignEnd />
              <HeaderCell icon="check-badge" label="Tasks" alignEnd />
              <HeaderCell icon="shield" label="Status" />
              <span />
            </div>

            <div className="divide-y divide-navy/[0.08]">
              {isLoading && <SkeletonRows />}

              {!isLoading && loadError && (
                <LoadErrorState
                  message={loadError}
                  onRetry={() => {
                    setIsLoading(true)
                    setLoadError(null)
                    refresh()
                  }}
                />
              )}

              {!isLoading &&
                !loadError &&
                filtered.map((project, index) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    index={index}
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
                    canDelete={role === 'Admin' || user?.id === project.createdByUserId}
                  />
                ))}

              {!isLoading && !loadError && filtered.length === 0 && (
                <div className="px-5 py-10 text-center text-body text-navy/50">
                  {projects.length === 0 ? 'Nothing here.' : 'No projects match your search.'}
                </div>
              )}
            </div>

            {!isLoading && !loadError && filtered.length > 0 && <TotalsFooter projects={filtered} />}
          </div>
        )}

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

        {jiraImportOpen && (
          <JiraImportModal
            onClose={() => setJiraImportOpen(false)}
            onImported={(message) => {
              refresh()
              showNotice(message)
            }}
            onIntegrated={(_projectId, message) => {
              setJiraImportOpen(false)
              refresh()
              showNotice(message)
            }}
          />
        )}
      </div>
    </div>
  )
}

/** Ghost rows while the directory loads, matching the real grid's geometry. */
function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }, (_, index) => (
        <SkeletonRow key={index} gridClassName={GRID} index={index}>
          <div className="flex items-center gap-2.5">
            <span className="h-[26px] w-[26px] flex-shrink-0 rounded-sm bg-surface-muted" />
            <span className="h-3 w-28 rounded-full bg-navy/10" />
          </div>
          <span className="h-3 w-20 rounded-full bg-navy/[0.07]" />
          <span className="h-3 w-24 rounded-full bg-navy/[0.07]" />
          <span className="h-3 w-16 justify-self-end rounded-full bg-navy/[0.07]" />
          <span className="h-3 w-10 justify-self-end rounded-full bg-navy/[0.07]" />
          <span className="h-3 w-6 justify-self-end rounded-full bg-navy/[0.07]" />
          <span className="h-3 w-12 rounded-full bg-navy/[0.07]" />
          <span />
        </SkeletonRow>
      ))}
    </>
  )
}

/**
 * First-run empty state. Borrows the auth screens' tilted brand-family blobs
 * (design.md §2) at card scale, so the blank directory has some character.
 */
function EmptyDirectory({ onCreate }: { onCreate: (event: React.MouseEvent) => void }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white px-5 py-14 text-center shadow-card">
      <span aria-hidden="true" className="absolute -top-12 -right-8 h-36 w-36 rounded-full bg-brand-veil" />
      <span aria-hidden="true" className="absolute -bottom-14 -left-8 h-40 w-40 rounded-full bg-brand-tint" />
      <span aria-hidden="true" className="absolute top-9 left-[16%] h-7 w-7 -rotate-12 rounded-[9px] bg-brand-tint" />
      <span aria-hidden="true" className="absolute right-[20%] bottom-10 h-5 w-5 rotate-12 rounded-[7px] bg-brand-hi opacity-60" />
      <span aria-hidden="true" className="absolute top-[30%] right-[9%] h-10 w-10 rotate-6 rounded-[12px] bg-brand opacity-80" />
      <div className="relative">
        <p className="font-display text-md font-semibold text-navy">No projects yet</p>
        <p className="mx-auto mt-1 max-w-[360px] text-body leading-[1.5] text-navy/60">
          Create your first project to start tracking time against it.
        </p>
        <button
          type="button"
          onClick={onCreate}
          className="mt-5 rounded-full bg-brand px-4.5 py-field font-display text-body font-semibold text-white transition-colors hover:bg-brand-deep"
        >
          New project
        </button>
      </div>
    </div>
  )
}

/**
 * The ledger's bottom line: task and estimate sums for the rows currently on
 * screen, so filtering/searching re-totals live.
 */
function TotalsFooter({ projects }: { projects: Project[] }) {
  let tasks = 0
  let estimate = 0

  for (const project of projects) {
    tasks += project.taskCount
    estimate += project.timeEstimateHours ?? 0
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-navy/[0.08] bg-canvas/60 px-3.5 py-2.5">
      <span className="font-mono text-micro font-medium tracking-[0.16em] text-navy/40 uppercase">
        On screen
      </span>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-caption tabular-nums text-navy/70">
        {estimate > 0 && <span>{estimate} h estimated</span>}
        <span>
          {tasks} {tasks === 1 ? 'task' : 'tasks'}
        </span>
      </div>
    </div>
  )
}

function ProjectRow({
  project,
  index,
  menuOpen,
  onToggleMenu,
  onEdit,
  onToggleArchived,
  onDelete,
  canDelete,
}: {
  project: Project
  index: number
  menuOpen: boolean
  onToggleMenu: (event: React.MouseEvent) => void
  onEdit: () => void
  onToggleArchived: () => void
  onDelete: () => void
  canDelete: boolean
}) {
  const isActive = project.status === 'active'

  return (
    <div
      className={`${GRID} transition-colors hover:bg-surface-muted/60 motion-safe:animate-rise`}
      style={riseDelay(index)}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden="true"
          className={`h-[26px] w-[26px] flex-shrink-0 rounded-sm ${isActive ? '' : 'opacity-50 grayscale'}`}
          style={{ backgroundColor: softAccentFill(project.color) }}
        />
        <Link
          to={`/projects/${project.id}`}
          onClick={(event) => event.stopPropagation()}
          className="truncate font-display text-md font-semibold text-navy hover:text-brand"
        >
          {project.name}
        </Link>
      </div>

      <span className="truncate text-caption text-navy/60">{project.clientName}</span>

      <span className="truncate text-caption text-navy/70">{formatBillingSummary(project)}</span>

      <span
        className={`justify-self-end text-caption tabular-nums ${
          project.timeEstimateHours !== null ? 'text-navy/70' : 'text-navy/30'
        }`}
      >
        {project.timeEstimateHours !== null ? `${project.timeEstimateHours} h` : '—'}
      </span>

      <span
        className={`justify-self-end text-caption tabular-nums ${
          project.taskCount > 0 ? 'font-medium text-navy/70' : 'text-navy/30'
        }`}
      >
        {project.taskCount}
      </span>

      <StatusMark
        label={isActive ? 'Active' : 'Archived'}
        colorClassName={STATUS_COLOR[isActive ? 'active' : 'archived']}
      />

      <RowMenu open={menuOpen} onToggle={onToggleMenu}>
        <RowMenuItem icon="settings" label="Edit" onClick={onEdit} />
        <RowMenuItem
          icon="check-badge"
          label={isActive ? 'Archive' : 'Restore'}
          onClick={onToggleArchived}
        />
        {canDelete && <RowMenuItem icon="ban" label="Delete" danger onClick={onDelete} />}
      </RowMenu>
    </div>
  )
}
