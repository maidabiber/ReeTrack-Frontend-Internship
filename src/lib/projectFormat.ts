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
 * A one-line billing summary for a project card/header combining whichever
 * rates are set, e.g. "90 EUR/h · 12,000 EUR", "90 EUR/h", or "12,000 EUR".
 * Falls back to "No rate set" when neither is present.
 */
export function formatBillingSummary(project: Project): string {
  const parts: string[] = []
  const rate = formatMoney(project.hourlyRate, project.currencyCode)
  if (rate) parts.push(`${rate}/h`)
  const fee = formatMoney(project.fixedFeeAmount, project.currencyCode)
  if (fee) parts.push(fee)
  return parts.length > 0 ? parts.join(' · ') : 'No rate set'
}

/** e.g. "12.5 / 40 h" when an estimate exists, otherwise just "12.5 h". */
export function formatPlannedVsActual(project: Project): string {
  const actual = formatHours(project.actualHours)
  if (project.timeEstimateHours === null) return `${actual} h`
  return `${actual} / ${formatHours(project.timeEstimateHours)} h`
}

function formatHours(hours: number): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(hours)
}
