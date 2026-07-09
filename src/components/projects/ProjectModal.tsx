import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { ColorSwatchPicker } from '../ui/ColorSwatchPicker'
import { SearchSelect } from '../ui/SearchSelect'
import { apiErrorMessage } from '../../api/client'
import { listClients } from '../../api/clients'
import { createProject, updateProject, type ProjectInput } from '../../api/projects'
import type { Client } from '../../types/client'
import type { BillingType, Project } from '../../types/project'

/** Currencies offered in the picker; the backend accepts any 3-letter code. */
const CURRENCIES = ['EUR', 'USD', 'GBP', 'BAM', 'CHF'] as const

const LABEL = 'mb-1.5 block font-display text-[11.5px] font-semibold text-navy/70'
const FIELD =
  'w-full rounded-[10px] border-[1.5px] border-navy/[0.08] px-3 py-[9px] text-[13px] text-navy outline-none focus:border-brand'

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
 * billingType is present, submit always sends the full block (currency, rate/fee,
 * budget, estimate, colour); the archive/restore action lives on the kebab, not
 * here, so this form never touches status.
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
  const [billingType, setBillingType] = useState<BillingType>(project?.billingType ?? 'hourly')
  const [currencyCode, setCurrencyCode] = useState(project?.currencyCode ?? 'EUR')
  const [hourlyRate, setHourlyRate] = useState(amountToField(project?.hourlyRate ?? null))
  const [fixedFeeAmount, setFixedFeeAmount] = useState(amountToField(project?.fixedFeeAmount ?? null))
  const [budgetAmount, setBudgetAmount] = useState(amountToField(project?.budgetAmount ?? null))
  const [timeEstimateHours, setTimeEstimateHours] = useState(
    amountToField(project?.timeEstimateHours ?? null),
  )
  const [color, setColor] = useState<string | null>(project?.color ?? null)

  const [clients, setClients] = useState<Client[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Only active clients are offered, but when editing keep the current client
  // selectable even if it was since archived.
  useEffect(() => {
    let cancelled = false
    listClients('active')
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

  const trimmedName = name.trim()
  const canSave = trimmedName.length > 0 && trimmedName.length <= 200 && clientId !== '' && !isSaving

  const save = () => {
    if (!canSave) return
    setIsSaving(true)
    setError(null)

    const input: ProjectInput = {
      name: trimmedName,
      clientId,
      billingType,
      currencyCode: currencyCode.trim().toUpperCase() || 'EUR',
      hourlyRate: billingType === 'hourly' ? parseAmount(hourlyRate) : null,
      fixedFeeAmount: billingType === 'fixedFee' ? parseAmount(fixedFeeAmount) : null,
      budgetAmount: parseAmount(budgetAmount),
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
      widthClassName="w-[460px]"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
      >
        <div className="mb-3">
          <label className={LABEL}>Project name</label>
          <input
            autoFocus
            className={FIELD}
            placeholder="Website redesign"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="mb-3">
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

        <div className="mb-3">
          <label className={LABEL}>Billing</label>
          <div className="flex rounded-full bg-surface-muted p-[3px]">
            {(['hourly', 'fixedFee'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setBillingType(option)}
                className={`flex-1 rounded-full px-3.5 py-[7px] font-display text-[12.5px] font-semibold ${
                  billingType === option ? 'bg-navy text-cream' : 'text-navy/55'
                }`}
              >
                {option === 'hourly' ? 'Hourly' : 'Fixed fee'}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3 flex gap-2.5">
          <div className="w-[110px] flex-shrink-0">
            <label className={LABEL}>Currency</label>
            <select
              className={`${FIELD} bg-white`}
              value={currencyCode}
              onChange={(event) => setCurrencyCode(event.target.value)}
            >
              {(CURRENCIES as readonly string[]).includes(currencyCode) ? null : (
                <option value={currencyCode}>{currencyCode}</option>
              )}
              {CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className={LABEL}>{billingType === 'hourly' ? 'Hourly rate' : 'Fixed fee'}</label>
            {billingType === 'hourly' ? (
              <input
                type="number"
                min="0"
                step="0.01"
                className={FIELD}
                placeholder="90"
                value={hourlyRate}
                onChange={(event) => setHourlyRate(event.target.value)}
              />
            ) : (
              <input
                type="number"
                min="0"
                step="0.01"
                className={FIELD}
                placeholder="12000"
                value={fixedFeeAmount}
                onChange={(event) => setFixedFeeAmount(event.target.value)}
              />
            )}
          </div>
        </div>

        <div className="mb-3 flex gap-2.5">
          <div className="flex-1">
            <label className={LABEL}>Budget ({currencyCode})</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={FIELD}
              placeholder="Optional"
              value={budgetAmount}
              onChange={(event) => setBudgetAmount(event.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className={LABEL}>Time estimate (h)</label>
            <input
              type="number"
              min="0"
              step="0.25"
              className={FIELD}
              placeholder="Optional"
              value={timeEstimateHours}
              onChange={(event) => setTimeEstimateHours(event.target.value)}
            />
          </div>
        </div>

        <div className="mb-3">
          <label className={LABEL}>Colour</label>
          <ColorSwatchPicker value={color} onChange={setColor} />
        </div>

        {error && (
          <div className="mb-3 rounded-[10px] bg-red-tint px-3 py-2.5 text-[12.5px] leading-[1.5] text-red">
            {error}
          </div>
        )}

        <div className="mt-[18px] flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border-[1.5px] border-navy bg-transparent py-2.5 font-display text-[13px] font-semibold text-navy"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSave}
            className="flex-1 rounded-full bg-brand py-2.5 font-display text-[13px] font-semibold text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : project ? 'Save changes' : 'Add project'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
