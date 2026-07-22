import { useEffect, useState } from 'react'
import { listCurrencies, type Currency } from '../../api/currencies'
import { apiErrorMessage } from '../../api/client'
import type { Member } from '../../api/members'
import {
  changeUserHourlyRate,
  listUserHourlyRates,
  updateUserHourlyRate,
  type UserHourlyRate,
} from '../../api/userHourlyRates'
import {
  currentMonthValue,
  dateToMonthValue,
  monthToValidFrom,
  monthToValidTo,
} from '../../lib/monthRange'
import { formatMoney } from '../../lib/projectFormat'
import { Modal } from '../ui/Modal'

const LABEL = 'mb-1.5 block font-display text-label font-semibold text-navy/70'
const FIELD =
  'w-full rounded-md border-control border-navy/[0.08] px-3 py-field text-body text-navy outline-none focus:border-brand'

const monthLabelFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

function formatMonthLabel(isoDate: string): string {
  const [yearText, monthText] = isoDate.slice(0, 7).split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return isoDate.slice(0, 7)
  }
  return monthLabelFormatter.format(new Date(Date.UTC(year, month - 1, 1)))
}

function formatRateRange(rate: UserHourlyRate): string {
  const start = formatMonthLabel(rate.validFrom)
  const end = rate.validTo ? formatMonthLabel(rate.validTo) : 'present'
  return `${start} → ${end}`
}

export function EditHourlyRateModal({
  member,
  onClose,
  onSaved,
}: {
  member: Member
  onClose: () => void
  onSaved: () => void
}) {
  const [history, setHistory] = useState<UserHourlyRate[]>([])
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null)
  const [hourlyRate, setHourlyRate] = useState('')
  const [startMonth, setStartMonth] = useState(currentMonthValue())
  const [endMonth, setEndMonth] = useState('')
  const [openEnded, setOpenEnded] = useState(true)
  const [currencyCode, setCurrencyCode] = useState('EUR')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isCorrecting = selectedRateId !== null

  const loadHistory = () => listUserHourlyRates(member.id)

  useEffect(() => {
    let cancelled = false

    Promise.all([loadHistory(), listCurrencies()])
      .then(([rates, loadedCurrencies]) => {
        if (cancelled) return
        setHistory(rates)
        setCurrencies(loadedCurrencies)

        const current = rates.find((rate) => rate.validTo === null) ?? rates[0]
        if (current) {
          setHourlyRate(String(current.hourlyRate))
          setCurrencyCode(current.currencyCode)
          setStartMonth(dateToMonthValue(current.validFrom))
        } else if (loadedCurrencies[0]) {
          setCurrencyCode(loadedCurrencies[0].code)
        }
        setOpenEnded(true)
        setEndMonth('')
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(apiErrorMessage(loadError, 'Could not load hourly rates.'))
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when member changes
  }, [member.id])

  const selectRate = (rate: UserHourlyRate) => {
    setSelectedRateId(rate.id)
    setHourlyRate(String(rate.hourlyRate))
    setCurrencyCode(rate.currencyCode)
    setStartMonth(dateToMonthValue(rate.validFrom))
    if (rate.validTo) {
      setOpenEnded(false)
      setEndMonth(dateToMonthValue(rate.validTo))
    } else {
      setOpenEnded(true)
      setEndMonth('')
    }
    setError(null)
  }

  const startNewPeriod = () => {
    setSelectedRateId(null)
    setStartMonth(currentMonthValue())
    setOpenEnded(true)
    setEndMonth('')
    setError(null)
    const current = history.find((rate) => rate.validTo === null) ?? history[0]
    if (current) {
      setHourlyRate(String(current.hourlyRate))
      setCurrencyCode(current.currencyCode)
    }
  }

  const currencyCodes = currencies.map((currency) => currency.code)
  const parsedRate = Number(hourlyRate)
  const canSave =
    !isLoading &&
    !isSaving &&
    hourlyRate.trim() !== '' &&
    Number.isFinite(parsedRate) &&
    parsedRate > 0 &&
    startMonth !== '' &&
    (openEnded || (endMonth !== '' && endMonth >= startMonth))

  const save = () => {
    if (!canSave) return
    setIsSaving(true)
    setError(null)

    const validFrom = monthToValidFrom(startMonth)
    const validTo = openEnded ? null : monthToValidTo(endMonth)
    const currency = currencyCode.trim().toUpperCase() || 'EUR'

    const request = isCorrecting
      ? updateUserHourlyRate(member.id, selectedRateId!, {
          hourlyRate: parsedRate,
          validFrom,
          validTo,
          currencyCode: currency,
        })
      : changeUserHourlyRate(member.id, {
          hourlyRate: parsedRate,
          validFrom,
          currencyCode: currency,
        })

    request
      .then(async (saved) => {
        const rates = await loadHistory()
        setHistory(rates)
        onSaved()

        if (isCorrecting) {
          const updated = rates.find((rate) => rate.id === saved.id)
          if (updated) selectRate(updated)
          setIsSaving(false)
        } else {
          onClose()
        }
      })
      .catch((saveError) => {
        setError(
          apiErrorMessage(
            saveError,
            isCorrecting ? 'Could not correct the hourly rate.' : 'Could not update the hourly rate.',
          ),
        )
        setIsSaving(false)
      })
  }

  return (
    <Modal
      title="Edit hourly rate"
      subtitle={member.displayName ?? member.email}
      onClose={onClose}
      widthClassName="w-auth"
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-navy/20 border-t-navy" />
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            save()
          }}
        >
          {history.length > 0 && (
            <div className="mb-3">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className={LABEL + ' mb-0'}>History</p>
                <button
                  type="button"
                  onClick={startNewPeriod}
                  className={`font-display text-caption font-semibold ${
                    isCorrecting ? 'text-brand hover:text-brand-deep' : 'text-navy/40'
                  }`}
                >
                  New period
                </button>
              </div>
              <ul className="max-h-[190px] space-y-1.5 overflow-y-auto rounded-md bg-surface-muted p-1.5">
                {history.map((rate) => {
                  const selected = rate.id === selectedRateId
                  const isCurrent = rate.validTo === null
                  const amount = formatMoney(rate.hourlyRate, rate.currencyCode) ?? '—'
                  return (
                    <li key={rate.id}>
                      <button
                        type="button"
                        onClick={() => selectRate(rate)}
                        className={`w-full rounded-xs border px-2.5 py-2 text-left transition-colors ${
                          selected
                            ? 'border-brand/45 bg-white shadow-sm'
                            : 'border-transparent text-navy/75 hover:bg-white/60'
                        }`}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span
                            className={`font-mono text-caption tabular-nums ${
                              selected ? 'font-medium text-navy' : 'text-navy/80'
                            }`}
                          >
                            {amount}/h
                          </span>
                          {isCurrent && (
                            <span className="font-display text-sm font-semibold text-brand">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-sm leading-[1.4] text-navy/50">
                          {formatRateRange(rate)}
                        </p>
                      </button>
                    </li>
                  )
                })}
              </ul>
              <p className="mt-1.5 text-sm leading-[1.4] text-navy/50">
                {isCorrecting
                  ? 'Correcting the selected period. Start and end dates stay fixed; only rate and currency can change.'
                  : 'Adding a new open-ended period from the start month. Select a history row to correct a mistake.'}
              </p>
            </div>
          )}

          <div className="mb-3 flex gap-2.5">
            <div className="w-[110px] flex-shrink-0">
              <label className={LABEL}>Currency</label>
              <select
                className={`${FIELD} bg-white`}
                value={currencyCode}
                onChange={(event) => setCurrencyCode(event.target.value)}
              >
                {currencyCodes.includes(currencyCode) ? null : (
                  <option value={currencyCode}>{currencyCode}</option>
                )}
                {currencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className={LABEL}>Hourly rate</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className={FIELD}
                placeholder="12.82"
                value={hourlyRate}
                onChange={(event) => setHourlyRate(event.target.value)}
              />
            </div>
          </div>

          <div className="mb-3 flex gap-2.5">
            <div className="flex-1">
              <label className={LABEL}>Start month</label>
              <input
                type="month"
                className={FIELD}
                value={startMonth}
                disabled={isCorrecting}
                onChange={(event) => setStartMonth(event.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className={LABEL}>End month</label>
              <input
                type="month"
                className={FIELD}
                value={openEnded ? '' : endMonth}
                disabled={isCorrecting || openEnded}
                onChange={(event) => setEndMonth(event.target.value)}
              />
            </div>
          </div>

          {!isCorrecting && (
            <p className="mb-3 text-sm leading-[1.4] text-navy/50">
              New periods start on the first day of the selected month and stay open-ended.
            </p>
          )}

          {error && (
            <div className="mb-3 rounded-md bg-red-tint px-3 py-2.5 text-sm leading-[1.5] text-red">
              {error}
            </div>
          )}

          <div className="mt-4.5 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border-control border-navy bg-transparent py-2.5 font-display text-body font-semibold text-navy"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSave}
              className="flex-1 rounded-full bg-brand py-2.5 font-display text-body font-semibold text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Saving…' : isCorrecting ? 'Save correction' : 'Save rate'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
