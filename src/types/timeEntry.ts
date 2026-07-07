export type TimeEntryMode = 'Timer' | 'Manual' | 'DurationOnly'

export interface TimeEntry {
  id: string
  description: string | null
  isBillable: boolean
  mode: TimeEntryMode
  startedAtUtc: string | null
  endedAtUtc: string | null
  durationSeconds: number
  isRunning: boolean
}

export interface ActiveTimer extends TimeEntry {
  startedAtUtc: string
  isRunning: true
}
