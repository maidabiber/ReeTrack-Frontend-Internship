import { useCallback, useEffect, useRef, useState } from 'react'
import {
  formatPomodoroCountdown,
  getPomodoroPhase,
  type PomodoroPhase,
} from '../lib/pomodoroPhase'
import { playPomodoroChime, unlockPomodoroAudio } from '../lib/pomodoroSound'
import {
  loadPomodoroPrefs,
  savePomodoroPrefs,
  type PomodoroPrefs,
  clampPomodoroMinutes,
} from '../lib/pomodoroPrefs'

export function usePomodoroSession({
  isRunning,
  elapsedSeconds,
  timerId,
}: {
  isRunning: boolean
  elapsedSeconds: number
  timerId: string | null
}) {
  const [prefs, setPrefsState] = useState<PomodoroPrefs>(() => loadPomodoroPrefs())
  const lastNotifiedBoundaryRef = useRef<number | null>(null)
  const trackedTimerIdRef = useRef<string | null>(null)

  const setPrefs = useCallback((next: PomodoroPrefs | ((current: PomodoroPrefs) => PomodoroPrefs)) => {
    setPrefsState((current) => {
      const resolved = typeof next === 'function' ? next(current) : next
      const normalized: PomodoroPrefs = {
        enabled: resolved.enabled,
        workMinutes: clampPomodoroMinutes(resolved.workMinutes),
        breakMinutes: clampPomodoroMinutes(resolved.breakMinutes),
      }
      savePomodoroPrefs(normalized)
      return normalized
    })
  }, [])

  const setEnabled = useCallback(
    (enabled: boolean) => {
      if (enabled) void unlockPomodoroAudio()
      setPrefs((current) => ({ ...current, enabled }))
    },
    [setPrefs],
  )

  const setWorkMinutes = useCallback(
    (workMinutes: number) => {
      setPrefs((current) => ({ ...current, workMinutes }))
    },
    [setPrefs],
  )

  const setBreakMinutes = useCallback(
    (breakMinutes: number) => {
      setPrefs((current) => ({ ...current, breakMinutes }))
    },
    [setPrefs],
  )

  const phaseInfo =
    prefs.enabled && isRunning
      ? getPomodoroPhase(elapsedSeconds, prefs.workMinutes, prefs.breakMinutes)
      : null

  const boundaryIndex = phaseInfo?.boundaryIndex ?? null
  const phase = phaseInfo?.phase ?? null
  const secondsRemaining = phaseInfo?.secondsRemaining ?? null
  const phaseTotalSeconds =
    phase === 'work'
      ? Math.max(1, Math.round(prefs.workMinutes)) * 60
      : phase === 'break'
        ? Math.max(1, Math.round(prefs.breakMinutes)) * 60
        : null
  const progress =
    secondsRemaining != null && phaseTotalSeconds != null
      ? 1 - secondsRemaining / phaseTotalSeconds
      : null

  // Unlock audio when a Pomodoro-enabled timer is running (start is a user gesture).
  useEffect(() => {
    if (prefs.enabled && isRunning) {
      void unlockPomodoroAudio()
    }
  }, [prefs.enabled, isRunning])

  // Tab title pattern used by many Pomodoro apps — remaining time at a glance.
  useEffect(() => {
    if (!prefs.enabled || !isRunning || phase == null || secondsRemaining == null) return

    const previousTitle = document.title
    const label = phase === 'work' ? 'Focus' : 'Break'
    document.title = `${formatPomodoroCountdown(secondsRemaining)} · ${label} · ReeTrack`
    return () => {
      document.title = previousTitle
    }
  }, [prefs.enabled, isRunning, phase, secondsRemaining])

  useEffect(() => {
    if (!prefs.enabled || !isRunning || !timerId || boundaryIndex === null || phase === null) {
      if (!isRunning) {
        lastNotifiedBoundaryRef.current = null
        trackedTimerIdRef.current = null
      }
      return
    }

    if (trackedTimerIdRef.current !== timerId) {
      trackedTimerIdRef.current = timerId
      // Suppress chimes for boundaries already passed (refresh mid-session).
      lastNotifiedBoundaryRef.current = boundaryIndex
      return
    }

    const lastNotified = lastNotifiedBoundaryRef.current
    if (lastNotified === null) {
      lastNotifiedBoundaryRef.current = boundaryIndex
      return
    }

    if (boundaryIndex > lastNotified) {
      const phaseEnding: PomodoroPhase = phase === 'break' ? 'work' : 'break'
      void playPomodoroChime(phaseEnding)
      lastNotifiedBoundaryRef.current = boundaryIndex
    }
  }, [prefs.enabled, isRunning, timerId, boundaryIndex, phase])

  return {
    prefs,
    setEnabled,
    setWorkMinutes,
    setBreakMinutes,
    phase,
    secondsRemaining,
    phaseTotalSeconds,
    progress,
    countdownLabel:
      secondsRemaining != null ? formatPomodoroCountdown(secondsRemaining) : null,
  }
}
