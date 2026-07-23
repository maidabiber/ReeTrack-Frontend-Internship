export type PomodoroPhase = 'work' | 'break'

export type PomodoroPhaseInfo = {
  phase: PomodoroPhase
  /** Seconds left in the current work or break segment. */
  secondsRemaining: number
  /**
   * Monotonic segment index for the running timer:
   * 0 = first work, 1 = first break, 2 = second work, …
   */
  boundaryIndex: number
}

/** Pure phase derivation from elapsed timer seconds + interval prefs. */
export function getPomodoroPhase(
  elapsedSeconds: number,
  workMinutes: number,
  breakMinutes: number,
): PomodoroPhaseInfo {
  const workSeconds = Math.max(1, Math.round(workMinutes)) * 60
  const breakSeconds = Math.max(1, Math.round(breakMinutes)) * 60
  const cycleSeconds = workSeconds + breakSeconds
  const safeElapsed = Math.max(0, Math.floor(elapsedSeconds))

  const cyclesCompleted = Math.floor(safeElapsed / cycleSeconds)
  const positionInCycle = safeElapsed % cycleSeconds

  if (positionInCycle < workSeconds) {
    return {
      phase: 'work',
      secondsRemaining: workSeconds - positionInCycle,
      boundaryIndex: cyclesCompleted * 2,
    }
  }

  return {
    phase: 'break',
    secondsRemaining: cycleSeconds - positionInCycle,
    boundaryIndex: cyclesCompleted * 2 + 1,
  }
}

/** Formats a short countdown as M:SS. */
export function formatPomodoroCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
