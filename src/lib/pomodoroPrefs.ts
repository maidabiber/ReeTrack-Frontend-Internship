const STORAGE_KEY = 'reetrack.pomodoro'

export type PomodoroPrefs = {
  enabled: boolean
  workMinutes: number
  breakMinutes: number
}

export const DEFAULT_POMODORO_PREFS: PomodoroPrefs = {
  enabled: false,
  workMinutes: 25,
  breakMinutes: 5,
}

const MIN_MINUTES = 1
const MAX_MINUTES = 180

export function clampPomodoroMinutes(value: number): number {
  if (!Number.isFinite(value)) return MIN_MINUTES
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(value)))
}

export function normalizePomodoroPrefs(input: Partial<PomodoroPrefs> | null | undefined): PomodoroPrefs {
  return {
    enabled: Boolean(input?.enabled),
    workMinutes: clampPomodoroMinutes(input?.workMinutes ?? DEFAULT_POMODORO_PREFS.workMinutes),
    breakMinutes: clampPomodoroMinutes(input?.breakMinutes ?? DEFAULT_POMODORO_PREFS.breakMinutes),
  }
}

export function loadPomodoroPrefs(): PomodoroPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_POMODORO_PREFS }
    return normalizePomodoroPrefs(JSON.parse(raw) as Partial<PomodoroPrefs>)
  } catch {
    return { ...DEFAULT_POMODORO_PREFS }
  }
}

export function savePomodoroPrefs(prefs: PomodoroPrefs): void {
  const normalized = normalizePomodoroPrefs(prefs)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
}
