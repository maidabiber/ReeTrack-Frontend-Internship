import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { Modal } from '../components/ui/Modal'
import { ColorSwatchPicker } from '../components/ui/ColorSwatchPicker'
import { apiErrorMessage } from '../api/client'
import { createTag, deleteTag, listTags, updateTag } from '../api/tags'
import type { Tag } from '../types/tag'

type ModalState = { mode: 'create' } | { mode: 'edit'; tag: Tag } | null

const GRID = 'grid grid-cols-[2.6fr_0.9fr_32px] items-center gap-2.5 px-3.5 py-2'

/**
 * RT-44 — the tag directory. A flat, workspace-wide label list applied to time
 * entries. Lists tags with their usage counts (GET /api/tags), with
 * create/edit (name + colour) and delete. Deleting is allowed even while a tag
 * is in use — the confirm dialog surfaces the usage count first.
 */
export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>(null)
  const [pendingDelete, setPendingDelete] = useState<Tag | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const closeMenus = () => setOpenRowMenuId(null)

  useEffect(() => {
    let cancelled = false

    listTags()
      .then((loaded) => {
        if (cancelled) return
        setTags(loaded)
        setLoadError(null)
      })
      .catch((error) => {
        if (cancelled) return
        setLoadError(apiErrorMessage(error, 'Could not load tags. Is the backend running?'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return tags
    return tags.filter((tag) => tag.name.toLowerCase().includes(query))
  }, [tags, search])

  const showNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice((current) => (current === message ? null : current)), 4000)
  }

  const refresh = () => setReloadKey((key) => key + 1)

  const handleDelete = (tag: Tag) => {
    setPendingDelete(null)

    deleteTag(tag.id)
      .then(() => {
        refresh()
        showNotice(`${tag.name} was deleted.`)
      })
      .catch((error) => showNotice(apiErrorMessage(error, `Could not delete ${tag.name}.`)))
  }

  return (
    <div className="min-h-full flex-1 px-10 py-8" onClick={closeMenus}>
      <div className="mx-auto flex w-full max-w-[1340px] flex-col gap-4">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-[19px] font-bold text-navy">Tags</h1>
            <p className="mt-[3px] max-w-[560px] text-[13px] leading-[1.5] text-navy/60">
              Reusable labels you can attach to time entries to slice reports any way you like —
              independent of client and project.
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
            New tag
          </button>
        </header>

        {notice && (
          <div className="flex items-center gap-2 rounded-[14px] bg-brand-tint px-4 py-3 text-[13px] font-medium text-navy">
            <span aria-hidden="true" className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand" />
            {notice}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <span className="flex-1" />
          <label className="flex min-w-[180px] max-w-[280px] flex-1 items-center gap-1.5 rounded-full border-[1.5px] border-navy/[0.08] bg-white px-3.5 py-[7px] focus-within:border-brand">
            <Icon name="search" className="h-3.5 w-3.5 flex-shrink-0 text-navy/50" />
            <input
              className="w-full border-none bg-transparent text-[13px] text-navy outline-none placeholder:text-navy/45"
              placeholder="Search tags..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onClick={(event) => event.stopPropagation()}
            />
          </label>
        </div>

        <div className="rounded-[18px] bg-white shadow-card">
          <div className={`${GRID} border-b border-navy/[0.08]`}>
            <HeaderCell icon="tags" label="Name" />
            <HeaderCell icon="reports" label="Usage" />
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
              filtered.map((tag) => (
                <TagRow
                  key={tag.id}
                  tag={tag}
                  menuOpen={openRowMenuId === tag.id}
                  onToggleMenu={(event) => {
                    event.stopPropagation()
                    setOpenRowMenuId(openRowMenuId === tag.id ? null : tag.id)
                  }}
                  onEdit={() => {
                    setOpenRowMenuId(null)
                    setModal({ mode: 'edit', tag })
                  }}
                  onDelete={() => {
                    setOpenRowMenuId(null)
                    setPendingDelete(tag)
                  }}
                />
              ))}

            {!isLoading && !loadError && filtered.length === 0 && (
              <div className="px-5 py-10 text-center text-[13px] text-navy/50">
                {tags.length === 0
                  ? 'No tags yet. Create your first tag to label time entries.'
                  : 'No tags match your search.'}
              </div>
            )}
          </div>
        </div>

        {modal && (
          <TagModal
            tag={modal.mode === 'edit' ? modal.tag : null}
            onClose={() => setModal(null)}
            onSaved={(saved, created) => {
              setModal(null)
              refresh()
              showNotice(created ? `${saved.name} was added.` : `${saved.name} was updated.`)
            }}
          />
        )}

        {pendingDelete && (
          <DeleteTagDialog
            tag={pendingDelete}
            onCancel={() => setPendingDelete(null)}
            onConfirm={() => handleDelete(pendingDelete)}
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

function TagRow({
  tag,
  menuOpen,
  onToggleMenu,
  onEdit,
  onDelete,
}: {
  tag: Tag
  menuOpen: boolean
  onToggleMenu: (event: React.MouseEvent) => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className={`${GRID} hover:bg-surface-muted`}>
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden="true"
          className="h-3 w-3 flex-shrink-0 rounded-full ring-1 ring-navy/10"
          style={{ backgroundColor: tag.color ?? '#E4E7EF' }}
        />
        <span className="truncate text-[13px] font-semibold">{tag.name}</span>
      </div>

      <span
        className={`font-mono text-[12.5px] tabular-nums ${
          tag.usageCount > 0 ? 'font-medium' : 'font-normal opacity-40'
        }`}
      >
        {tag.usageCount}
      </span>

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

/** Create/edit form: a name field plus the shared colour swatch picker. */
function TagModal({
  tag,
  onClose,
  onSaved,
}: {
  tag: Tag | null
  onClose: () => void
  onSaved: (saved: Tag, created: boolean) => void
}) {
  const [name, setName] = useState(tag?.name ?? '')
  const [color, setColor] = useState<string | null>(tag?.color ?? null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmed = name.trim()
  const canSave = trimmed.length > 0 && trimmed.length <= 100 && !isSaving

  const save = () => {
    if (!canSave) return
    setIsSaving(true)
    setError(null)

    // On edit send "" to clear the colour (the backend's clear sentinel).
    const request = tag
      ? updateTag(tag.id, { name: trimmed, color: color ?? '' })
      : createTag(trimmed, color)

    request
      .then((saved) => onSaved(saved, tag === null))
      .catch((saveError) => {
        setError(apiErrorMessage(saveError, 'Could not save the tag. Please try again.'))
        setIsSaving(false)
      })
  }

  return (
    <Modal
      title={tag ? 'Edit tag' : 'New tag'}
      subtitle={tag ? undefined : 'Tags label time entries across clients and projects.'}
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
            Tag name
          </label>
          <input
            autoFocus
            className="w-full rounded-[10px] border-[1.5px] border-navy/[0.08] px-3 py-[9px] text-[13px] text-navy outline-none focus:border-brand"
            placeholder="Design"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="mb-3">
          <label className="mb-1.5 block font-display text-[11.5px] font-semibold text-navy/70">
            Colour
          </label>
          <ColorSwatchPicker value={color} onChange={setColor} />
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
            {isSaving ? 'Saving…' : tag ? 'Save changes' : 'Add tag'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/** Delete confirmation. Surfaces the usage count because deleting an in-use tag
 *  removes it from that many time entries. */
function DeleteTagDialog({
  tag,
  onCancel,
  onConfirm,
}: {
  tag: Tag
  onCancel: () => void
  onConfirm: () => void
}) {
  const usage =
    tag.usageCount === 0
      ? 'It is not used on any time entries.'
      : `It is currently on ${tag.usageCount} time ${tag.usageCount === 1 ? 'entry' : 'entries'}, and will be removed from ${tag.usageCount === 1 ? 'it' : 'them'}.`

  return (
    <Modal title={`Delete “${tag.name}”?`} onClose={onCancel}>
      <p className="text-[13px] leading-[1.55] text-navy/70">{usage}</p>

      <div className="mt-[18px] flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-full border-[1.5px] border-navy bg-transparent py-2.5 font-display text-[13px] font-semibold text-navy"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 rounded-full bg-red py-2.5 font-display text-[13px] font-semibold text-white transition-colors hover:bg-red/90"
        >
          Delete tag
        </button>
      </div>
    </Modal>
  )
}
