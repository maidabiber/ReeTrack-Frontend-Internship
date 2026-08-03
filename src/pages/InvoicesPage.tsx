import { useEffect, useState } from 'react'
import { apiErrorMessage } from '../api/client'
import {
  deleteInvoice,
  downloadInvoicePdf,
  generateInvoice,
  getInvoice,
  listInvoices,
  markInvoicePaid,
} from '../api/invoices'
import { fetchAllPages } from '../api/pagination'
import { AccessDenied } from '../components/auth/AccessDenied'
import { ReportFilterBar } from '../components/reports/ReportFilterBar'
import { SavedFilterSets } from '../components/reports/SavedFilterSets'
import { Icon } from '../components/ui/Icon'
import { Modal } from '../components/ui/Modal'
import { Pill } from '../components/ui/Pill'

import { useAuth } from '../hooks/useAuth'
import { useReportFilterDraft } from '../hooks/useReportFilterDraft'

import { cloneReportQuery } from '../lib/reportQuery'
import { formatFullDate, formatReportMoney } from '../lib/reportView'
import type { Invoice } from '../types/invoice'
import type { ReportQuery } from '../types/reportQuery'

function formatShortDateTime(isoDate: string): string {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return isoDate
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

/**
 * RT-66 / RT-209 — admin client invoices generated from report filters.
 * Client is chosen up front; other filters reuse ReportFilterBar + ReportQuery.
 */
export default function InvoicesPage() {
  const { role } = useAuth()
  if (role !== 'Admin') {
    return (
      <AccessDenied
        title="Admins only"
        description="Invoices are available to workspace admins."
      />
    )
  }
  return <InvoicesWorkspace />
}

/** Invoices only need client + projects + dates; always billable time. */
function coerceInvoiceQuery(query: ReportQuery): ReportQuery {
  const next = cloneReportQuery(query)
  next.billable = true
  next.taskIds = []
  next.userIds = []
  next.tagIds = []
  return next
}

function InvoicesWorkspace() {
  const {
    draftQuery,
    appliedQuery,
    isDirty,
    patchDraft,
    replaceDraft,
    applyFilters,
    resetFilters,
  } = useReportFilterDraft({ billable: true })

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [selected, setSelected] = useState<Invoice | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Invoice | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [markingPaid, setMarkingPaid] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [listSearch, setListSearch] = useState('')

  const listClientId = draftQuery.clientIds[0]
  const hasClient = appliedQuery.clientIds.length === 1

  useEffect(() => {
    let cancelled = false

    fetchAllPages((page, pageSize) =>
      listInvoices({
        page,
        pageSize,
        q: listSearch.trim() || undefined,
        clientId: listClientId,
      }),
    )
      .then((loadedInvoices) => {
        if (cancelled) return
        setInvoices(loadedInvoices)
        setSelected((current) => {
          if (current && loadedInvoices.some((invoice) => invoice.id === current.id)) {
            return loadedInvoices.find((invoice) => invoice.id === current.id) ?? current
          }
          return loadedInvoices[0] ?? null
        })
        setError(null)
      })
      .catch((cause) => {
        if (cancelled) return
        setError(apiErrorMessage(cause, 'Could not load invoices. Is the backend running?'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey, listSearch, listClientId])

  async function handleGenerate() {
    if (!hasClient) {
      setError('Select a client, then Apply.')
      return
    }
    if (isDirty) {
      setError('Filters changed — click Apply before generating.')
      return
    }

    setGenerating(true)
    setError(null)
    try {
      const invoice = await generateInvoice({
        query: coerceInvoiceQuery(appliedQuery),
      })
      setSelected(invoice)
      setIsLoading(true)
      setReloadKey((key) => key + 1)
    } catch (cause) {
      setError(apiErrorMessage(cause, 'Could not generate the invoice.'))
    } finally {
      setGenerating(false)
    }
  }

  function handleSelectInvoice(id: string) {
    const existing = invoices.find((inv) => inv.id === id)
    if (existing) {
      setSelected(existing)
      return
    }
    setIsLoading(true)
    getInvoice(id)
      .then((inv) => {
        setSelected(inv)
      })
      .catch((cause) => {
        setError(apiErrorMessage(cause, 'Could not load the invoice.'))
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  const showNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice((current) => (current === message ? null : current)), 4000)
  }

  function handleDeleteRequest(invoice: Invoice) {
    setPendingDelete(invoice)
  }

  function handleMarkPaid(invoice: Invoice) {
    setMarkingPaid(true)
    markInvoicePaid(invoice.id)
      .then((updated) => {
        setSelected(updated)
        setIsLoading(true)
        setReloadKey((key) => key + 1)
        showNotice(`${updated.number} was marked as paid.`)
      })
      .catch((cause) => {
        setError(apiErrorMessage(cause, `Could not mark ${invoice.number} as paid.`))
      })
      .finally(() => {
        setMarkingPaid(false)
      })
  }

  function handleDeleteConfirmed() {
    const invoice = pendingDelete
    if (!invoice) return

    setDeleting(true)
    deleteInvoice(invoice.id)
      .then(() => {
        setPendingDelete(null)
        setSelected(null)
        setIsLoading(true)
        setReloadKey((key) => key + 1)
        showNotice(`${invoice.number} was deleted.`)
      })
      .catch((cause) => {
        setPendingDelete(null)
        setError(apiErrorMessage(cause, `Could not delete ${invoice.number}.`))
      })
      .finally(() => {
        setDeleting(false)
      })
  }

  return (
    <div className="mx-auto w-full max-w-page px-10 py-8">
      <div className="mb-6">
        <h1 className="font-display text-xl font-bold text-navy">Invoices</h1>
        <p className="mt-1 text-body text-navy/55">
          Pick a client, optionally narrow by project and date, then generate a draft from billable time.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap items-center gap-2 pb-0.5">
          <ReportFilterBar
            draft={draftQuery}
            isDirty={isDirty}
            onPatch={patchDraft}
            onReset={resetFilters}
            onApply={applyFilters}
            hideTasks
            hideMembers
            hideTags
            hideBillable
            singleClient
          />

          <SavedFilterSets
            draft={draftQuery}
            onLoad={replaceDraft}
          />
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating || !hasClient}
          className="ml-auto rounded-full bg-brand px-5 py-2 font-display text-md font-semibold text-white shadow-soft transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generating ? 'Generating…' : 'Generate invoice'}
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl bg-red-tint px-4 py-3 text-body font-medium text-red">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-brand-tint px-4 py-3 text-body font-medium text-navy">
          <span aria-hidden="true" className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand" />
          {notice}
        </div>
      ) : null}

      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[340px_1fr]">
        <aside className="flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-card">
          <header className="border-b border-navy/[0.06] bg-[linear-gradient(180deg,#f2f4f9_0%,#ffffff_72%)] px-5 py-4">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-eyebrow font-medium tracking-[0.14em] text-navy/45 uppercase">
                Drafts
              </h2>
              <span className="rounded-full bg-navy/5 px-2 py-0.5 font-mono text-caption font-medium text-navy/60">
                {invoices.length}
              </span>
            </div>

            <label className="mt-3 flex items-center gap-2 rounded-xl border-control border-navy/[0.08] bg-white px-3 py-2 focus-within:border-brand">
              <Icon name="search" className="h-4 w-4 shrink-0 text-navy/40" />
              <input
                type="search"
                placeholder="Filter by client or number…"
                value={listSearch}
                onChange={(event) => setListSearch(event.target.value)}
                className="w-full border-none bg-transparent text-sm text-navy outline-none placeholder:text-navy/40"
              />
            </label>
          </header>

          <div className="flex-1 overflow-y-auto p-3">
            {isLoading && invoices.length === 0 ? (
              <p className="px-1 py-8 text-center text-body text-navy/45">Loading drafts…</p>
            ) : invoices.length === 0 ? (
              <p className="px-1 py-8 text-center text-body text-navy/45">
                {listSearch ? 'No matching invoices.' : 'No invoices yet.'}
              </p>
            ) : (
              <ul className="space-y-1">
                {invoices.map((invoice) => {
                  const active = selected?.id === invoice.id
                  return (
                    <li key={invoice.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(invoice)}
                        className={`flex w-full items-start justify-between rounded-xl px-3 py-2.5 text-left transition-colors ${active
                          ? 'bg-navy text-white shadow-soft'
                          : 'hover:bg-surface-muted text-navy'
                          }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p
                            className={`truncate font-mono text-caption font-semibold ${active ? 'text-white' : 'text-navy'
                              }`}
                          >
                            {invoice.number}
                          </p>
                          <p
                            className={`mt-0.5 truncate text-caption ${active ? 'text-cream/80' : 'text-navy/55'
                              }`}
                          >
                            {invoice.clientName} · {formatFullDate(invoice.createdAtUtc)}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 font-mono text-caption font-medium ${active ? 'text-cream' : 'text-navy/70'
                            }`}
                        >
                          {formatReportMoney(invoice.subtotal, invoice.currencyCode)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </aside>

        <InvoiceDetail
          invoice={selected}
          onSelectInvoice={handleSelectInvoice}
          onError={setError}
          onDeleteRequest={handleDeleteRequest}
          onMarkPaid={handleMarkPaid}
          markingPaid={markingPaid}
        />
      </div>

      {pendingDelete ? (
        <DeleteInvoiceDialog
          invoice={pendingDelete}
          deleting={deleting}
          onCancel={() => {
            if (!deleting) setPendingDelete(null)
          }}
          onConfirm={handleDeleteConfirmed}
        />
      ) : null}
    </div>
  )
}

function billingModelLabel(model: Invoice['lineItems'][number]['billingModel']): string {
  return model === 'FixedFee' ? 'Fixed fee' : 'Hourly'
}

function InvoiceDetail({
  invoice,
  onSelectInvoice,
  onError,
  onDeleteRequest,
  onMarkPaid,
  markingPaid,
}: {
  invoice: Invoice | null
  onSelectInvoice?: (id: string) => void
  onError: (message: string | null) => void
  onDeleteRequest: (invoice: Invoice) => void
  onMarkPaid: (invoice: Invoice) => void
  markingPaid: boolean
}) {
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    if (!invoice) return
    setDownloading(true)
    onError(null)
    try {
      await downloadInvoicePdf(invoice.id, `${invoice.number}.pdf`)
    } catch (cause) {
      onError(apiErrorMessage(cause, 'Could not download the invoice PDF.'))
    } finally {
      setDownloading(false)
    }
  }

  if (!invoice) {
    return (
      <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-2xl bg-white px-6 py-16 text-center shadow-card">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-navy/45">
          <Icon name="invoices" className="h-5 w-5" />
        </span>
        <p className="mt-4 font-display text-md font-semibold text-navy">No invoice selected</p>
        <p className="mt-1 max-w-xs text-body text-navy/50">
          Generate a draft or pick one from the list to preview line items.
        </p>
      </div>
    )
  }

  const lines = [...invoice.lineItems].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-card">
      {invoice.newerInvoiceId && invoice.newerInvoiceNumber && (
        <div className="flex items-center gap-2 border-b border-navy-deep bg-navy px-6 py-3 text-body font-medium text-cream sm:px-8">
          <Icon name="alert" className="h-4 w-4 shrink-0 text-amber" />
          <span>
            A newer invoice exists for this client:{' '}
            {onSelectInvoice ? (
              <button
                type="button"
                onClick={() => onSelectInvoice(invoice.newerInvoiceId!)}
                className="font-semibold text-white no-underline transition-colors hover:text-blue-300"
              >
                {invoice.newerInvoiceNumber}
              </button>
            ) : (
              <strong className="font-semibold text-blue-300">{invoice.newerInvoiceNumber}</strong>
            )}
            .
          </span>
        </div>
      )}
      <header className="relative border-b border-navy/[0.06] bg-[linear-gradient(180deg,#f2f4f9_0%,#ffffff_72%)] px-6 py-6 sm:px-8 sm:py-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-eyebrow font-medium tracking-[0.14em] text-navy/45 uppercase">
              Invoice
            </p>
            <h2 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-navy">
              {invoice.number}
            </h2>
            <div className="mt-2">
              <Pill
                label={invoice.status}
                dotClassName={invoice.status === 'Paid' ? 'bg-[#1E8A57]' : 'bg-navy/40'}
              />
            </div>
            <p className="mt-2 text-md text-navy/70">
              Bill to <span className="font-semibold text-navy">{invoice.clientName}</span>
            </p>
            <p className="mt-1.5 text-caption text-navy/55">
              Created: <span className="font-mono">{formatShortDateTime(invoice.createdAtUtc)}</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              {invoice.status === 'Draft' ? (
                <>
                  <button
                    type="button"
                    onClick={() => onDeleteRequest(invoice)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full border-control border-navy/15 px-3.5 text-caption font-medium text-navy/70 transition-colors hover:border-red hover:text-red"
                  >
                    <Icon name="trash" className="h-3.5 w-3.5" />
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => onMarkPaid(invoice)}
                    disabled={markingPaid}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full bg-brand px-3.5 text-caption font-medium text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {markingPaid ? 'Marking…' : 'Mark as paid'}
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => void handleDownload()}
                disabled={downloading}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-navy px-3.5 text-caption font-medium text-cream transition-colors hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon name="download" className="h-3.5 w-3.5" />
                {downloading ? 'Downloading…' : 'Download PDF'}
              </button>
            </div>
            <p className="text-right font-mono text-caption text-navy/45">
              {formatFullDate(invoice.periodFrom)} – {formatFullDate(invoice.periodTo)}
            </p>
          </div>
        </div>
      </header>

      <div className="px-6 pt-2 pb-6 sm:px-8 sm:pb-8">
        <div className="hidden grid-cols-[minmax(0,1fr)_4.5rem_7rem_7.5rem] gap-3 border-b border-navy/[0.08] py-3 sm:grid">
          <span className="font-mono text-eyebrow font-medium tracking-[0.12em] text-navy/40 uppercase">
            Description
          </span>
          <span className="text-right font-mono text-eyebrow font-medium tracking-[0.12em] text-navy/40 uppercase">
            Qty
          </span>
          <span className="text-right font-mono text-eyebrow font-medium tracking-[0.12em] text-navy/40 uppercase">
            Unit
          </span>
          <span className="text-right font-mono text-eyebrow font-medium tracking-[0.12em] text-navy/40 uppercase">
            Amount
          </span>
        </div>

        {lines.length === 0 ? (
          <p className="py-10 text-center text-body text-navy/50">No line items on this invoice.</p>
        ) : (
          <ul>
            {lines.map((line) => (
              <li
                key={line.id}
                className="grid gap-2 border-b border-navy/[0.06] py-4 sm:grid-cols-[minmax(0,1fr)_4.5rem_7rem_7.5rem] sm:items-start sm:gap-4"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-md leading-snug text-navy">{line.description}</p>
                  <span className="mt-1.5 block font-mono text-[10px] font-semibold tracking-[0.08em] text-navy/55 uppercase">
                    {billingModelLabel(line.billingModel)}
                  </span>
                </div>
                <div className="flex justify-between gap-4 sm:contents">
                  <span className="font-mono text-body tabular-nums text-navy/70 sm:pt-0.5 sm:text-right">
                    <span className="mr-2 text-navy/35 sm:hidden">Qty</span>
                    {line.quantity}
                  </span>
                  <span className="font-mono text-body tabular-nums text-navy/70 sm:pt-0.5 sm:text-right">
                    <span className="mr-2 text-navy/35 sm:hidden">Unit</span>
                    {formatReportMoney(line.unitPrice, invoice.currencyCode)}
                  </span>
                </div>
                <span className="font-mono text-md font-medium tabular-nums text-navy sm:pt-0.5 sm:text-right">
                  {formatReportMoney(line.amount, invoice.currencyCode)}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-xs rounded-xl bg-surface-muted/80 px-4 py-3.5">
            <div className="flex items-baseline justify-between gap-6">
              <span className="font-mono text-eyebrow font-medium tracking-[0.12em] text-navy/45 uppercase">
                Subtotal
              </span>
              <span className="font-display text-xl font-bold tabular-nums text-navy">
                {formatReportMoney(invoice.subtotal, invoice.currencyCode)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

function DeleteInvoiceDialog({
  invoice,
  deleting,
  onCancel,
  onConfirm,
}: {
  invoice: Invoice
  deleting: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Modal title={`Delete ${invoice.number}?`} onClose={onCancel}>
      <p className="text-body leading-[1.55] text-navy/70">
        This permanently removes the draft and its {invoice.lineItems.length} line{' '}
        {invoice.lineItems.length === 1 ? 'item' : 'items'} from your workspace.
      </p>

      <div className="mt-4.5 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={deleting}
          className="flex-1 rounded-full border-control border-navy bg-transparent py-2.5 font-display text-body font-semibold text-navy disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={deleting}
          className="flex-1 rounded-full bg-red py-2.5 font-display text-body font-semibold text-white transition-colors hover:bg-red/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </Modal>
  )
}
