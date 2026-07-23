import { createContext } from 'react'
import type { PomodoroPhase } from '../lib/pomodoroPhase'
import type { PomodoroPrefs } from '../lib/pomodoroPrefs'

/** Shared Pomodoro session so the tracker bar and the floating widget stay in sync. */
export interface PomodoroContextValue {
  prefs: PomodoroPrefs
  setEnabled: (enabled: boolean) => void
  setWorkMinutes: (minutes: number) => void
  setBreakMinutes: (minutes: number) => void
  phase: PomodoroPhase | null
  secondsRemaining: number | null
  phaseTotalSeconds: number | null
  progress: number | null
  countdownLabel: string | null
}

export const PomodoroContext = createContext<PomodoroContextValue | undefined>(undefined)
