import type { ReportQuery } from './reportQuery'

export type InvoiceStatus = 'Draft' | 'Paid'
export type InvoiceBillingModel = 'Hourly' | 'FixedFee'

export interface InvoiceLineItem {
  id: string
  projectId: string | null
  description: string
  billingModel: InvoiceBillingModel
  quantity: number
  unitPrice: number
  amount: number
  sortOrder: number
}

export interface Invoice {
  id: string
  number: string
  clientId: string
  clientName: string
  currencyCode: string
  periodFrom: string
  periodTo: string
  subtotal: number
  status: InvoiceStatus
  generatedByUserId: string
  createdAtUtc: string
  newerInvoiceId?: string | null
  newerInvoiceNumber?: string | null
  lineItems: InvoiceLineItem[]
}

/** Body for POST /api/invoices/generate — filter payload; must include exactly one client. */
export type GenerateInvoiceInput = {
  query: ReportQuery
}
