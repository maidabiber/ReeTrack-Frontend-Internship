import { useEffect, useState } from 'react'
import type { Member } from '../../api/members'
import {
  clearMemberHourTarget,
  getHourTargetSettings,
  hourTargetApiErrorMessage,
  upsertMemberHourTarget,
} from '../../api/hourTargets'
import type { HourTargetMode, HourTargetSettings } from '../../types/hourTarget'
import { Modal } from '../ui/Modal'

const LABEL = 'mb-1.5 block font-display text-label font-semibold text-navy/70'
const FIELD =
  'w-full rounded-md border-control border-navy/[0.08] px-3 py-field text-body text-navy outline-none focus:border-brand'

export function EditHourTargetModal({
  member,
  orgDefault: orgDefaultProp = null,
  onClose,
  onSaved,
}: {
  member: Member
  /** When provided, skips fetching the org default. */
  orgDefault?: HourTargetSettings | null
  onClose: () => void
  onSaved: (override: { mode: HourTargetMode; targetHours: number } | null) => void
}) {
  const hasOverride = member.hourTargetMode !== null && member.hourTargetHours !== null

  const [fetchedDefault, setFetchedDefault] = useState<HourTargetSettings | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [mode, setMode] = useState<HourTargetMode>(
    member.hourTargetMode ?? orgDefaultProp?.mode ?? 'Daily',
  )
  const [targetHours, setTargetHours] = useState(
    String(member.hourTargetHours ?? orgDefaultProp?.targetHours ?? 8),
  )
  const [isSaving, setIsSaving] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const orgDefault = orgDefaultProp ?? fetchedDefault
  const isLoading = orgDefaultProp === null && fetchedDefault === null && fetchError === null

  useEffect(() => {
    if (orgDefaultProp !== null) return

    let cancelled = false

    getHourTargetSettings()
      .then((settings) => {
        if (cancelled) return
        setFetchedDefault(settings)
        if (!hasOverride) {
          setMode(settings.mode)
          setTargetHours(String(settings.targetHours))
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setFetchError(hourTargetApiErrorMessage(err, 'Could not load default hour target.'))
        }
      })

    return () => {
      cancelled = true
    }
  }, [hasOverride, orgDefaultProp])

  const handleSave = () => {
    const hours = Number(targetHours)
    if (!Number.isFinite(hours) || hours <= 0) {
      setError('Enter a target greater than zero.')
      return
    }

    setIsSaving(true)
    setError(null)
    upsertMemberHourTarget(member.id, { mode, targetHours: hours })
      .then((saved) => {
        onSaved({ mode: saved.mode, targetHours: saved.targetHours })
        onClose()
      })
      .catch((err) => setError(hourTargetApiErrorMessage(err, 'Could not save hour target.')))
      .finally(() => setIsSaving(false))
  }

  const handleClear = () => {
    setIsClearing(true)
    setError(null)
    clearMemberHourTarget(member.id)
      .then(() => {
        onSaved(null)
        onClose()
      })
      .catch((err) => setError(hourTargetApiErrorMessage(err, 'Could not clear hour target.')))
      .finally(() => setIsClearing(false))
  }

  const name = member.displayName ?? member.email
  const displayError = error ?? fetchError

  return (
    <Modal
      onClose={onClose}
      title="Hour target"
      subtitle={`Override the app default for ${name}.`}
      widthClassName="w-[420px]"
    >
      {isLoading ? (
        <div className="flex justify-center py-10">
          <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-navy/20 border-t-navy" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {orgDefault && (
            <p className="rounded-lg bg-surface-muted px-3 py-2 text-sm text-navy/60">
              App default:{' '}
              <span className="font-medium text-navy">
                {orgDefault.targetHours}h / {orgDefault.mode === 'Daily' ? 'workday' : 'week'}
              </span>
            </p>
          )}

          <div>
            <span className={LABEL}>Mode</span>
            <div className="flex w-fit rounded-full border border-navy/[0.06] bg-surface-muted p-segment">
              {(['Daily', 'Weekly'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMode(option)}
                  className={`rounded-full px-3.5 py-compact font-display text-sm font-semibold ${
                    mode === option ? 'bg-navy text-cream' : 'text-navy/55'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <label>
            <span className={LABEL}>
              {mode === 'Daily' ? 'Hours per workday' : 'Hours per week'}
            </span>
            <input
              type="number"
              min={0.25}
              max={mode === 'Daily' ? 24 : 168}
              step="0.25"
              value={targetHours}
              onChange={(event) => setTargetHours(event.target.value)}
              className={FIELD}
            />
          </label>

          {displayError && (
            <p className="text-sm text-red" role="alert">
              {displayError}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleClear}
              disabled={!hasOverride || isClearing || isSaving}
              className="rounded-full px-3 py-2 font-display text-sm font-semibold text-navy/55 transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isClearing ? 'Clearing…' : 'Use app default'}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full px-4 py-2 font-display text-sm font-semibold text-navy/60 hover:bg-surface-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || isClearing || Boolean(fetchError)}
                className="rounded-full bg-brand px-4 py-2 font-display text-sm font-semibold text-white hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? 'Saving…' : 'Save override'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
