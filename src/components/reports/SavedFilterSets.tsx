import { useCallback, useEffect, useRef, useState } from 'react'
import { apiErrorMessage } from '../../api/client'
import {
  createReportFilterSet,
  deleteReportFilterSet,
  listReportFilterSets,
  updateReportFilterSet,
} from '../../api/reports'
import { fetchAllPages } from '../../api/pagination'
import { useDismissOnOutside } from '../../hooks/useDismissOnOutside'
import { cloneReportQuery } from '../../lib/reportQuery'
import type { ReportFilterSet, ReportQuery } from '../../types/reportQuery'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'

/**
 * Personal saved filter sets for Reports (RT-54). Loading a set updates the
 * draft only — Apply still owns the fetch.
 */
export function SavedFilterSets({
  draft,
  onLoad,
}: {
  draft: ReportQuery
  onLoad: (query: ReportQuery) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const [sets, setSets] = useState<ReportFilterSet[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ReportFilterSet | null>(null)
  useDismissOnOutside(rootRef, open, () => setOpen(false), { closeOnEscape: true })

  const loadSets = useCallback(
    () =>
      fetchAllPages((page, pageSize) =>
        listReportFilterSets({ page, pageSize }),
      ),
    [],
  )

  useEffect(() => {
    let cancelled = false

    void (async () => {
      await Promise.resolve()
      if (cancelled) return

      try {
        const items = await loadSets()
        if (cancelled) return
        setSets(items)
        setError(null)
      } catch (cause) {
        if (!cancelled) setError(apiErrorMessage(cause, 'Could not load saved filter sets.'))
      } finally {
        if (!cancelled) setHasLoaded(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [loadSets])

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Name a filter set before saving.')
      return
    }

    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const created = await createReportFilterSet(trimmed, cloneReportQuery(draft))
      setName('')
      setSelectedId(created.id)
      setNotice(`Saved “${created.name}”.`)
      setSets(await loadSets())
    } catch (cause) {
      setError(apiErrorMessage(cause, 'Could not save the filter set.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleUpdate() {
    const current = sets.find((item) => item.id === selectedId)
    if (!current) {
      setError('Choose a saved set to update.')
      return
    }

    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const updated = await updateReportFilterSet(
        current.id,
        current.name,
        cloneReportQuery(draft),
      )
      setNotice(`Updated “${updated.name}”.`)
      setSets(await loadSets())
    } catch (cause) {
      setError(apiErrorMessage(cause, 'Could not update the filter set.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await deleteReportFilterSet(pendingDelete.id)
      setSelectedId('')
      setNotice(`Deleted “${pendingDelete.name}”.`)
      setSets(await loadSets())
      setPendingDelete(null)
    } catch (cause) {
      setError(apiErrorMessage(cause, 'Could not delete the filter set.'))
    } finally {
      setBusy(false)
    }
  }

  function handleLoad() {
    const current = sets.find((item) => item.id === selectedId)
    if (!current) {
      setError('Choose a saved set to load.')
      return
    }
    onLoad(cloneReportQuery(current.query))
    setNotice(`Loaded “${current.name}” into filters — click Apply to run.`)
    setError(null)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Saved report filters"
        title="Saved report filters"
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`flex size-9 items-center justify-center rounded-full shadow-soft transition-colors ${
          open
            ? 'bg-navy text-cream'
            : 'bg-white text-navy/55 hover:text-navy'
        }`}
      >
        <Icon name="star" className="size-icon-md" />
      </button>

      {open ? (
        <section
          className="absolute top-[calc(100%+6px)] left-0 z-40 w-[min(calc(100vw-3rem),28rem)] rounded-2xl bg-white/95 px-5 py-4 shadow-dropdown backdrop-blur-xl motion-safe:animate-rise"
          role="dialog"
          aria-label="Saved report filters"
        >
        <div className="mb-3 flex items-center gap-2">
          <Icon name="star" className="h-4 w-4 text-navy/45" />
          <h2 className="font-mono text-eyebrow font-medium tracking-[0.12em] text-navy/60 uppercase">
            Saved sets
          </h2>
        </div>

        <div className="space-y-3">
          <div className="flex min-w-0 flex-wrap items-end gap-2">
            <label className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-xs font-medium text-navy/45">Saved set</span>
              <select
                value={selectedId}
                disabled={!hasLoaded || busy}
                onChange={(event) => setSelectedId(event.target.value)}
                className="h-10 min-w-0 rounded-md border-control border-navy/[0.08] bg-white px-3 text-body text-navy outline-none focus:border-brand disabled:opacity-50"
              >
                <option value="">
                  {!hasLoaded
                    ? 'Loading saved sets…'
                    : sets.length === 0
                      ? 'No saved sets yet'
                      : 'Choose a saved set…'}
                </option>
                {sets.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <IconAction
              icon="folder-open"
              text="Load"
              label="Load selected filter set"
              disabled={busy || !selectedId}
              onClick={handleLoad}
            />
            <IconAction
              icon="refresh"
              text="Update"
              label="Update selected filter set"
              disabled={busy || !selectedId}
              onClick={() => void handleUpdate()}
            />
            <IconAction
              icon="trash"
              text="Delete"
              label="Delete selected filter set"
              disabled={busy || !selectedId}
              onClick={() => {
                const selected = sets.find((item) => item.id === selectedId)
                if (selected) setPendingDelete(selected)
              }}
            />
          </div>

          <div className="flex min-w-0 items-end gap-2">
            <label className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-xs font-medium text-navy/45">Save as</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Filter set name"
                className="h-10 min-w-0 rounded-md border-control border-navy/[0.08] bg-white px-3 text-body text-navy outline-none placeholder:text-navy/40 focus:border-brand"
              />
            </label>
            <IconAction
              icon="save"
              text="Save"
              label="Save new filter set"
              disabled={busy}
              onClick={() => void handleSave()}
              primary
            />
          </div>
        </div>

        {error ? (
          <p className="mt-3 text-caption text-red" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="mt-3 text-caption text-navy/55" aria-live="polite">
            {notice}
          </p>
        ) : null}
        </section>
      ) : null}

      {pendingDelete ? (
        <Modal
          title="Delete saved set?"
          onClose={() => {
            if (!busy) setPendingDelete(null)
          }}
        >
          <p className="text-body leading-normal text-navy/70">
            Delete “{pendingDelete.name}”? This cannot be undone.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setPendingDelete(null)}
              disabled={busy}
              className="flex-1 rounded-full border-control border-navy bg-transparent py-2.5 font-display text-body font-semibold text-navy disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={busy}
              className="flex-1 rounded-full bg-navy py-2.5 font-display text-body font-semibold text-white transition-colors hover:bg-ink disabled:opacity-50"
            >
              {busy ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}

function IconAction({
  icon,
  text,
  label,
  disabled,
  onClick,
  primary = false,
}: {
  icon: 'folder-open' | 'refresh' | 'save' | 'trash'
  text: string
  label: string
  disabled: boolean
  onClick: () => void
  primary?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md px-3 font-display text-caption font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        primary ? 'bg-brand hover:bg-brand-deep' : 'bg-navy hover:bg-ink'
      }`}
    >
      <Icon name={icon} className="size-icon-sm" />
      <span>{text}</span>
    </button>
  )
}
