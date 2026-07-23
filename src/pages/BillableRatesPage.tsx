import { useEffect, useState } from 'react'
import { NoticeBanner, LoadErrorState } from '../components/directory/DirectoryControls'
import {
  getRateMultiplierSettings,
  rateMultiplierSettingsApiErrorMessage,
  updateRateMultiplierSettings,
} from '../api/rateMultiplierSettings'
import type { RateMultiplierSettings } from '../types/rateMultiplierSettings'

/**
 * Admin billable-rates screen: org-wide rate premiums / overtime threshold now,
 * with a Holidays section reserved for later configuration.
 */
export default function BillableRatesPage() {
  const [settings, setSettings] = useState<RateMultiplierSettings | null>(null)
  const [draft, setDraft] = useState<RateMultiplierSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const showNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice((current) => (current === message ? null : current)), 4000)
  }

  useEffect(() => {
    let cancelled = false

    getRateMultiplierSettings()
      .then((loaded) => {
        if (cancelled) return
        setSettings(loaded)
        setDraft(loaded)
        setLoadError(null)
      })
      .catch((error) => {
        if (cancelled) return
        setLoadError(
          rateMultiplierSettingsApiErrorMessage(error, 'Could not load rate multiplier settings.'),
        )
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const updateDraft = <K extends keyof RateMultiplierSettings>(
    key: K,
    value: RateMultiplierSettings[K],
  ) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current))
  }

  const handleSave = () => {
    if (!draft) return
    setIsSaving(true)
    updateRateMultiplierSettings(draft)
      .then((saved) => {
        setSettings(saved)
        setDraft(saved)
        showNotice('Rate premiums were saved.')
      })
      .catch((error) =>
        showNotice(
          rateMultiplierSettingsApiErrorMessage(error, 'Could not save rate multiplier settings.'),
        ),
      )
      .finally(() => setIsSaving(false))
  }

  const isDirty =
    !!settings &&
    !!draft &&
    (settings.weekendPremium !== draft.weekendPremium ||
      settings.holidayPremium !== draft.holidayPremium ||
      settings.overtimePremium !== draft.overtimePremium ||
      settings.weeklyOvertimeThresholdHours !== draft.weeklyOvertimeThresholdHours)

  return (
    <div className="min-h-full flex-1 px-10 py-8">
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
        <header>
          <h1 className="font-display text-[22px] font-bold text-navy">Billable rates</h1>
          <p className="mt-1 text-sm text-navy/55">
            Configure org-wide rate premiums used when calculating project cost.
          </p>
        </header>

        {notice && <NoticeBanner>{notice}</NoticeBanner>}

        {isLoading ? (
          <div className="flex justify-center rounded-2xl bg-white py-16 shadow-card">
            <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-navy/20 border-t-navy" />
          </div>
        ) : loadError ? (
          <LoadErrorState
            message={loadError}
            onRetry={() => {
              setIsLoading(true)
              setLoadError(null)
              getRateMultiplierSettings()
                .then((loaded) => {
                  setSettings(loaded)
                  setDraft(loaded)
                })
                .catch((error) =>
                  setLoadError(
                    rateMultiplierSettingsApiErrorMessage(
                      error,
                      'Could not load rate multiplier settings.',
                    ),
                  ),
                )
                .finally(() => setIsLoading(false))
            }}
          />
        ) : draft ? (
          <>
            <section className="rounded-2xl bg-white p-6 shadow-card">
              <div className="mb-5">
                <h2 className="font-display text-body-lg font-bold text-navy">Rate premiums</h2>
                <p className="mt-0.5 text-sm text-navy/55">
                  Premiums are additive fractions of the base hourly rate. Example: weekend 0.5 means
                  +50%.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  label="Weekend premium"
                  hint="Saturday / Sunday"
                  value={draft.weekendPremium}
                  onChange={(value) => updateDraft('weekendPremium', value)}
                />
                <NumberField
                  label="Holiday premium"
                  hint="Configured holiday dates"
                  value={draft.holidayPremium}
                  onChange={(value) => updateDraft('holidayPremium', value)}
                />
                <NumberField
                  label="Overtime premium"
                  hint="Hours above the weekly threshold"
                  value={draft.overtimePremium}
                  onChange={(value) => updateDraft('overtimePremium', value)}
                />
                <NumberField
                  label="Weekly overtime threshold"
                  hint="Hours per Monday–Sunday week"
                  value={draft.weeklyOvertimeThresholdHours}
                  onChange={(value) => updateDraft('weeklyOvertimeThresholdHours', value)}
                  step="0.25"
                />
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!isDirty || isSaving}
                  className="rounded-full bg-brand px-4 py-2 font-display text-sm font-semibold text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? 'Saving…' : 'Save premiums'}
                </button>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-body-lg font-bold text-navy">Holidays</h2>
                  <p className="mt-0.5 text-sm text-navy/55">
                    Manage holiday dates used for holiday rate premiums.
                  </p>
                </div>
                <span className="rounded-full bg-brand-tint px-3 py-1 font-mono text-xs font-medium tracking-[0.12em] text-brand uppercase">
                  Coming soon
                </span>
              </div>
              <div className="mt-5 rounded-xl bg-surface-muted px-4 py-8 text-center">
                <p className="font-display text-body font-semibold text-navy">
                  Holiday configuration is next
                </p>
                <p className="mt-1 text-sm text-navy/55">
                  You’ll be able to add and manage org holidays here. Until then, holiday premiums
                  only apply when holiday dates exist in the system.
                </p>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  )
}

function NumberField({
  label,
  hint,
  value,
  onChange,
  step = '0.01',
}: {
  label: string
  hint: string
  value: number
  onChange: (value: number) => void
  step?: string
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-display text-eyebrow font-bold tracking-[0.05em] text-navy/45 uppercase">
        {label}
      </span>
      <input
        type="number"
        min={0}
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Number(event.target.value))}
        className="rounded-xl border border-navy/10 bg-white px-3 py-2.5 font-mono text-md tabular-nums text-navy outline-none focus:border-brand"
      />
      <span className="text-sm text-navy/45">{hint}</span>
    </label>
  )
}
