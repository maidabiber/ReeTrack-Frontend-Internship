import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiErrorMessage } from '../api/client'
import {
  deleteCustomReportDefinition,
  duplicateCustomReportDefinition,
  listCustomReportDefinitions,
  updateCustomReportDefinition,
} from '../api/customReports'
import { fetchAllPages } from '../api/pagination'
import {
  DirectoryHeader,
  DirectorySearch,
  LoadErrorState,
  NoticeBanner,
  SegmentedTabs,
} from '../components/directory/DirectoryControls'
import { HeaderCell, RowMenu, RowMenuItem, SkeletonRow } from '../components/directory/DirectoryTable'
import { riseDelay } from '../components/directory/directoryChrome'
import { PAGE_PAD } from '../components/layout/pageChrome'
import { AccessDenied } from '../components/auth/AccessDenied'
import { Modal } from '../components/ui/Modal'
import { useAuth } from '../hooks/useAuth'
import { useTransientNotice } from '../hooks/useTransientNotice'
import { Permissions } from '../lib/permissions'
import type { CustomReportDefinition, CustomReportOwnerFilter, CustomReportVisibility } from '../types/customReport'

const GRID = 'grid grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_120px_32px] items-center gap-2.5 px-3.5 py-2.5'

type LibraryFilter = CustomReportOwnerFilter | 'all'

const LIBRARY_FILTERS: ReadonlyArray<{ value: LibraryFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'mine', label: 'Mine' },
  { value: 'shared', label: 'Shared' },
]

/**
 * Library of saved custom report definitions.
 * Create opens the builder; row actions cover open / rename / duplicate / delete.
 */
export default function CustomReportsPage() {
  const { hasPermission } = useAuth()
  if (!hasPermission(Permissions.ReportsView)) {
    return (
      <AccessDenied description="Custom reports are available to project managers and workspace admins." />
    )
  }
  return <CustomReportsLibrary />
}

function CustomReportsLibrary() {
  const navigate = useNavigate()
  const [items, setItems] = useState<CustomReportDefinition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>('all')
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null)
  const [notice, showNotice] = useTransientNotice()
  const [reloadKey, setReloadKey] = useState(0)
  const [renameTarget, setRenameTarget] = useState<CustomReportDefinition | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameDescription, setRenameDescription] = useState('')
  const [renameVisibility, setRenameVisibility] = useState<CustomReportVisibility>('Shared')
  const [pendingDelete, setPendingDelete] = useState<CustomReportDefinition | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    const owner = libraryFilter === 'all' ? undefined : libraryFilter

    fetchAllPages((page, pageSize) => listCustomReportDefinitions({ page, pageSize, owner }))
      .then((loaded) => {
        if (cancelled) return
        setItems(loaded)
        setLoadError(null)
      })
      .catch((error) => {
        if (cancelled) return
        setLoadError(apiErrorMessage(error, 'Could not load custom reports. Is the backend running?'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey, libraryFilter])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return items
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        (item.description ?? '').toLowerCase().includes(query),
    )
  }, [items, search])

  function refresh() {
    setReloadKey((key) => key + 1)
  }

  async function handleDuplicate(item: CustomReportDefinition) {
    setOpenRowMenuId(null)
    setBusy(true)
    try {
      const copy = await duplicateCustomReportDefinition(item.id)
      showNotice(`Duplicated as “${copy.name}”.`)
      navigate(`/reports/custom/${copy.id}?edit=1`)
    } catch (error) {
      showNotice(apiErrorMessage(error, `Could not duplicate ${item.name}.`))
    } finally {
      setBusy(false)
    }
  }

  async function handleRename() {
    if (!renameTarget || !renameValue.trim()) return
    setBusy(true)
    try {
      await updateCustomReportDefinition(renameTarget.id, {
        name: renameValue.trim(),
        description: renameDescription.trim() || null,
        spec: renameTarget.spec,
        visibility: renameVisibility,
      })
      showNotice('Report saved.')
      setRenameTarget(null)
      refresh()
    } catch (error) {
      showNotice(apiErrorMessage(error, 'Could not save the report.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return
    setBusy(true)
    try {
      await deleteCustomReportDefinition(pendingDelete.id)
      showNotice(`${pendingDelete.name} was deleted.`)
      setPendingDelete(null)
      refresh()
    } catch (error) {
      showNotice(apiErrorMessage(error, `Could not delete ${pendingDelete.name}.`))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={`mx-auto w-full max-w-page ${PAGE_PAD}`}
      onClick={() => setOpenRowMenuId(null)}
    >
      <DirectoryHeader
        title="Custom reports"
        count={isLoading ? null : items.length}
        actionLabel="New custom report"
        onAction={() => navigate('/reports/custom/new')}
      />

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <SegmentedTabs options={LIBRARY_FILTERS} value={libraryFilter} onChange={setLibraryFilter} />
        <div className="min-w-[14rem] flex-1">
          <DirectorySearch value={search} onChange={setSearch} placeholder="Search reports…" />
        </div>
      </div>

      {notice ? (
        <div className="mt-4">
          <NoticeBanner>{notice}</NoticeBanner>
        </div>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-2xl bg-white shadow-card">
        {isLoading ? (
          <div>
            <div className={`${GRID} border-b border-navy/5 bg-surface-muted/40`}>
              <HeaderCell icon="reports" label="Name" />
              <HeaderCell icon="folder-open" label="Description" />
              <HeaderCell icon="calendar" label="Updated" />
              <span />
            </div>
            {[0, 1, 2].map((index) => (
              <SkeletonRow key={index} gridClassName={GRID} index={index}>
                <span className="h-3 w-36 rounded-full bg-navy/10" />
                <span className="h-3 w-24 rounded-full bg-navy/10" />
                <span className="h-3 w-16 rounded-full bg-navy/10" />
                <span />
              </SkeletonRow>
            ))}
          </div>
        ) : loadError ? (
          <LoadErrorState message={loadError} onRetry={() => { setIsLoading(true); refresh() }} />
        ) : filtered.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="font-display text-base font-bold text-navy">
              {items.length === 0 ? 'No custom reports yet' : 'No matches'}
            </p>
            <p className="mt-1 text-body text-navy/55">
              {items.length === 0
                ? 'Compose a report from KPI, breakdown, and chart blocks.'
                : 'Try a different search.'}
            </p>
            {items.length === 0 ? (
              <button
                type="button"
                onClick={() => navigate('/reports/custom/new')}
                className="mt-5 rounded-full bg-brand px-4 py-2.5 text-body font-medium text-white hover:bg-brand-deep"
              >
                New report
              </button>
            ) : null}
          </div>
        ) : (
          <div>
            <div className={`${GRID} border-b border-navy/5 bg-surface-muted/40`}>
              <HeaderCell icon="reports" label="Name" />
              <HeaderCell icon="folder-open" label="Description" />
              <HeaderCell icon="calendar" label="Updated" />
              <span />
            </div>
            {filtered.map((item, index) => (
              <div
                key={item.id}
                className={`${GRID} border-b border-navy/5 last:border-b-0 motion-safe:animate-rise`}
                style={riseDelay(index)}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Link
                    to={`/reports/custom/${item.id}`}
                    className="min-w-0 truncate font-display text-body font-semibold text-navy hover:text-brand"
                  >
                    {item.name}
                  </Link>
                  {item.visibility === 'Private' ? (
                    <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-navy/50">
                      Private
                    </span>
                  ) : null}
                </div>
                <p className="min-w-0 truncate text-caption text-navy/50">
                  {item.description || '—'}
                </p>
                <p className="font-mono text-[11px] text-navy/45 tabular-nums">
                  {new Date(item.updatedAtUtc).toLocaleDateString()}
                </p>
                <RowMenu
                  open={openRowMenuId === item.id}
                  onToggle={(event) => {
                    event.stopPropagation()
                    setOpenRowMenuId((current) => (current === item.id ? null : item.id))
                  }}
                >
                  <RowMenuItem
                    icon="folder-open"
                    label="Open"
                    onClick={() => navigate(`/reports/custom/${item.id}`)}
                  />
                  {item.canEdit ? (
                    <RowMenuItem
                      icon="settings"
                      label="Edit"
                      onClick={() => navigate(`/reports/custom/${item.id}?edit=1`)}
                    />
                  ) : null}
                  {item.canEdit ? (
                    <RowMenuItem
                      icon="save"
                      label="Edit details"
                      onClick={() => {
                        setOpenRowMenuId(null)
                        setRenameTarget(item)
                        setRenameValue(item.name)
                        setRenameDescription(item.description ?? '')
                        setRenameVisibility(item.visibility)
                      }}
                    />
                  ) : null}
                  <RowMenuItem
                    icon="share"
                    label="Duplicate"
                    disabled={busy}
                    onClick={() => void handleDuplicate(item)}
                  />
                  {item.canEdit ? (
                    <RowMenuItem
                      icon="trash"
                      label="Delete"
                      danger
                      onClick={() => {
                        setOpenRowMenuId(null)
                        setPendingDelete(item)
                      }}
                    />
                  ) : null}
                </RowMenu>
              </div>
            ))}
          </div>
        )}
      </div>

      {renameTarget ? (
        <Modal title="Edit report details" onClose={() => setRenameTarget(null)}>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-navy/45">Name</span>
            <input
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              className="mt-1 w-full rounded-lg border border-navy/10 bg-white px-3 py-2 text-body text-navy outline-none focus:border-brand"
              autoFocus
            />
          </label>
          <label className="mt-3 block">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-navy/45">
              Description
            </span>
            <textarea
              value={renameDescription}
              onChange={(event) => setRenameDescription(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-navy/10 bg-white px-3 py-2 text-body text-navy outline-none focus:border-brand"
            />
          </label>
          <div className="mt-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-navy/45">
              Visibility
            </span>
            <div className="mt-1.5 flex gap-1.5">
              {(['Shared', 'Private'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRenameVisibility(option)}
                  className={`rounded-full px-3 py-1.5 text-body font-medium transition-colors ${
                    renameVisibility === option
                      ? 'bg-navy text-cream'
                      : 'bg-surface-muted text-navy/70 hover:bg-navy/10'
                  }`}
                >
                  {option === 'Shared' ? 'Shared with admins' : 'Private to me'}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRenameTarget(null)}
              className="rounded-full px-4 py-2 text-body font-medium text-navy/70 hover:bg-surface-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || !renameValue.trim()}
              onClick={() => void handleRename()}
              className="rounded-full bg-brand px-4 py-2 text-body font-medium text-white hover:bg-brand-deep disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
      ) : null}

      {pendingDelete ? (
        <Modal
          title="Delete report"
          subtitle={`Remove “${pendingDelete.name}” from the library? This can be recovered by an admin later.`}
          onClose={() => setPendingDelete(null)}
        >
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPendingDelete(null)}
              className="rounded-full px-4 py-2 text-body font-medium text-navy/70 hover:bg-surface-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleDelete()}
              className="rounded-full bg-navy px-4 py-2 text-body font-medium text-white hover:bg-navy/90 disabled:opacity-50"
            >
              {busy ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
