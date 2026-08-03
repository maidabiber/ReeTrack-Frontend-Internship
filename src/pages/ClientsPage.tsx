import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { Modal } from '../components/ui/Modal'
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
import { PAGE_PAD } from '../components/layout/pageChrome'
import {
  createClient,
  deleteClient,
  listClients,
  updateClient,
  type ClientStatusFilter,
} from '../api/clients'
import { apiErrorMessage } from '../api/client'
import { fetchAllPages } from '../api/pagination'
import { listProjects } from '../api/projects'
import { clientCoverUrl, projectCoverUrl } from '../lib/projectCover'
import { formatBillingSummary } from '../lib/projectFormat'
import type { Client } from '../types/client'
import type { Project } from '../types/project'

type ModalState = { mode: 'create' } | { mode: 'edit'; client: Client } | null

const GRID = 'grid grid-cols-[2.4fr_0.9fr_0.9fr_32px] items-center gap-2.5 px-3.5 py-2'

/**
 * RT-45/RT-153 — the client directory. Lists clients with their project
 * counts (GET /api/clients), with create/rename (modal), archive/restore and
 * soft-delete. Deleting is blocked server-side while a client has projects;
 * archiving is the Toggl-style way to retire a client without losing history.
 */
export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<ClientStatusFilter>('active')
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null)
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const closeMenus = () => setOpenRowMenuId(null)

  // Tab changes refetch with the spinner; reloadKey bumps (after mutations)
  // refetch silently over the stale list.
  useEffect(() => {
    let cancelled = false

    fetchAllPages((page, pageSize) => listClients(tab, { page, pageSize }))
      .then((loaded) => {
        if (cancelled) return
        setClients(loaded)
        setLoadError(null)
      })
      .catch((error) => {
        if (cancelled) return
        setLoadError(apiErrorMessage(error, 'Could not load clients. Is the backend running?'))
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
    if (!query) return clients
    return clients.filter((client) => client.name.toLowerCase().includes(query))
  }, [clients, search])

  const showNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice((current) => (current === message ? null : current)), 4000)
  }

  const refresh = () => setReloadKey((key) => key + 1)

  const changeTab = (next: ClientStatusFilter) => {
    if (next === tab) return
    setTab(next)
    setIsLoading(true)
  }

  const handleToggleArchived = (client: Client) => {
    setOpenRowMenuId(null)

    updateClient(client.id, { isActive: !client.isActive })
      .then((updated) => {
        refresh()
        showNotice(updated.isActive ? `${updated.name} was restored.` : `${updated.name} was archived.`)
      })
      .catch((error) =>
        showNotice(apiErrorMessage(error, `Could not update ${client.name}.`)),
      )
  }

  const handleDelete = (client: Client) => {
    setOpenRowMenuId(null)

    deleteClient(client.id)
      .then(() => {
        refresh()
        showNotice(`${client.name} was deleted.`)
      })
      .catch((error) =>
        showNotice(apiErrorMessage(error, `Could not delete ${client.name}.`)),
      )
  }

  return (
    <div className={`min-h-full flex-1 ${PAGE_PAD}`} onClick={closeMenus}>
      <div className="mx-auto flex w-full max-w-page flex-col gap-4">
        <DirectoryHeader
          title="Clients"
          count={!isLoading && !loadError ? filtered.length : null}
          actionLabel="New client"
          onAction={(event) => {
            event.stopPropagation()
            setModal({ mode: 'create' })
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

          <div className="w-full sm:ml-auto sm:w-auto">
            <DirectorySearch placeholder="Search clients..." value={search} onChange={setSearch} />
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-card">
          <div className={`hidden md:grid ${GRID} border-b border-navy/[0.08]`}>
            <HeaderCell icon="clients" label="Name" />
            <HeaderCell icon="projects" label="Projects" />
            <HeaderCell icon="check-badge" label="Status" />
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
              filtered.map((client, index) => (
                <ClientRow
                  key={client.id}
                  client={client}
                  index={index}
                  expanded={expandedClientId === client.id}
                  onToggleExpand={() =>
                    setExpandedClientId(expandedClientId === client.id ? null : client.id)
                  }
                  menuOpen={openRowMenuId === client.id}
                  onToggleMenu={(event) => {
                    event.stopPropagation()
                    setOpenRowMenuId(openRowMenuId === client.id ? null : client.id)
                  }}
                  onEdit={() => {
                    setOpenRowMenuId(null)
                    setModal({ mode: 'edit', client })
                  }}
                  onToggleArchived={() => handleToggleArchived(client)}
                  onDelete={() => handleDelete(client)}
                />
              ))}

            {!isLoading && !loadError && filtered.length === 0 && (
              <div className="px-5 py-10 text-center text-body text-navy/50">
                {clients.length === 0
                  ? tab === 'active'
                    ? 'No clients yet. Add your first client to group projects under it.'
                    : 'Nothing here.'
                  : 'No clients match your search.'}
              </div>
            )}
          </div>
        </div>

        {modal && (
          <ClientModal
            client={modal.mode === 'edit' ? modal.client : null}
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

/** Ghost rows while clients load, matching the real grid's geometry. */
function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }, (_, index) => (
        <SkeletonRow key={index} gridClassName={GRID} index={index}>
          <div className="flex items-center gap-2.5">
            <span className="h-[26px] w-[26px] flex-shrink-0 rounded-sm bg-surface-muted" />
            <span className="h-3 w-28 rounded-full bg-navy/10" />
          </div>
          <span className="h-3 w-8 rounded-full bg-navy/[0.07]" />
          <span className="h-3 w-14 rounded-full bg-navy/[0.07]" />
          <span />
        </SkeletonRow>
      ))}
    </>
  )
}

function ClientRow({
  client,
  index,
  expanded,
  onToggleExpand,
  menuOpen,
  onToggleMenu,
  onEdit,
  onToggleArchived,
  onDelete,
}: {
  client: Client
  index: number
  expanded: boolean
  onToggleExpand: () => void
  menuOpen: boolean
  onToggleMenu: (event: React.MouseEvent) => void
  onEdit: () => void
  onToggleArchived: () => void
  onDelete: () => void
}) {
  const canDelete = client.projectCount === 0

  return (
    <div className="motion-safe:animate-rise" style={riseDelay(index)}>
      {/* Clicking anywhere on the row toggles the project list (mouse
          convenience); the name cell's real <button> is the accessible
          toggle, so the row itself carries no button semantics and the
          row-actions menu isn't nested inside an interactive element. */}
      <div
        onClick={onToggleExpand}
        className="flex cursor-pointer items-start gap-3 px-3.5 py-3 md:hidden"
      >
        <button
          type="button"
          aria-expanded={expanded}
          onClick={(event) => {
            event.stopPropagation()
            onToggleExpand()
          }}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        >
          <img
            src={clientCoverUrl(client)}
            alt=""
            loading="lazy"
            className={`h-[26px] w-[26px] flex-shrink-0 rounded-sm ${
              client.isActive ? '' : 'opacity-50 grayscale'
            }`}
          />
          <span className="min-w-0">
            <span className="block truncate font-display text-md font-semibold text-navy">{client.name}</span>
            <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-navy/60">
              <span>
                <span className="text-navy/40">Projects </span>
                <span className="font-mono tabular-nums">{client.projectCount}</span>
              </span>
              <StatusMark
                label={client.isActive ? 'Active' : 'Archived'}
                colorClassName={STATUS_COLOR[client.isActive ? 'active' : 'archived']}
              />
            </span>
          </span>
          <Icon
            name="chevron-down"
            className={`h-3 w-3 flex-shrink-0 text-navy/35 transition-transform duration-200 ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        </button>
        <RowMenu open={menuOpen} onToggle={onToggleMenu}>
          <RowMenuItem icon="settings" label="Edit" onClick={onEdit} />
          <RowMenuItem
            icon="check-badge"
            label={client.isActive ? 'Archive' : 'Restore'}
            onClick={onToggleArchived}
          />
          <RowMenuItem
            icon="ban"
            label="Delete"
            danger
            disabled={!canDelete}
            title={canDelete ? undefined : 'This client has projects. Archive it instead.'}
            onClick={onDelete}
          />
        </RowMenu>
      </div>

      <div
        onClick={onToggleExpand}
        className={`hidden md:grid ${GRID} cursor-pointer transition-colors hover:bg-surface-muted/60`}
      >
        <button
          type="button"
          aria-expanded={expanded}
          onClick={(event) => {
            event.stopPropagation()
            onToggleExpand()
          }}
          className="flex min-w-0 items-center gap-2.5 text-left"
        >
          <img
            src={clientCoverUrl(client)}
            alt=""
            loading="lazy"
            className={`h-[26px] w-[26px] flex-shrink-0 rounded-sm ${
              client.isActive ? '' : 'opacity-50 grayscale'
            }`}
          />
          <span className="truncate font-display text-md font-semibold text-navy">
            {client.name}
          </span>
          <Icon
            name="chevron-down"
            className={`h-3 w-3 flex-shrink-0 text-navy/35 transition-transform duration-200 ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        </button>

        <span
          className={`font-mono text-caption tabular-nums ${
            client.projectCount > 0 ? 'font-medium' : 'font-normal opacity-40'
          }`}
        >
          {client.projectCount}
        </span>

        <StatusMark
          label={client.isActive ? 'Active' : 'Archived'}
          colorClassName={STATUS_COLOR[client.isActive ? 'active' : 'archived']}
        />

        <RowMenu open={menuOpen} onToggle={onToggleMenu}>
          <RowMenuItem icon="settings" label="Edit" onClick={onEdit} />
          <RowMenuItem
            icon="check-badge"
            label={client.isActive ? 'Archive' : 'Restore'}
            onClick={onToggleArchived}
          />
          <RowMenuItem
            icon="ban"
            label="Delete"
            danger
            disabled={!canDelete}
            title={canDelete ? undefined : 'This client has projects. Archive it instead.'}
            onClick={onDelete}
          />
        </RowMenu>
      </div>

      {expanded && <ClientProjects clientId={client.id} />}
    </div>
  )
}

/**
 * Inline project list under an expanded client row. Fetched lazily per
 * expansion; each project links to its dashboard.
 */
function ClientProjects({ clientId }: { clientId: string }) {
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listProjects('all', { clientId })
      .then((loaded) => {
        if (!cancelled) setProjects(loaded.items)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load projects.')
      })
    return () => {
      cancelled = true
    }
  }, [clientId])

  return (
    <div className="border-t border-navy/[0.06] bg-canvas/60">
      {error && <p className="py-2.5 pl-[50px] text-caption text-red">{error}</p>}

      {!error && projects === null && (
        <div className="flex items-center gap-2.5 py-2.5 pl-[50px] motion-safe:animate-pulse">
          <span className="h-[22px] w-[22px] rounded-xs bg-surface-muted" />
          <span className="h-3 w-32 rounded-full bg-navy/10" />
        </div>
      )}

      {!error && projects !== null && projects.length === 0 && (
        <p className="py-2.5 pl-[50px] text-caption text-navy/45">No projects yet.</p>
      )}

      {!error &&
        projects !== null &&
        projects.map((project, index) => (
          <Link
            key={project.id}
            to={`/projects/${project.id}`}
            onClick={(event) => event.stopPropagation()}
            className="flex items-center gap-2.5 py-2 pr-10 pl-[50px] transition-colors hover:bg-surface-muted/60 motion-safe:animate-rise"
            style={riseDelay(index, 9)}
          >
            <img
              src={projectCoverUrl(project)}
              alt=""
              loading="lazy"
              className={`h-[22px] w-[22px] flex-shrink-0 rounded-xs ${
                project.status === 'active' ? '' : 'opacity-50 grayscale'
              }`}
            />
            <span className="min-w-0 flex-1 truncate font-display text-caption font-semibold text-navy">
              {project.name}
            </span>
            {project.status === 'archived' && (
              <span className="flex-shrink-0 font-mono text-micro tracking-[0.08em] text-navy/40 uppercase">
                Archived
              </span>
            )}
            <span className="hidden flex-shrink-0 font-mono text-sm text-navy/60 sm:block">
              {formatBillingSummary(project)}
            </span>
            <span className="w-16 flex-shrink-0 text-right font-mono text-sm tabular-nums text-navy/50">
              {project.taskCount} {project.taskCount === 1 ? 'task' : 'tasks'}
            </span>
          </Link>
        ))}
    </div>
  )
}

/** Create/edit form: a single name field; the backend enforces uniqueness. */
function ClientModal({
  client,
  onClose,
  onSaved,
}: {
  client: Client | null
  onClose: () => void
  onSaved: (saved: Client, created: boolean) => void
}) {
  const [name, setName] = useState(client?.name ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmed = name.trim()
  const canSave = trimmed.length > 0 && trimmed.length <= 200 && !isSaving

  const save = () => {
    if (!canSave) return
    setIsSaving(true)
    setError(null)

    const request = client ? updateClient(client.id, { name: trimmed }) : createClient(trimmed)

    request
      .then((saved) => onSaved(saved, client === null))
      .catch((saveError) => {
        setError(apiErrorMessage(saveError, 'Could not save the client. Please try again.'))
        setIsSaving(false)
      })
  }

  return (
    <Modal
      title={client ? 'Edit client' : 'New client'}
      subtitle={client ? undefined : 'Projects are grouped under a client.'}
      onClose={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
      >
        <div className="mb-3">
          <label className="mb-1.5 block font-display text-label font-semibold text-navy/70">
            Client name
          </label>
          <input
            autoFocus
            className="w-full rounded-md border-control border-navy/[0.08] px-3 py-field text-body text-navy outline-none focus:border-brand"
            placeholder="Acme Corp"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        {error && (
          <div className="mb-3 rounded-md bg-red-tint px-3 py-2.5 text-sm leading-[1.5] text-red">
            {error}
          </div>
        )}

        <div className="mt-4.5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border-control border-navy bg-transparent py-2.5 font-display text-body font-semibold text-navy"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSave}
            className="flex-1 rounded-full bg-brand py-2.5 font-display text-body font-semibold text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : client ? 'Save changes' : 'Add client'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
