import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { apiErrorMessage } from '../api/client'
import {
  createCustomReportDefinition,
  downloadCustomReport,
  getCustomReportDefinition,
  updateCustomReportDefinition,
} from '../api/customReports'
import type { ReportExportFormat } from '../api/reports'
import { LoadErrorState, NoticeBanner } from '../components/directory/DirectoryControls'
import { PAGE_PAD } from '../components/layout/pageChrome'
import {
  BlockCanvasList,
  BlockPalettePane,
  BuilderDndShell,
} from '../components/reports/builder/BlockCanvas'
import { BlockPalette } from '../components/reports/builder/BlockPalette'
import { ExportMenu } from '../components/reports/ExportMenu'
import { ReportFilterBar } from '../components/reports/ReportFilterBar'
import { BlockRenderer } from '../components/reports/render/BlockRenderer'
import { Icon } from '../components/ui/Icon'
import { Modal } from '../components/ui/Modal'
import { useTransientNotice } from '../hooks/useTransientNotice'
import { useCustomReportBuilder } from '../hooks/useCustomReportBuilder'
import { BREAKPOINT, useMediaQuery } from '../hooks/useMediaQuery'
import { useReportCatalogue } from '../hooks/useReportCatalogue'
import { COMPARISON_OPTIONS, cloneSpec, specsEqual } from '../lib/customReportSpec'
import { formatPeriodLabel } from '../lib/reportView'
import type {
  ComparisonMode,
  CustomReportDefinition,
  CustomReportSpec,
  CustomReportVisibility,
  ReportBlockResult,
} from '../types/customReport'

/**
 * Builder + viewer for custom reports.
 * `/reports/custom/new` is always edit mode; `/reports/custom/:id` opens as viewer
 * until Edit is pressed (`?edit=1` also forces builder mode).
 */
export default function CustomReportBuilderPage() {
  return <BuilderWorkspace />
}

function BuilderWorkspace() {
  const { id } = useParams()
  if (!id) return <ReportBuilder key="new" isNew />
  return <ReportBuilder key={id} isNew={false} definitionId={id} />
}

function ReportBuilder({
  isNew,
  definitionId,
}: {
  isNew: boolean
  definitionId?: string
}) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const isLg = useMediaQuery(BREAKPOINT.lg)
  const { catalogue, error: catalogueError, isLoading: catalogueLoading } = useReportCatalogue()

  const [definition, setDefinition] = useState<CustomReportDefinition | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingDefinition, setLoadingDefinition] = useState(!isNew)
  const [name, setName] = useState('Untitled report')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<CustomReportVisibility>('Shared')
  const [savedSnapshot, setSavedSnapshot] = useState<{
    name: string
    description: string
    spec: CustomReportSpec
  } | null>(null)

  const editing =
    isNew || searchParams.get('edit') === '1' || searchParams.get('edit') === 'true'

  const {
    draftSpec,
    appliedSpec,
    report,
    isLoading,
    error,
    isDirty,
    hasApplied,
    patchQuery,
    setComparison,
    setBlocks,
    addBlockType,
    removeBlockById,
    duplicateBlockById,
    moveBlockByIndex,
    updateBlockById,
    applySpec,
    refresh,
    runSaved,
    resetQuery,
  } = useCustomReportBuilder(isNew ? 'new' : definitionId)

  const [paletteOpen, setPaletteOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveDescription, setSaveDescription] = useState('')
  const [saveVisibility, setSaveVisibility] = useState<CustomReportVisibility>('Shared')
  const [saving, setSaving] = useState(false)
  const [notice, showNotice] = useTransientNotice()
  const [exporting, setExporting] = useState<ReportExportFormat | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  useEffect(() => {
    if (!definitionId) return

    let cancelled = false

    getCustomReportDefinition(definitionId)
      .then((loaded) => {
        if (cancelled) return
        setDefinition(loaded)
        setName(loaded.name)
        setDescription(loaded.description ?? '')
        setVisibility(loaded.visibility)
        setSavedSnapshot({
          name: loaded.name,
          description: loaded.description ?? '',
          spec: cloneSpec(loaded.spec),
        })
        runSaved(loaded.spec)
        setLoadError(null)
      })
      .catch((cause) => {
        if (!cancelled) {
          setLoadError(apiErrorMessage(cause, 'Could not load this report.'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDefinition(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when route id changes
  }, [definitionId])

  const previews = useMemo(() => {
    const map = new Map<string, ReportBlockResult>()
    for (const block of report?.blocks ?? []) map.set(block.id, block)
    return map
  }, [report])

  // ⌘/Ctrl+Enter mirrors the Run button exactly (same disabled condition, same
  // Run-vs-Refresh branch) so the shortcut can never trigger a run the button would refuse.
  useEffect(() => {
    if (!editing) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key !== 'Enter') return
      if (draftSpec.blocks.length === 0 || isLoading) return
      event.preventDefault()
      if (isDirty || !hasApplied) applySpec()
      else refresh()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [editing, draftSpec.blocks.length, isLoading, isDirty, hasApplied, applySpec, refresh])

  const isSaveDirty =
    !savedSnapshot ||
    name !== savedSnapshot.name ||
    description !== savedSnapshot.description ||
    !specsEqual(draftSpec, savedSnapshot.spec)

  function enterEdit() {
    setSearchParams({ edit: '1' }, { replace: true })
  }

  function exitEdit() {
    if (isSaveDirty && !window.confirm('Discard unsaved changes?')) return
    if (savedSnapshot) {
      setName(savedSnapshot.name)
      setDescription(savedSnapshot.description)
      runSaved(savedSnapshot.spec)
    }
    setSearchParams({}, { replace: true })
  }

  async function persist(nextName: string, nextDescription: string, nextVisibility: CustomReportVisibility) {
    setSaving(true)
    try {
      if (isNew || !definition) {
        const created = await createCustomReportDefinition({
          name: nextName,
          description: nextDescription || null,
          spec: draftSpec,
          visibility: nextVisibility,
        })
        setSavedSnapshot({
          name: created.name,
          description: created.description ?? '',
          spec: cloneSpec(created.spec),
        })
        setVisibility(created.visibility)
        showNotice('Report saved.')
        navigate(`/reports/custom/${created.id}?edit=1`, { replace: true })
      } else {
        // Visibility isn't editable here — the builder's Save button only re-persists the
        // spec/name/description; changing who can see a report lives in the library's Edit
        // details action so it isn't buried inside every routine re-save.
        const updated = await updateCustomReportDefinition(definition.id, {
          name: nextName,
          description: nextDescription || null,
          spec: draftSpec,
          visibility,
        })
        setDefinition(updated)
        setName(updated.name)
        setDescription(updated.description ?? '')
        setSavedSnapshot({
          name: updated.name,
          description: updated.description ?? '',
          spec: cloneSpec(updated.spec),
        })
        showNotice('Report saved.')
      }
      setSaveOpen(false)
    } catch (cause) {
      showNotice(apiErrorMessage(cause, 'Could not save the report.'))
    } finally {
      setSaving(false)
    }
  }

  function handleSaveClick() {
    if (isNew || !definition) {
      setSaveName(name)
      setSaveDescription(description)
      setSaveVisibility('Shared')
      setSaveOpen(true)
      return
    }
    void persist(name, description, visibility)
  }

  async function handleExport(format: ReportExportFormat) {
    setExporting(format)
    setExportError(null)
    try {
      // The applied spec is what produced the report on screen; exporting the draft would
      // hand the user a file that does not match what they are looking at.
      await downloadCustomReport(format, appliedSpec)
    } catch (cause) {
      setExportError(apiErrorMessage(cause, 'Could not download the export.'))
    } finally {
      setExporting(null)
    }
  }

  if (loadingDefinition || catalogueLoading) {
    return (
      <div className={`mx-auto w-full max-w-page ${PAGE_PAD}`}>
        <div className="motion-safe:animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-surface-muted" />
          <div className="h-40 rounded-2xl bg-surface-muted/70" />
        </div>
      </div>
    )
  }

  if (loadError || catalogueError || !catalogue) {
    return (
      <div className={`mx-auto w-full max-w-page ${PAGE_PAD}`}>
        <div className="rounded-2xl bg-white shadow-card">
          <LoadErrorState
            message={loadError ?? catalogueError ?? 'Could not load the builder.'}
            onRetry={() => window.location.reload()}
          />
        </div>
      </div>
    )
  }

  if (!editing) {
    return (
      <div className={`mx-auto w-full max-w-page ${PAGE_PAD}`}>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              to="/reports/custom"
              className="font-mono text-[10px] uppercase tracking-[0.12em] text-navy/45 hover:text-brand"
            >
              ← Custom reports
            </Link>
            <h1 className="mt-1 font-display text-xl font-bold text-navy">{name}</h1>
            {report ? (
              <p className="mt-1 font-mono text-xs uppercase tracking-[0.12em] text-navy/45">
                {formatPeriodLabel(report)}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {report ? (
              <ExportMenu exporting={exporting} onExport={handleExport} disabled={isLoading} />
            ) : null}
            {definition?.canEdit !== false ? (
              <button
                type="button"
                onClick={enterEdit}
                className="rounded-full bg-brand px-4 py-2.5 text-body font-medium text-white hover:bg-brand-deep"
              >
                Edit
              </button>
            ) : null}
          </div>
        </div>

        {notice ? (
          <div className="mb-4">
            <NoticeBanner>{notice}</NoticeBanner>
          </div>
        ) : null}
        {exportError ? (
          <div className="mb-4 rounded-lg bg-red/10 px-4 py-3 text-body text-red">{exportError}</div>
        ) : null}
        {error ? (
          <div className="mb-4 rounded-2xl bg-white shadow-card">
            <LoadErrorState message={error} onRetry={applySpec} />
          </div>
        ) : null}

        {isLoading ? (
          <ReportSkeleton />
        ) : report ? (
          <div className="space-y-4">
            {report.warnings.length > 0 ? (
              <div className="rounded-lg bg-brand-tint px-4 py-3 text-body text-navy">
                {report.warnings.join(' ')}
              </div>
            ) : null}
            {report.blocks.map((block) => (
              <BlockRenderer key={block.id} block={block} comparisonMode={report.comparison?.mode} />
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className={`mx-auto w-full max-w-page ${PAGE_PAD} ${isLg ? '' : 'pb-24'}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to="/reports/custom"
            className="font-mono text-[10px] uppercase tracking-[0.12em] text-navy/45 hover:text-brand"
          >
            ← Custom reports
          </Link>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 block w-full max-w-xl bg-transparent font-display text-xl font-bold text-navy outline-none"
            aria-label="Report name"
          />
          {isSaveDirty ? (
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-brand">
              Unsaved changes
            </p>
          ) : (
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-navy/40">
              {isNew ? 'New report' : 'Saved'}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {report ? (
            <ExportMenu
              exporting={exporting}
              onExport={handleExport}
              disabled={isLoading || isDirty}
            />
          ) : null}
          {!isNew ? (
            <button
              type="button"
              onClick={exitEdit}
              className="rounded-full border-control border-navy px-4 py-2.5 text-body font-medium text-navy hover:bg-navy/[0.06]"
            >
              Done
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={saving || (!isNew && !isSaveDirty)}
            className="rounded-full bg-brand px-4 py-2.5 text-body font-medium text-white hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {notice ? (
        <div className="mb-4">
          <NoticeBanner>{notice}</NoticeBanner>
        </div>
      ) : null}
      {exportError ? (
        <div className="mb-4 rounded-lg bg-red/10 px-4 py-3 text-body text-red">{exportError}</div>
      ) : null}

      <div className="sticky top-14 lg:top-0 z-20 -mx-4 mb-4 flex flex-wrap items-center gap-2 bg-canvas/95 px-4 py-2 backdrop-blur-md">
        <ReportFilterBar
          draft={draftSpec.query}
          isDirty={isDirty}
          onPatch={patchQuery}
          onReset={resetQuery}
        />
        <label className="flex items-center gap-1.5">
          <span className="sr-only">Comparison period</span>
          <select
            value={draftSpec.comparison ?? 'None'}
            onChange={(event) => setComparison(event.target.value as ComparisonMode)}
            className="rounded-full border border-navy/10 bg-white px-3 py-2 text-body text-navy outline-none focus:border-brand"
          >
            {COMPARISON_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={isDirty || !hasApplied ? applySpec : refresh}
          disabled={draftSpec.blocks.length === 0 || isLoading}
          title="⌘/Ctrl + Enter"
          className="rounded-full bg-brand px-4 py-2 text-body font-medium text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          {!hasApplied ? 'Run report' : isDirty ? 'Run' : 'Refresh'}
        </button>
      </div>

      {isDirty ? (
        <div className="mb-4 rounded-lg bg-brand-tint px-4 py-3 text-body text-navy">
          Spec changed — click Run to refresh the preview. Exports use the last run.
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-2xl bg-white shadow-card">
          <LoadErrorState message={error} onRetry={applySpec} />
        </div>
      ) : null}

      <BuilderDndShell
        blocks={draftSpec.blocks}
        catalogue={catalogue}
        onBlocksChange={setBlocks}
        onAdd={(type, atIndex) => {
          addBlockType(type, atIndex)
          setPaletteOpen(false)
        }}
      >
        {({ dropIndex, openMenuId, setOpenMenuId }) => (
          <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
            {isLg ? (
              <BlockPalettePane
                blockTypes={catalogue.blockTypes}
                blockCount={draftSpec.blocks.length}
                onAdd={(type) => addBlockType(type)}
              />
            ) : null}

            <div>
              <BlockCanvasList
                blocks={draftSpec.blocks}
                spec={draftSpec}
                catalogue={catalogue}
                previews={previews}
                compactEditors={!isLg}
                dropIndex={dropIndex}
                openMenuId={openMenuId}
                setOpenMenuId={setOpenMenuId}
                onUpdate={updateBlockById}
                onDuplicate={duplicateBlockById}
                onRemove={removeBlockById}
                onMove={moveBlockByIndex}
              />

              {isLoading ? (
                <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-navy/40">
                  Running…
                </p>
              ) : null}
            </div>
          </div>
        )}
      </BuilderDndShell>

      {!isLg ? (
        <>
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-navy/10 bg-canvas/95 px-4 py-3 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3 text-body font-medium text-white"
            >
              <Icon name="plus" className="h-4 w-4" />
              Add block
            </button>
          </div>
          {paletteOpen ? (
            <Modal title="Add block" onClose={() => setPaletteOpen(false)} widthClassName="w-[400px]">
              <BlockPalette
                blockTypes={catalogue.blockTypes}
                blockCount={draftSpec.blocks.length}
                onAdd={(type) => {
                  addBlockType(type)
                  setPaletteOpen(false)
                }}
              />
            </Modal>
          ) : null}
        </>
      ) : null}

      {saveOpen ? (
        <Modal title="Save report" onClose={() => setSaveOpen(false)}>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-navy/45">Name</span>
            <input
              value={saveName}
              onChange={(event) => setSaveName(event.target.value)}
              className="mt-1 w-full rounded-lg border border-navy/10 bg-white px-3 py-2 text-body text-navy outline-none focus:border-brand"
              autoFocus
            />
          </label>
          <label className="mt-3 block">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-navy/45">
              Description
            </span>
            <textarea
              value={saveDescription}
              onChange={(event) => setSaveDescription(event.target.value)}
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
                  onClick={() => setSaveVisibility(option)}
                  className={`rounded-full px-3 py-1.5 text-body font-medium transition-colors ${
                    saveVisibility === option
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
              onClick={() => setSaveOpen(false)}
              className="rounded-full px-4 py-2 text-body font-medium text-navy/70 hover:bg-surface-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving || !saveName.trim()}
              onClick={() => void persist(saveName.trim(), saveDescription.trim(), saveVisibility)}
              className="rounded-full bg-brand px-4 py-2 text-body font-medium text-white hover:bg-brand-deep disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}

function ReportSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {[0, 1].map((index) => (
          <div
            key={index}
            className="motion-safe:animate-pulse rounded-2xl bg-white px-5 py-4 shadow-card"
          >
            <div className="h-3 w-20 rounded bg-surface-muted" />
            <div className="mt-3 h-7 w-28 rounded bg-surface-muted" />
          </div>
        ))}
      </div>
      <div className="motion-safe:animate-pulse rounded-2xl bg-white px-5 py-8 shadow-card">
        <div className="h-4 w-32 rounded bg-surface-muted" />
        <div className="mt-4 h-40 rounded bg-surface-muted/70" />
      </div>
    </div>
  )
}
