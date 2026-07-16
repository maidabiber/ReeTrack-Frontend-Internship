/**
 * Client-side CSV parsing for member batch invites. Feeds emails into the
 * existing POST /api/invitations/batch path — no file upload to the server.
 */

import Papa from 'papaparse'

/** Matches the backend CreateManyAsync max (InvitationService). */
export const MAX_INVITE_BATCH = 50

export const INVITE_CSV_TEMPLATE = 'email\nalice@company.com\nbob@company.com\n'

/** Splits comma/semicolon/whitespace-separated input into unique addresses. */
export function parseEmails(input: string): string[] {
  const seen = new Set<string>()
  const emails: string[] = []
  for (const part of input.split(/[\s,;]+/)) {
    const email = part.trim()
    if (!email) continue
    const key = email.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    emails.push(email)
  }
  return emails
}

function isEmailHeader(cell: string): boolean {
  const normalized = cell.trim().toLowerCase().replace(/^"|"$/g, '')
  return normalized === 'email' || normalized === 'e-mail' || normalized === 'emails'
}

function parseCsvRows(text: string): string[][] {
  const cleaned = text.replace(/^\uFEFF/, '').trim()
  if (!cleaned) return []

  const result = Papa.parse<string[]>(cleaned, {
    header: false,
    skipEmptyLines: true,
    delimitersToGuess: [',', ';'],
  })

  return result.data.filter((row) => row.some((cell) => cell.trim().length > 0))
}

/**
 * Extracts unique email addresses from a CSV (or CSV-like) text blob.
 * Supports an optional header row with an "email" column; otherwise uses the
 * first column of each row. Comma and semicolon delimiters are accepted.
 */
export function parseInviteCsv(text: string): string[] {
  const rows = parseCsvRows(text)
  if (rows.length === 0) return []

  const emailColIndex = rows[0].findIndex(isEmailHeader)
  const hasHeader = emailColIndex >= 0
  const dataRows = hasHeader ? rows.slice(1) : rows
  const columnIndex = hasHeader ? emailColIndex : 0

  const collected: string[] = []
  for (const row of dataRows) {
    const raw = row[columnIndex] ?? ''
    const value = raw.replace(/^"|"$/g, '').trim()
    if (value) collected.push(value)
  }

  return parseEmails(collected.join('\n'))
}

/** Triggers a browser download of the invite CSV template. */
export function downloadInviteCsvTemplate(): void {
  const blob = new Blob([INVITE_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'reetrack-invite-template.csv'
  anchor.click()
  URL.revokeObjectURL(url)
}
