import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { ColorSwatchPicker } from '../ui/ColorSwatchPicker'
import { SearchSelect } from '../ui/SearchSelect'
import { apiErrorMessage } from '../../api/client'
import { listClients } from '../../api/clients'
import { fetchAllPages } from '../../api/pagination'
import { listCurrencies, type Currency } from '../../api/currencies'
import { createProject, updateProject, type ProjectInput } from '../../api/projects'
import type { Client } from '../../types/client'
import type { Project } from '../../types/project'

const LABEL = 'mb-1.5 block font-display text-label font-semibold text-navy/70'
/* Fields sit on the modal's glass: translucent at rest, solid when focused. */
const FIELD =
  'w-full rounded-md border-control border-navy/10 bg-white/70 px-3 py-field text-body text-navy outline-none transition-colors focus:border-brand focus:bg-white'
/* Amounts are data: mono + tabular so digits align and don't jitter. */
const AMOUNT_FIELD = `${FIELD} font-mono tabular-nums`

/** Staggered entrance for the form groups, following the dialog's pop. */
function rise(step: number, base: string) {
  return {
    className: `${base} motion-safe:animate-rise`,
    style: { animationDelay: `${step * 45}ms` },
  }
}

/** Empty string → null; otherwise the parsed number (may be negative — backend validates). */
function parseAmount(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function amountToField(value: number | null): string {
  return value === null ? '' : String(value)
}

/**
 * Create/edit form for a project (RT-37/RT-38), shared by the list and detail
 * pages. Because the backend applies the billing block wholesale whenever
 * currencyCode is present, submit always sends the full block (currency, hourly
 * rate, fixed fee, estimate, colour); the archive/restore action lives on the
 * kebab, not here, so this form never touches status.
 */
export function ProjectModal({
  project,
  onClose,
  onSaved,
}: {
  project: Project | null
  onClose: () => void
  onSaved: (saved: Project, created: boolean) => void
}) {
  const [name, setName] = useState(project?.name ?? '')
  const [clientId, setClientId] = useState(project?.clientId ?? '')
  const [currencyCode, setCurrencyCode] = useState(project?.currencyCode ?? 'EUR')
  const [hourlyRate, setHourlyRate] = useState(amountToField(project?.hourlyRate ?? null))
  const [fixedFeeAmount, setFixedFeeAmount] = useState(amountToField(project?.fixedFeeAmount ?? null))
  const [timeEstimateHours, setTimeEstimateHours] = useState(
    amountToField(project?.timeEstimateHours ?? null),
  )
  const [color, setColor] = useState<string | null>(project?.color ?? null)

  const [clients, setClients] = useState<Client[]>([])
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Only active clients are offered, but when editing keep the current client
  // selectable even if it was since archived.
  useEffect(() => {
    let cancelled = false
    fetchAllPages((page, pageSize) => listClients('active', { page, pageSize }))
      .then((loaded) => {
        if (cancelled) return
        if (project && !loaded.some((c) => c.id === project.clientId)) {
          loaded = [
            ...loaded,
            {
              id: project.clientId,
              name: project.clientName,
              isActive: false,
              projectCount: 0,
              createdAtUtc: project.createdAtUtc,
            },
          ]
        }
        setClients(loaded)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load clients. Is the backend running?')
      })
    return () => {
      cancelled = true
    }
  }, [project])

  useEffect(() => {
    let cancelled = false
    listCurrencies()
      .then((loaded) => {
        if (!cancelled) setCurrencies(loaded)
      })
      .catch(() => {
        if (!cancelled) setError((prev) => prev ?? 'Could not load currencies. Is the backend running?')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const currencyCodes = currencies.map((currency) => currency.code)
  const trimmedName = name.trim()
  const canSave = trimmedName.length > 0 && trimmedName.length <= 200 && clientId !== '' && !isSaving

  const save = () => {
    if (!canSave) return
    setIsSaving(true)
    setError(null)

    const input: ProjectInput = {
      name: trimmedName,
      clientId,
      currencyCode: currencyCode.trim().toUpperCase() || 'EUR',
      hourlyRate: parseAmount(hourlyRate),
      fixedFeeAmount: parseAmount(fixedFeeAmount),
      timeEstimateHours: parseAmount(timeEstimateHours),
      color,
    }

    const request = project ? updateProject(project.id, input) : createProject(input)

    request
      .then((saved) => onSaved(saved, project === null))
      .catch((saveError) => {
        setError(apiErrorMessage(saveError, 'Could not save the project. Please try again.'))
        setIsSaving(false)
      })
  }

  return (
    <Modal
      title={project ? 'Edit project' : 'New project'}
      subtitle={project ? undefined : 'Projects are grouped under a client and hold tracked time.'}
      onClose={onClose}
      widthClassName="w-auth"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
      >
        <div {...rise(1, 'mb-3')}>
          <label className={LABEL}>Project name</label>
          <input
            autoFocus
            className={FIELD}
            placeholder="Website redesign"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div {...rise(2, 'mb-3')}>
          <label className={LABEL}>Client</label>
          <SearchSelect
            ariaLabel="Client"
            placeholder="Select a client…"
            searchPlaceholder="Search clients…"
            value={clientId || null}
            onChange={(value) => setClientId(value ?? '')}
            options={clients.map((client) => ({
              value: client.id,
              label: client.name,
              hint: client.isActive ? undefined : '(archived)',
            }))}
          />
        </div>

        <div {...rise(3, 'mb-3 flex gap-2.5')}>
          <div className="w-[110px] flex-shrink-0">
            <label className={LABEL}>Currency</label>
            <select
              className={AMOUNT_FIELD}
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
              min="0"
              step="0.01"
              className={AMOUNT_FIELD}
              placeholder="90"
              value={hourlyRate}
              onChange={(event) => setHourlyRate(event.target.value)}
            />
          </div>
        </div>

        <div {...rise(4, 'mb-3 flex gap-2.5')}>
          <div className="flex-1">
            <label className={LABEL}>Fixed fee ({currencyCode})</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={AMOUNT_FIELD}
              placeholder="12000"
              value={fixedFeeAmount}
              onChange={(event) => setFixedFeeAmount(event.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className={LABEL}>Time estimate (h)</label>
            <input
              type="number"
              min="0"
              step="0.25"
              className={AMOUNT_FIELD}
              placeholder="Optional"
              value={timeEstimateHours}
              onChange={(event) => setTimeEstimateHours(event.target.value)}
            />
          </div>
        </div>

        <div {...rise(5, 'mb-3')}>
          <label className={LABEL}>Colour</label>
          <ColorSwatchPicker value={color} onChange={setColor} />
        </div>

        {error && (
          <div className="mb-3 rounded-md bg-red-tint px-3 py-2.5 text-sm leading-[1.5] text-red">
            {error}
          </div>
        )}

        <div {...rise(6, 'mt-4.5 flex gap-2')}>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border-control border-navy/20 bg-transparent py-2.5 font-display text-body font-semibold text-navy/70 transition-colors hover:border-navy hover:text-navy"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSave}
            className="flex-1 rounded-full bg-brand py-2.5 font-display text-body font-semibold text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : project ? 'Save changes' : 'Add project'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
