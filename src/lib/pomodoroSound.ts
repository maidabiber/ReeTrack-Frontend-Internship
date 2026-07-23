/** Soft Web Audio chimes for Pomodoro phase changes (no external assets). */

type AudioContextConstructor = typeof AudioContext

let sharedContext: AudioContext | null = null

function getAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === 'undefined') return null
  return window.AudioContext ?? (window as Window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext ?? null
}

function getContext(): AudioContext | null {
  const AudioContextCtor = getAudioContextConstructor()
  if (!AudioContextCtor) return null

  if (!sharedContext || sharedContext.state === 'closed') {
    sharedContext = new AudioContextCtor()
  }

  return sharedContext
}

/** Call from a user gesture (timer start / enabling Pomodoro) so later chimes can play. */
export async function unlockPomodoroAudio(): Promise<void> {
  const ctx = getContext()
  if (!ctx) return
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume()
    } catch {
      // Autoplay policies can still block; chimes simply no-op until allowed.
    }
  }
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  volume = 0.07,
) {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.03)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.02)
}

/**
 * Play a short phase-change chime.
 * - work ending → descending (break time)
 * - break ending → ascending (back to focus)
 */
export async function playPomodoroChime(phaseEnding: 'work' | 'break'): Promise<void> {
  const ctx = getContext()
  if (!ctx) return

  if (ctx.state === 'suspended') {
    try {
      await ctx.resume()
    } catch {
      return
    }
  }

  const t = ctx.currentTime
  if (phaseEnding === 'work') {
    playTone(ctx, 880, t, 0.28)
    playTone(ctx, 659.25, t + 0.22, 0.34)
    playTone(ctx, 523.25, t + 0.44, 0.48)
    return
  }

  playTone(ctx, 523.25, t, 0.22)
  playTone(ctx, 659.25, t + 0.2, 0.28)
  playTone(ctx, 783.99, t + 0.4, 0.36)
}
