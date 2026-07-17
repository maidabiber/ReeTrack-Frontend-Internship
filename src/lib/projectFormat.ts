import type { Project } from '../types/project'

/** Formats an amount with thousands separators and its currency code, e.g. "12,000 EUR". */
export function formatMoney(amount: number, currencyCode: string): string
export function formatMoney(amount: number | null, currencyCode: string): string | null
export function formatMoney(amount: number | null, currencyCode: string): string | null {
  if (amount === null) return null
  const formatted = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(amount)
  return `${formatted} ${currencyCode}`
}

/**
 * A one-line billing summary for a project card/header, e.g. "Hourly · 90 EUR/h"
 * or "Fixed fee · 12,000 EUR". Falls back to just the billing type when no
 * rate/fee is set.
 */
export function formatBillingSummary(project: Project): string {
  if (project.billingType === 'hourly') {
    const rate = formatMoney(project.hourlyRate, project.currencyCode)
    return rate ? `Hourly · ${rate}/h` : 'Hourly'
  }
  const fee = formatMoney(project.fixedFeeAmount, project.currencyCode)
  return fee ? `Fixed fee · ${fee}` : 'Fixed fee'
}
