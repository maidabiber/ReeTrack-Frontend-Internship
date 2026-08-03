import type {
  GenerateInvoiceInput,
  Invoice,
  InvoiceBillingModel,
  InvoiceLineItem,
  InvoiceStatus,
} from '../types/invoice'
import type { PagedResult } from '../types/paged'
import { downloadBlob } from '../lib/download'
import { apiClient, requestBlob } from './client'
import { appendListQueryParams, toPagedResult, type ListQueryOptions } from './pagination'

interface InvoiceLineItemResponse {
  id: string
  projectId: string | null
  description: string
  billingModel: string
  quantity: number
  unitPrice: number
  amount: number
  sortOrder: number
}

interface InvoiceResponse {
  id: string
  number: string
  clientId: string
  clientName: string
  currencyCode: string
  periodFrom: string
  periodTo: string
  subtotal: number
  status: string
  generatedByUserId: string
  createdAtUtc: string
  newerInvoiceId?: string | null
  newerInvoiceNumber?: string | null
  lineItems: InvoiceLineItemResponse[]
}

function toBillingModel(value: string): InvoiceBillingModel {
  return value === 'FixedFee' ? 'FixedFee' : 'Hourly'
}

function toStatus(value: string): InvoiceStatus {
  return value === 'Paid' ? 'Paid' : 'Draft'
}

function toLineItem(response: InvoiceLineItemResponse): InvoiceLineItem {
  return {
    id: response.id,
    projectId: response.projectId,
    description: response.description,
    billingModel: toBillingModel(response.billingModel),
    quantity: response.quantity,
    unitPrice: response.unitPrice,
    amount: response.amount,
    sortOrder: response.sortOrder,
  }
}

function toInvoice(response: InvoiceResponse): Invoice {
  return {
    id: response.id,
    number: response.number,
    clientId: response.clientId,
    clientName: response.clientName,
    currencyCode: response.currencyCode,
    periodFrom: response.periodFrom,
    periodTo: response.periodTo,
    subtotal: response.subtotal,
    status: toStatus(response.status),
    generatedByUserId: response.generatedByUserId,
    createdAtUtc: response.createdAtUtc,
    newerInvoiceId: response.newerInvoiceId ?? null,
    newerInvoiceNumber: response.newerInvoiceNumber ?? null,
    lineItems: (response.lineItems ?? []).map(toLineItem),
  }
}

/** Admin — GET /api/invoices */
export function listInvoices(options: ListQueryOptions = {}): Promise<PagedResult<Invoice>> {
  const params = new URLSearchParams()
  appendListQueryParams(params, options)
  const qs = params.toString()
  return apiClient
    .get<PagedResult<InvoiceResponse>>(`/invoices${qs ? `?${qs}` : ''}`)
    .then((result) => toPagedResult(result, toInvoice))
}

/** Admin — GET /api/invoices/{id} */
export function getInvoice(id: string): Promise<Invoice> {
  return apiClient.get<InvoiceResponse>(`/invoices/${id}`).then(toInvoice)
}

/** Admin — DELETE /api/invoices/{id} (soft-deletes the draft). */
export function deleteInvoice(id: string): Promise<void> {
  return apiClient.delete<void>(`/invoices/${id}`)
}

/** Admin — POST /api/invoices/{id}/mark-paid (terminal state). */
export function markInvoicePaid(id: string): Promise<Invoice> {
  return apiClient.post<InvoiceResponse>(`/invoices/${id}/mark-paid`).then(toInvoice)
}

/** Admin — POST /api/invoices/generate (draft from billable-time filters). */
export function generateInvoice(input: GenerateInvoiceInput): Promise<Invoice> {
  return apiClient
    .post<InvoiceResponse>('/invoices/generate', {
      query: {
        userIds: input.query.userIds,
        projectIds: input.query.projectIds,
        clientIds: input.query.clientIds,
        taskIds: input.query.taskIds,
        tagIds: input.query.tagIds,
        billable: input.query.billable,
        from: input.query.from,
        to: input.query.to,
        groupBy: input.query.groupBy,
      },
    })
    .then(toInvoice)
}

/** Admin — GET /api/invoices/{id}/pdf */
export async function downloadInvoicePdf(id: string, fallbackName?: string): Promise<void> {
  const { blob, filename } = await requestBlob(`/invoices/${id}/pdf`)
  downloadBlob(filename ?? fallbackName ?? `invoice-${id}.pdf`, blob)
}
