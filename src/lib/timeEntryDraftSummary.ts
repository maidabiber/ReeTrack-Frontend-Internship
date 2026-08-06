import type { TimeEntryDraftItem } from '../types/assistant'

/** yyyy-MM-dd → dd/mm/yyyy for chat confirmations and the draft panel. */
export function toDisplayDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  if (!year || !month || !day) return isoDate
  return `${day}/${month}/${year}`
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

/** "Mon 03/08 09:00–11:00" — one drafted row, for conflict lists in the draft panel. */
export function summarizeDraftRow(row: TimeEntryDraftItem): string {
  return summarizeRow(row)
}

function summarizeRow(row: TimeEntryDraftItem): string {
  const date = toDisplayDate(row.entryDate)
  if (row.startTime && row.endTime) {
    return `${date} ${row.startTime}–${row.endTime}`
  }
  return `${date} ${formatDuration(row.durationMinutes)}`
}

/**
 * Local wall-clock confirmation after creating drafted time entries.
 * `skippedCount` covers rows left behind because they overlapped something.
 */
export function formatTimeEntriesCreatedMessage(
  entries: TimeEntryDraftItem[],
  skippedCount = 0,
): string {
  const skipped =
    skippedCount > 0
      ? ` ${skippedCount} ${skippedCount === 1 ? 'entry was' : 'entries were'} skipped because of overlaps — they're still in the draft panel.`
      : ''

  if (entries.length === 0) return `Time entries created successfully.${skipped}`
  if (entries.length === 1) {
    return `Time entry created: ${summarizeRow(entries[0]!)}.${skipped}`
  }

  const preview = entries.slice(0, 5).map(summarizeRow).join('; ')
  const more = entries.length > 5 ? ` (+${entries.length - 5} more)` : ''
  return `${entries.length} time entries created: ${preview}${more}.${skipped}`
}
