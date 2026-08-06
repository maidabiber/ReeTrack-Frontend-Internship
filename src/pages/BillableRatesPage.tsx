import { useEffect, useMemo, useState } from 'react'
import { NoticeBanner, LoadErrorState } from '../components/directory/DirectoryControls'
import {
  getRateMultiplierSettings,
  updateRateMultiplierSettings,
} from '../api/rateMultiplierSettings'
import {
  createCustomHoliday,
  deleteCustomHoliday,
  getHolidayCalendarSettings,
  listHolidayCalendars,
  listHolidays,
  setHolidayActive,
  syncHolidays,
  updateHolidayCalendarSettings,
} from '../api/holidays'
import { apiErrorMessage } from '../api/client'
import {
  addDays,
  formatMonthYear,
  getMonthGridDays,
  isToday,
  startOfMonth,
} from '../components/calendar/dateUtils'
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal'
import { PAGE_PAD } from '../components/layout/pageChrome'
import { Icon } from '../components/ui/Icon'
import { AccessDenied } from '../components/auth/AccessDenied'
import { useAuth } from '../hooks/useAuth'
import { Permissions } from '../lib/permissions'
import type { RateMultiplierSettings } from '../types/rateMultiplierSettings'
import type { Holiday, HolidayCalendar, HolidayCalendarSettings } from '../types/holidays'

type HolidayViewMode = 'list' | 'month'

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Admin billable-rates screen: org-wide rate premiums / overtime threshold,
 * plus holiday calendar selection and custom holiday management.
 */
export default function BillableRatesPage() {
  const { hasAnyPermission } = useAuth()
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
          apiErrorMessage(error, 'Could not load rate multiplier settings.'),
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
          apiErrorMessage(error, 'Could not save rate multiplier settings.'),
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

  if (!hasAnyPermission([Permissions.RateMultipliersManage, Permissions.HolidaysManage])) {
    return (
      <AccessDenied description="Org-wide billing settings are available to workspace admins." />
    )
  }

  return (
    <div className={`min-h-full flex-1 ${PAGE_PAD}`}>
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
                    apiErrorMessage(
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

            <HolidaysSection onNotice={showNotice} />
          </>
        ) : null}
      </div>
    </div>
  )
}

function HolidaysSection({ onNotice }: { onNotice: (message: string) => void }) {
  const [calendars, setCalendars] = useState<HolidayCalendar[]>([])
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const [savedCountry, setSavedCountry] = useState<string | null>(null)
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [customDate, setCustomDate] = useState('')
  const [customName, setCustomName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [pendingToggleId, setPendingToggleId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Holiday | null>(null)
  const [viewMode, setViewMode] = useState<HolidayViewMode>('list')
  const [displayMonth, setDisplayMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null)

  const holidaysByDate = useMemo(() => {
    const map = new Map<string, Holiday>()
    for (const holiday of holidays) {
      map.set(holiday.date, holiday)
    }
    return map
  }, [holidays])

  const selectedHoliday = selectedDateKey ? (holidaysByDate.get(selectedDateKey) ?? null) : null

  const applyLoadedData = ([calendarList, settings, holidayList]: [
    HolidayCalendar[],
    HolidayCalendarSettings,
    Holiday[],
  ]) => {
    setCalendars(calendarList)
    setSavedCountry(settings.countryCode)
    setSelectedCountry(settings.countryCode ?? '')
    setHolidays(holidayList)
    setLoadError(null)
  }

  useEffect(() => {
    let cancelled = false

    Promise.all([listHolidayCalendars(), getHolidayCalendarSettings(), listHolidays()])
      .then((result) => {
        if (cancelled) return
        applyLoadedData(result)
      })
      .catch((error) => {
        if (cancelled) return
        setLoadError(apiErrorMessage(error, 'Could not load holidays.'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const load = () => {
    setIsLoading(true)
    setLoadError(null)

    Promise.all([listHolidayCalendars(), getHolidayCalendarSettings(), listHolidays()])
      .then(applyLoadedData)
      .catch((error) =>
        setLoadError(apiErrorMessage(error, 'Could not load holidays.')),
      )
      .finally(() => setIsLoading(false))
  }

  const refreshHolidays = () =>
    listHolidays()
      .then(setHolidays)
      .catch((error) =>
        onNotice(apiErrorMessage(error, 'Could not refresh holiday list.')),
      )

  const handleApplyCalendar = () => {
    setIsApplying(true)
    const countryCode = selectedCountry.trim() === '' ? null : selectedCountry
    updateHolidayCalendarSettings(countryCode)
      .then((settings) => {
        setSavedCountry(settings.countryCode)
        setSelectedCountry(settings.countryCode ?? '')
        onNotice(
          settings.countryCode
            ? 'Holiday calendar applied and synced.'
            : 'Holiday calendar cleared.',
        )
        return refreshHolidays()
      })
      .catch((error) =>
        onNotice(apiErrorMessage(error, 'Could not apply holiday calendar.')),
      )
      .finally(() => setIsApplying(false))
  }

  const handleSync = () => {
    setIsSyncing(true)
    syncHolidays()
      .then(() => {
        onNotice('Holiday calendar refreshed.')
        return refreshHolidays()
      })
      .catch((error) =>
        onNotice(apiErrorMessage(error, 'Could not refresh holiday calendar.')),
      )
      .finally(() => setIsSyncing(false))
  }

  const handleToggle = (holiday: Holiday) => {
    setPendingToggleId(holiday.id)
    setHolidayActive(holiday.id, !holiday.isActive)
      .then((updated) => {
        setHolidays((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      })
      .catch((error) =>
        onNotice(apiErrorMessage(error, 'Could not update holiday.')),
      )
      .finally(() => setPendingToggleId(null))
  }

  const handleDelete = (holiday: Holiday) => {
    setPendingDelete(holiday)
  }

  const handleCreate = () => {
    const name = customName.trim()
    if (!customDate || !name) {
      onNotice('Enter a date and name for the custom holiday.')
      return
    }

    setIsCreating(true)
    createCustomHoliday({ date: customDate, name })
      .then((created) => {
        setHolidays((current) =>
          [...current, created].sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name)),
        )
        setCustomDate('')
        setCustomName('')
        onNotice(`${created.name} was added.`)
      })
      .catch((error) =>
        onNotice(apiErrorMessage(error, 'Could not create custom holiday.')),
      )
      .finally(() => setIsCreating(false))
  }

  const calendarDirty = (selectedCountry || null) !== (savedCountry || null)

  return (
    <section className="rounded-2xl bg-white p-6 shadow-card">
      <div className="mb-5">
        <h2 className="font-display text-body-lg font-bold text-navy">Holidays</h2>
        <p className="mt-0.5 text-sm text-navy/55">
          Manage holiday dates used for holiday rate premiums. Only active holidays apply.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-navy/20 border-t-navy" />
        </div>
      ) : loadError ? (
        <LoadErrorState message={loadError} onRetry={load} />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="font-display text-eyebrow font-bold tracking-[0.05em] text-navy/45 uppercase">
                Country calendar
              </span>
              <select
                value={selectedCountry}
                onChange={(event) => setSelectedCountry(event.target.value)}
                className="rounded-xl border border-navy/10 bg-white px-3 py-2.5 font-display text-md text-navy outline-none focus:border-brand"
              >
                <option value="">No calendar</option>
                {calendars.map((calendar) => (
                  <option key={calendar.countryCode} value={calendar.countryCode}>
                    {calendar.name} ({calendar.countryCode})
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleApplyCalendar}
                disabled={isApplying || !calendarDirty}
                className="rounded-full bg-brand px-4 py-2 font-display text-sm font-semibold text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isApplying ? 'Applying…' : 'Apply'}
              </button>
              <button
                type="button"
                onClick={handleSync}
                disabled={isSyncing || !savedCountry}
                className="rounded-full border border-navy/15 bg-white px-4 py-2 font-display text-sm font-semibold text-navy transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSyncing ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-body font-semibold text-navy">Holidays</h3>
              <div className="flex rounded-full bg-surface-muted p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`rounded-full px-3 py-1 font-display text-sm font-semibold ${
                    viewMode === 'list' ? 'bg-navy text-cream' : 'text-navy/55'
                  }`}
                >
                  List
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('month')}
                  className={`rounded-full px-3 py-1 font-display text-sm font-semibold ${
                    viewMode === 'month' ? 'bg-navy text-cream' : 'text-navy/55'
                  }`}
                >
                  Month
                </button>
              </div>
            </div>

            {viewMode === 'list' ? (
              holidays.length === 0 ? (
                <p className="mt-3 rounded-xl bg-surface-muted px-4 py-6 text-center text-sm text-navy/55">
                  No holidays yet. Apply a country calendar or add a custom holiday.
                </p>
              ) : (
                <ul className="mt-3 h-64 overflow-y-auto divide-y divide-navy/[0.08] rounded-xl border border-navy/10">
                  {holidays.map((holiday) => (
                    <li key={holiday.id} className="px-3.5 py-2.5">
                      <HolidayListRow
                        holiday={holiday}
                        pendingToggleId={pendingToggleId}
                        onToggle={handleToggle}
                        onDelete={handleDelete}
                      />
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <div className="mt-3 rounded-xl border border-navy/10">
                <div className="flex items-center justify-between border-b border-navy/[0.08] px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => setDisplayMonth(addDays(startOfMonth(displayMonth), -1))}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-navy/55 hover:bg-surface-muted hover:text-navy"
                    aria-label="Previous month"
                  >
                    <Icon name="chevron-right" className="h-4 w-4 rotate-180" />
                  </button>
                  <span className="font-display text-md font-bold text-navy">
                    {formatMonthYear(displayMonth)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDisplayMonth(addDays(startOfMonth(displayMonth), 32))}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-navy/55 hover:bg-surface-muted hover:text-navy"
                    aria-label="Next month"
                  >
                    <Icon name="chevron-right" className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-px bg-navy/[0.06] p-px">
                  {WEEKDAY_LABELS.map((label) => (
                    <div
                      key={label}
                      className="bg-white py-1.5 text-center font-display text-xs font-semibold text-navy/40"
                    >
                      {label}
                    </div>
                  ))}
                  {getMonthGridDays(displayMonth).map((day) => {
                    const dateKey = toDateKey(day)
                    const inMonth = day.getMonth() === displayMonth.getMonth()
                    const holiday = holidaysByDate.get(dateKey)
                    const selected = selectedDateKey === dateKey
                    const today = isToday(day)

                    return (
                      <button
                        key={dateKey}
                        type="button"
                        onClick={() => setSelectedDateKey(dateKey)}
                        className={`relative flex min-h-14 flex-col items-start gap-0.5 bg-white px-1.5 py-1 text-left transition-colors hover:bg-surface-muted ${
                          selected ? 'ring-2 ring-inset ring-brand' : ''
                        } ${!inMonth ? 'opacity-40' : ''}`}
                      >
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs ${
                            today ? 'bg-navy text-cream' : 'text-navy'
                          }`}
                        >
                          {day.getDate()}
                        </span>
                        {holiday ? (
                          <span
                            className={`w-full truncate rounded px-1 py-0.5 text-[10px] font-semibold leading-tight ${
                              holiday.isActive
                                ? 'bg-brand-tint text-brand'
                                : 'bg-navy/8 text-navy/45 line-through'
                            }`}
                            title={holiday.name}
                          >
                            {holiday.name}
                          </span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>

                <div className="border-t border-navy/[0.08] px-3.5 py-3">
                  {selectedHoliday ? (
                    <HolidayListRow
                      holiday={selectedHoliday}
                      pendingToggleId={pendingToggleId}
                      onToggle={handleToggle}
                      onDelete={(holiday) => {
                        handleDelete(holiday)
                        setSelectedDateKey(null)
                      }}
                    />
                  ) : (
                    <p className="text-sm text-navy/55">
                      {selectedDateKey
                        ? 'No holiday on this day.'
                        : 'Select a day to see holiday details.'}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl bg-surface-muted p-4">
            <h3 className="font-display text-body font-semibold text-navy">Add custom holiday</h3>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="flex flex-col gap-1.5 sm:w-40">
                <span className="font-display text-eyebrow font-bold tracking-[0.05em] text-navy/45 uppercase">
                  Date
                </span>
                <input
                  type="date"
                  value={customDate}
                  onChange={(event) => setCustomDate(event.target.value)}
                  className="rounded-xl border border-navy/10 bg-white px-3 py-2.5 font-mono text-md text-navy outline-none focus:border-brand"
                />
              </label>
              <label className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="font-display text-eyebrow font-bold tracking-[0.05em] text-navy/45 uppercase">
                  Name
                </span>
                <input
                  type="text"
                  value={customName}
                  onChange={(event) => setCustomName(event.target.value)}
                  placeholder="Company day off"
                  maxLength={200}
                  className="rounded-xl border border-navy/10 bg-white px-3 py-2.5 font-display text-md text-navy outline-none focus:border-brand"
                />
              </label>
              <button
                type="button"
                onClick={handleCreate}
                disabled={isCreating}
                className="rounded-full bg-navy px-4 py-2 font-display text-sm font-semibold text-white transition-colors hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreating ? 'Adding…' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDelete && (
        <ConfirmDeleteModal
          title={`Delete ${pendingDelete.name}?`}
          message={`This will permanently remove the custom holiday "${pendingDelete.name}" (${pendingDelete.date}) and cannot be undone.`}
          onCancel={() => setPendingDelete(null)}
          onConfirm={async () => {
            await deleteCustomHoliday(pendingDelete.id)
            setHolidays((current) => current.filter((item) => item.id !== pendingDelete.id))
            setPendingDelete(null)
            onNotice(`${pendingDelete.name} was deleted.`)
          }}
        />
      )}
    </section>
  )
}

function HolidayListRow({
  holiday,
  pendingToggleId,
  onToggle,
  onDelete,
}: {
  holiday: Holiday
  pendingToggleId: string | null
  onToggle: (holiday: Holiday) => void
  onDelete: (holiday: Holiday) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm font-semibold text-navy">{holiday.name}</p>
        <p className="mt-0.5 font-mono text-xs text-navy/50">
          {holiday.date}
          <span className="mx-1.5 text-navy/25">·</span>
          <span className="uppercase tracking-[0.08em]">
            {holiday.source === 'calendar' ? 'Calendar' : 'Custom'}
          </span>
        </p>
      </div>
      <label className="flex items-center gap-2 text-sm text-navy/70">
        <input
          type="checkbox"
          checked={holiday.isActive}
          disabled={pendingToggleId === holiday.id}
          onChange={() => onToggle(holiday)}
          className="size-4 accent-brand"
        />
        Active
      </label>
      {holiday.source === 'custom' ? (
        <button
          type="button"
          onClick={() => onDelete(holiday)}
          className="rounded-full px-2.5 py-1 font-display text-xs font-semibold text-red transition-colors hover:bg-red/10"
        >
          Delete
        </button>
      ) : (
        <span className="w-[52px]" aria-hidden />
      )}
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
