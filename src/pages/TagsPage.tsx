import { useEffect, useMemo, useState } from 'react'
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal'
import { Modal } from '../components/ui/Modal'
import { ColorSwatchPicker } from '../components/ui/ColorSwatchPicker'
import {
  DirectoryHeader,
  DirectorySearch,
  LoadErrorState,
  NoticeBanner,
} from '../components/directory/DirectoryControls'
import { EmptyDirectory } from '../components/directory/EmptyDirectory'
import {
  HeaderCell,
  RowMenu,
  RowMenuItem,
  SkeletonRow,
} from '../components/directory/DirectoryTable'
import { riseDelay } from '../components/directory/directoryChrome'
import { PAGE_PAD } from '../components/layout/pageChrome'
import { apiErrorMessage } from '../api/client'
import { createTag, deleteTag, listTags, updateTag } from '../api/tags'
import { fetchAllPages } from '../api/pagination'
import { useAuth } from '../hooks/useAuth'
import { Permissions } from '../lib/permissions'
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
  const { hasPermission } = useAuth()
  const canManage = hasPermission(Permissions.ProjectsManage)
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

    fetchAllPages((page, pageSize) => listTags({ page, pageSize }))
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

  const handleDelete = async (tag: Tag) => {
    try {
      await deleteTag(tag.id)
      setPendingDelete(null)
      refresh()
      showNotice(`${tag.name} was deleted.`)
    } catch (error) {
      setPendingDelete(null)
      showNotice(apiErrorMessage(error, `Could not delete ${tag.name}.`))
    }
  }

  return (
    <div className={`min-h-full flex-1 ${PAGE_PAD}`} onClick={closeMenus}>
      <div className="mx-auto flex w-full max-w-page flex-col gap-4">
        <DirectoryHeader
          title="Tags"
          count={!isLoading && !loadError ? filtered.length : null}
          actionLabel={canManage ? 'New tag' : undefined}
          onAction={
            canManage
              ? (event) => {
                  event.stopPropagation()
                  setModal({ mode: 'create' })
                }
              : undefined
          }
        />

        {notice && <NoticeBanner>{notice}</NoticeBanner>}

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full sm:ml-auto sm:w-auto">
            <DirectorySearch placeholder="Search tags..." value={search} onChange={setSearch} />
          </div>
        </div>

        {!isLoading && !loadError && filtered.length === 0 && tags.length === 0 ? (
          canManage ? (
            <EmptyDirectory
              title="No tags yet"
              description="Create your first tag to label time entries."
              actionLabel="New tag"
              onAction={(event) => {
                event.stopPropagation()
                setModal({ mode: 'create' })
              }}
            />
          ) : (
            <EmptyDirectory title="No tags yet" />
          )
        ) : !isLoading && !loadError && filtered.length === 0 ? (
          <EmptyDirectory title="No tags match your search." />
        ) : (
          <div className="rounded-2xl bg-white shadow-card">
            <div className={`hidden md:grid ${GRID} border-b border-navy/[0.08]`}>
              <HeaderCell icon="tags" label="Name" />
              <HeaderCell icon="reports" label="Usage" />
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
                filtered.map((tag, index) => (
                  <TagRow
                    key={tag.id}
                    tag={tag}
                    index={index}
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
                    canManage={canManage}
                  />
                ))}

            </div>
          </div>
        )}
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
          <ConfirmDeleteModal
            title={`Delete \u201c${pendingDelete.name}\u201d?`}
            message={
              pendingDelete.usageCount === 0
                ? 'It is not used on any time entries.'
                : `It is currently on ${pendingDelete.usageCount} time ${pendingDelete.usageCount === 1 ? 'entry' : 'entries'}, and will be removed from ${pendingDelete.usageCount === 1 ? 'it' : 'them'}.`
            }
            confirmLabel="Delete tag"
            onCancel={() => setPendingDelete(null)}
            onConfirm={() => handleDelete(pendingDelete)}
          />
        )}
      </div>
    </div>
  )
}

/** Ghost rows while tags load, matching the real grid's geometry. */
function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }, (_, index) => (
        <SkeletonRow key={index} gridClassName={GRID} index={index}>
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 flex-shrink-0 rotate-45 rounded-[2px] bg-surface-muted" />
            <span className="h-3 w-28 rounded-full bg-navy/10" />
          </div>
          <span className="h-3 w-8 rounded-full bg-navy/[0.07]" />
          <span />
        </SkeletonRow>
      ))}
    </>
  )
}

function TagRow({
  tag,
  index,
  menuOpen,
  onToggleMenu,
  onEdit,
  onDelete,
  canManage,
}: {
  tag: Tag
  index: number
  menuOpen: boolean
  onToggleMenu: (event: React.MouseEvent) => void
  onEdit: () => void
  onDelete: () => void
  canManage: boolean
}) {
  return (
    <>
      <div className="flex items-start gap-3 px-3.5 py-3 md:hidden motion-safe:animate-rise" style={riseDelay(index)}>
        <span
          aria-hidden="true"
          className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rotate-45 rounded-[2px] ring-1 ring-navy/10"
          style={{ backgroundColor: tag.color ?? '#E4E7EF' }}
        />
        <div className="min-w-0 flex-1">
          <span className="block truncate font-display text-md font-semibold text-navy">{tag.name}</span>
          <span className="mt-1 block text-caption text-navy/60">
            <span className="text-navy/40">Usage </span>
            <span className="font-mono tabular-nums">{tag.usageCount}</span>
          </span>
        </div>
        <RowMenu open={menuOpen} onToggle={onToggleMenu}>
          <RowMenuItem icon="settings" label="Edit" onClick={onEdit} />
          <RowMenuItem icon="ban" label="Delete" danger onClick={onDelete} />
        </RowMenu>
      </div>

      <div
        className={`hidden md:grid ${GRID} transition-colors hover:bg-surface-muted/60 motion-safe:animate-rise`}
        style={riseDelay(index)}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 flex-shrink-0 rotate-45 rounded-[2px] ring-1 ring-navy/10"
            style={{ backgroundColor: tag.color ?? '#E4E7EF' }}
          />
          <span className="truncate font-display text-md font-semibold text-navy">{tag.name}</span>
        </div>
        <span
          className={`font-mono text-caption tabular-nums ${
            tag.usageCount > 0 ? 'font-medium' : 'font-normal opacity-40'
          }`}
        >
          {tag.usageCount}
        </span>
        <RowMenu open={menuOpen} onToggle={onToggleMenu}>
        {canManage && <RowMenuItem icon="settings" label="Edit" onClick={onEdit} />}
        {canManage && <RowMenuItem icon="ban" label="Delete" danger onClick={onDelete} />}
        </RowMenu>
      </div>
    </>
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
      widthClassName="w-[420px]"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
      >
        <div className="mb-3">
          <label className="mb-1.5 block font-display text-label font-semibold text-navy/70">
            Tag name
          </label>
          <input
            autoFocus
            className="w-full rounded-md border-control border-navy/[0.08] px-3 py-field text-body text-navy outline-none focus:border-brand"
            placeholder="Design"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="mb-3">
          <label className="mb-1.5 block font-display text-label font-semibold text-navy/70">
            Colour
          </label>
          <ColorSwatchPicker value={color} onChange={setColor} />
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
            {isSaving ? 'Saving…' : tag ? 'Save changes' : 'Add tag'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

