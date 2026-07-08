import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { Modal } from '../components/ui/Modal'
import { Pill } from '../components/ui/Pill'
import {
  clientApiErrorMessage,
  createClient,
  deleteClient,
  listClients,
  updateClient,
  type ClientStatusFilter,
} from '../api/clients'
import type { Client } from '../types/client'

type ModalState = { mode: 'create' } | { mode: 'edit'; client: Client } | null

const STATUS_DOT: Record<'active' | 'archived', string> = {
  active: 'bg-[#1E8A57]',
  archived: 'bg-navy/35',
}

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
  const [modal, setModal] = useState<ModalState>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const closeMenus = () => setOpenRowMenuId(null)

  // Tab changes refetch with the spinner; reloadKey bumps (after mutations)
  // refetch silently over the stale list.
  useEffect(() => {
    let cancelled = false

    listClients(tab)
      .then((loaded) => {
        if (cancelled) return
        setClients(loaded)
        setLoadError(null)
      })
      .catch((error) => {
        if (cancelled) return
        setLoadError(clientApiErrorMessage(error, 'Could not load clients. Is the backend running?'))
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
        showNotice(clientApiErrorMessage(error, `Could not update ${client.name}.`)),
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
        showNotice(clientApiErrorMessage(error, `Could not delete ${client.name}.`)),
      )
  }

  return (
    <div className="min-h-full flex-1 px-10 py-8" onClick={closeMenus}>
      <div className="mx-auto flex w-full max-w-[1340px] flex-col gap-4">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-[19px] font-bold text-navy">Clients</h1>
            <p className="mt-[3px] max-w-[560px] text-[13px] leading-[1.5] text-navy/60">
              The companies and people you work for. Projects (and their tracked time) are grouped
              under a client.
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
            New client
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
              placeholder="Search clients..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onClick={(event) => event.stopPropagation()}
            />
          </label>
        </div>

        <div className="rounded-[18px] bg-white shadow-card">
          <div className={`${GRID} border-b border-navy/[0.08]`}>
            <HeaderCell icon="clients" label="Name" />
            <HeaderCell icon="projects" label="Projects" />
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
              filtered.map((client) => (
                <ClientRow
                  key={client.id}
                  client={client}
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
              <div className="px-5 py-10 text-center text-[13px] text-navy/50">
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

function ClientRow({
  client,
  menuOpen,
  onToggleMenu,
  onEdit,
  onToggleArchived,
  onDelete,
}: {
  client: Client
  menuOpen: boolean
  onToggleMenu: (event: React.MouseEvent) => void
  onEdit: () => void
  onToggleArchived: () => void
  onDelete: () => void
}) {
  const initial = client.name.trim().charAt(0).toUpperCase() || '?'
  const canDelete = client.projectCount === 0

  return (
    <div className={`${GRID} hover:bg-surface-muted`}>
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-[9px] bg-surface-muted font-mono text-[10.5px] font-medium text-navy">
          {initial}
        </span>
        <span className="truncate text-[13px] font-semibold">{client.name}</span>
      </div>

      <span
        className={`font-mono text-[12.5px] tabular-nums ${
          client.projectCount > 0 ? 'font-medium' : 'font-normal opacity-40'
        }`}
      >
        {client.projectCount}
      </span>

      <Pill
        label={client.isActive ? 'Active' : 'Archived'}
        dotClassName={STATUS_DOT[client.isActive ? 'active' : 'archived']}
      />

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
  disabled,
  title,
  onClick,
}: {
  icon: Parameters<typeof Icon>[0]['name']
  label: string
  danger?: boolean
  disabled?: boolean
  title?: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={(event) => {
        event.stopPropagation()
        onClick?.()
      }}
      className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[12.5px] font-medium ${
        disabled
          ? 'cursor-not-allowed text-navy/35'
          : `hover:bg-surface-muted ${danger ? 'text-red' : 'text-navy'}`
      }`}
    >
      <Icon name={icon} className={`h-[13px] w-[13px] ${danger && !disabled ? 'opacity-80' : 'opacity-65'}`} />
      {label}
    </button>
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
        setError(clientApiErrorMessage(saveError, 'Could not save the client. Please try again.'))
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
          <label className="mb-1.5 block font-display text-[11.5px] font-semibold text-navy/70">
            Client name
          </label>
          <input
            autoFocus
            className="w-full rounded-[10px] border-[1.5px] border-navy/[0.08] px-3 py-[9px] text-[13px] text-navy outline-none focus:border-brand"
            placeholder="Acme Corp"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        {error && (
          <div className="mb-3 rounded-[10px] bg-red-tint px-3 py-2.5 text-[12.5px] leading-[1.5] text-red">
            {error}
          </div>
        )}

        <div className="mt-[18px] flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border-[1.5px] border-navy bg-transparent py-2.5 font-display text-[13px] font-semibold text-navy"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSave}
            className="flex-1 rounded-full bg-brand py-2.5 font-display text-[13px] font-semibold text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : client ? 'Save changes' : 'Add client'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
