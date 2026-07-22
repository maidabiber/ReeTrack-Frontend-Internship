/** Calendar-month helpers for hourly-rate period pickers (UI-only alignment). */

/** `YYYY-MM` for an ISO date `YYYY-MM-DD`. */
export function dateToMonthValue(isoDate: string): string {
  return isoDate.slice(0, 7)
}

/** First day of the month as `YYYY-MM-DD`. */
export function monthToValidFrom(monthValue: string): string {
  return `${monthValue}-01`
}

/** Last calendar day of the month as `YYYY-MM-DD`. */
export function monthToValidTo(monthValue: string): string {
  const [yearText, monthText] = monthValue.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const lastDay = new Date(year, month, 0).getDate()
  return `${monthValue}-${String(lastDay).padStart(2, '0')}`
}

/** Current local calendar month as `YYYY-MM`. */
export function currentMonthValue(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}
