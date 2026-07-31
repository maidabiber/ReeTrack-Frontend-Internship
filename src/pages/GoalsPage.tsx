import { useEffect, useState } from 'react'
import { apiErrorMessage } from '../api/client'
import { NoticeBanner, LoadErrorState, DirectorySearch } from '../components/directory/DirectoryControls'
import { EditHourTargetModal } from '../components/members/EditHourTargetModal'
import { UserAvatar } from '../components/ui/UserAvatar'
import { listMembers, type Member } from '../api/members'
import { getHourTargetSettings, updateHourTargetSettings } from '../api/hourTargets'
import type { HourTargetMode, HourTargetSettings } from '../types/hourTarget'

const PAGE_SIZE = 20
const MEMBER_GRID = 'grid grid-cols-[1.6fr_1.8fr_1.2fr_auto] items-center gap-3 px-4 py-2.5'

/**
 * Admin Goals screen: org-wide default hour target plus per-member overrides.
 */
export default function GoalsPage() {
  const [settings, setSettings] = useState<HourTargetSettings | null>(null)
  const [draft, setDraft] = useState<HourTargetSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [members, setMembers] = useState<Member[]>([])
  const [membersPage, setMembersPage] = useState(1)
  const [membersTotal, setMembersTotal] = useState(0)
  const [membersSearch, setMembersSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [membersLoading, setMembersLoading] = useState(true)
  const [membersError, setMembersError] = useState<string | null>(null)
  const [membersReloadKey, setMembersReloadKey] = useState(0)
  const [editMember, setEditMember] = useState<Member | null>(null)

  const membersFetchKey = `${membersPage}:${debouncedSearch}:${membersReloadKey}`
  const [activeMembersFetchKey, setActiveMembersFetchKey] = useState(membersFetchKey)

  // Reset loading when the query changes (React-recommended render-time adjust).
  if (membersFetchKey !== activeMembersFetchKey) {
    setActiveMembersFetchKey(membersFetchKey)
    setMembersLoading(true)
    setMembersError(null)
  }

  const showNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice((current) => (current === message ? null : current)), 4000)
  }

  const loadSettings = () => {
    setIsLoading(true)
    setLoadError(null)
    getHourTargetSettings()
      .then((loaded) => {
        setSettings(loaded)
        setDraft(loaded)
      })
      .catch((error) =>
        setLoadError(apiErrorMessage(error, 'Could not load hour target settings.')),
      )
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    let cancelled = false

    getHourTargetSettings()
      .then((loaded) => {
        if (cancelled) return
        setSettings(loaded)
        setDraft(loaded)
        setLoadError(null)
      })
      .catch((error) => {
        if (cancelled) return
        setLoadError(apiErrorMessage(error, 'Could not load hour target settings.'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const next = membersSearch.trim()
    const handle = window.setTimeout(() => {
      setDebouncedSearch((prev) => {
        if (prev !== next) setMembersPage(1)
        return next
      })
    }, 250)
    return () => window.clearTimeout(handle)
  }, [membersSearch])

  useEffect(() => {
    let cancelled = false

    listMembers({
      page: membersPage,
      pageSize: PAGE_SIZE,
      q: debouncedSearch || undefined,
    })
      .then((result) => {
        if (cancelled) return
        setMembers(result.items)
        setMembersTotal(result.totalCount)
        setMembersError(null)
      })
      .catch((error) => {
        if (cancelled) return
        setMembersError(apiErrorMessage(error, 'Could not load members.'))
      })
      .finally(() => {
        if (!cancelled) setMembersLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [membersPage, debouncedSearch, membersReloadKey])

  const handleSave = () => {
    if (!draft) return
    setIsSaving(true)
    updateHourTargetSettings(draft)
      .then((saved) => {
        setSettings(saved)
        setDraft(saved)
        showNotice('Hour target default was saved.')
      })
      .catch((error) =>
        showNotice(apiErrorMessage(error, 'Could not save hour target settings.')),
      )
      .finally(() => setIsSaving(false))
  }

  const handleOverrideSaved = (
    member: Member,
    override: { mode: HourTargetMode; targetHours: number } | null,
  ) => {
    setMembers((current) =>
      current.map((row) =>
        row.id === member.id
          ? {
              ...row,
              hourTargetMode: override?.mode ?? null,
              hourTargetHours: override?.targetHours ?? null,
            }
          : row,
      ),
    )
    showNotice(
      override
        ? `Hour target override saved for ${member.displayName ?? member.email}.`
        : `${member.displayName ?? member.email} now uses the app default hour target.`,
    )
  }

  const isDirty =
    !!settings &&
    !!draft &&
    (settings.mode !== draft.mode || settings.targetHours !== draft.targetHours)

  const totalPages = Math.max(1, Math.ceil(membersTotal / PAGE_SIZE))
  const rangeStart = membersTotal === 0 ? 0 : (membersPage - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(membersPage * PAGE_SIZE, membersTotal)

  return (
    <div className="min-h-full flex-1 px-10 py-8">
      <div className="mx-auto flex w-full max-w-[840px] flex-col gap-4">
        <header>
          <h1 className="font-display text-[22px] font-bold text-navy">Goals</h1>
          <p className="mt-1 text-sm text-navy/55">
            Set the default tracked-hours target for everyone, and override it for individual
            members.
          </p>
        </header>

        {notice && <NoticeBanner>{notice}</NoticeBanner>}

        {isLoading ? (
          <div className="flex justify-center rounded-2xl bg-white py-16 shadow-card">
            <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-navy/20 border-t-navy" />
          </div>
        ) : loadError ? (
          <LoadErrorState message={loadError} onRetry={loadSettings} />
        ) : draft ? (
          <section className="rounded-2xl bg-white p-6 shadow-card">
            <div className="mb-5">
              <h2 className="font-display text-body-lg font-bold text-navy">Default hour target</h2>
              <p className="mt-0.5 text-sm text-navy/55">
                Choose either a daily target for workdays (Monday–Friday, excluding configured
                holidays) or a fixed weekly Monday–Sunday threshold.
              </p>
            </div>

            <div className="mb-5">
              <span className="mb-2 block font-display text-eyebrow font-bold tracking-[0.05em] text-navy/45 uppercase">
                Mode
              </span>
              <div className="flex w-fit rounded-full border border-navy/[0.06] bg-surface-muted p-segment">
                {(['Daily', 'Weekly'] as const).map((mode) => (
                  <ModeButton
                    key={mode}
                    mode={mode}
                    selected={draft.mode === mode}
                    onSelect={(next) => setDraft({ ...draft, mode: next })}
                  />
                ))}
              </div>
              <p className="mt-2 text-sm text-navy/45">
                {draft.mode === 'Daily'
                  ? 'Target applies each workday. Weekends and holidays have no daily target.'
                  : 'Target is a single weekly total for Monday–Sunday (not prorated for holidays).'}
              </p>
            </div>

            <label className="flex max-w-xs flex-col gap-1.5">
              <span className="font-display text-eyebrow font-bold tracking-[0.05em] text-navy/45 uppercase">
                {draft.mode === 'Daily' ? 'Hours per workday' : 'Hours per week'}
              </span>
              <input
                type="number"
                min={0.25}
                max={draft.mode === 'Daily' ? 24 : 168}
                step="0.25"
                value={Number.isFinite(draft.targetHours) ? draft.targetHours : 0}
                onChange={(event) =>
                  setDraft({ ...draft, targetHours: Number(event.target.value) })
                }
                className="rounded-xl border border-navy/10 bg-white px-3 py-2.5 font-mono text-md tabular-nums text-navy outline-none focus:border-brand"
              />
            </label>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={!isDirty || isSaving}
                className="rounded-full bg-brand px-4 py-2 font-display text-sm font-semibold text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? 'Saving…' : 'Save default'}
              </button>
            </div>
          </section>
        ) : null}

        <section className="rounded-2xl bg-white shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-navy/[0.08] px-6 py-5">
            <div>
              <h2 className="font-display text-body-lg font-bold text-navy">Member overrides</h2>
              <p className="mt-0.5 text-sm text-navy/55">
                Members without an override use the app default above.
              </p>
            </div>
            <DirectorySearch
              placeholder="Search members..."
              value={membersSearch}
              onChange={setMembersSearch}
            />
          </div>

          <div className={`${MEMBER_GRID} border-b border-navy/[0.06] text-eyebrow font-bold tracking-[0.05em] text-navy/40 uppercase`}>
            <span>Member</span>
            <span>Email</span>
            <span>Target</span>
            <span className="sr-only">Actions</span>
          </div>

          <div className="divide-y divide-navy/[0.08]">
            {membersLoading && (
              <div className="flex justify-center py-12">
                <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-navy/20 border-t-navy" />
              </div>
            )}

            {!membersLoading && membersError && (
              <LoadErrorState
                message={membersError}
                onRetry={() => setMembersReloadKey((key) => key + 1)}
              />
            )}

            {!membersLoading &&
              !membersError &&
              members.map((member) => {
                const hasOverride =
                  member.hourTargetMode !== null && member.hourTargetHours !== null
                const targetLabel = hasOverride
                  ? `Custom · ${formatTargetHours(member.hourTargetHours!, member.hourTargetMode!)}`
                  : settings
                    ? `Default · ${formatTargetHours(settings.targetHours, settings.mode)}`
                    : 'Default'

                return (
                  <div key={member.id} className={MEMBER_GRID}>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <UserAvatar
                        name={member.displayName ?? member.email}
                        size={26}
                        aria-hidden="true"
                        className={`flex-shrink-0 ${member.status === 'Disabled' ? 'opacity-50 grayscale' : ''}`}
                      />
                      <span className="truncate font-display text-md font-semibold text-navy">
                        {member.displayName ?? '—'}
                      </span>
                    </div>
                    <div className="truncate text-caption text-navy/60">{member.email}</div>
                    <span
                      className={`truncate text-caption ${hasOverride ? 'font-medium text-navy' : 'text-navy/45'}`}
                      title={targetLabel}
                    >
                      {targetLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditMember(member)}
                      className="justify-self-end rounded-full px-3 py-1.5 font-display text-sm font-semibold text-brand transition-colors hover:bg-brand-tint/40"
                    >
                      Edit
                    </button>
                  </div>
                )
              })}

            {!membersLoading && !membersError && members.length === 0 && (
              <div className="px-5 py-10 text-center text-body text-navy/50">
                {debouncedSearch
                  ? 'No members match your search.'
                  : 'No members yet. Invite your team from Members.'}
              </div>
            )}
          </div>

          {!membersError && membersTotal > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-navy/[0.08] px-4 py-3">
              <p className="text-caption text-navy/50">
                Showing {rangeStart}–{rangeEnd} of {membersTotal}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={membersPage <= 1 || membersLoading}
                  onClick={() => setMembersPage((page) => page - 1)}
                  className="rounded-full bg-surface-muted px-3 py-1.5 text-caption font-medium text-navy disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-caption text-navy/55">
                  Page {membersPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={membersPage >= totalPages || membersLoading}
                  onClick={() => setMembersPage((page) => page + 1)}
                  className="rounded-full bg-surface-muted px-3 py-1.5 text-caption font-medium text-navy disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {editMember && (
        <EditHourTargetModal
          member={editMember}
          orgDefault={settings}
          onClose={() => setEditMember(null)}
          onSaved={(override) => handleOverrideSaved(editMember, override)}
        />
      )}
    </div>
  )
}

function ModeButton({
  mode,
  selected,
  onSelect,
}: {
  mode: HourTargetMode
  selected: boolean
  onSelect: (mode: HourTargetMode) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(mode)}
      className={`rounded-full px-3.5 py-compact font-display text-sm font-semibold ${
        selected ? 'bg-navy text-cream' : 'text-navy/55'
      }`}
    >
      {mode}
    </button>
  )
}

function formatTargetHours(hours: number, mode: HourTargetMode): string {
  const label = Number.isInteger(hours) ? String(hours) : hours.toFixed(2).replace(/\.?0+$/, '')
  return mode === 'Daily' ? `${label}h/day` : `${label}h/week`
}
