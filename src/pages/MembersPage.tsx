import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { Modal } from '../components/ui/Modal'
import { Pill } from '../components/ui/Pill'
import {
  inviteMembers,
  listAllowedDomains,
  listInvitations,
  listMembers,
  memberApiErrorMessage,
  resendInvite,
  revokeInvite,
  updateMember,
  type BatchInviteRow,
  type InvitationListItem,
  type Member,
} from '../api/members'
import { ROLE_IDS, type InvitationStatus, type Role, type UserStatus } from '../types/user'

type RoleFilter = 'all' | Role
type StatusFilter = 'all' | UserStatus
type OpenFilter = 'role' | 'status' | null
type View = 'members' | 'invitations'

const STATUS_DISPLAY: Record<UserStatus, string> = {
  Active: 'Active',
  Invited: 'Invited',
  Disabled: 'Deactivated',
}

const ROLE_DOT: Record<Role, string> = {
  Admin: 'bg-brand',
  Member: 'bg-navy/45',
}

const STATUS_DOT: Record<UserStatus, string> = {
  Active: 'bg-[#1E8A57]',
  Invited: 'bg-[#B8860B]',
  Disabled: 'bg-navy/35',
}

const INVITE_STATUS_DOT: Record<InvitationStatus, string> = {
  Pending: 'bg-[#B8860B]',
  Accepted: 'bg-[#1E8A57]',
  Revoked: 'bg-navy/35',
  Expired: 'bg-red/70',
}

const GRID = 'grid grid-cols-[2fr_2.2fr_0.9fr_0.9fr_0.7fr_32px] items-center gap-2.5 px-3.5 py-2'
const INVITE_GRID =
  'grid grid-cols-[2.2fr_0.8fr_1fr_1.5fr_1fr_1fr_32px] items-center gap-2.5 px-3.5 py-2'

/**
 * RT-271/RT-216/RT-217 — Members & invitations management. Lists everyone with
 * access via GET /api/members with working role change and (de)activation
 * (PATCH /api/members/{id}); the Invitations view shows the full invitation
 * history (GET /api/invitations) with resend and revoke. Invites accept
 * multiple comma-separated emails via POST /api/invitations/batch (RT-275).
 */
export default function MembersPage() {
  const [view, setView] = useState<View>('members')
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [openFilter, setOpenFilter] = useState<OpenFilter>(null)
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [invitationsReloadKey, setInvitationsReloadKey] = useState(0)

  const closeMenus = () => {
    setOpenFilter(null)
    setOpenRowMenuId(null)
  }

  useEffect(() => {
    let cancelled = false

    listMembers()
      .then((loaded) => {
        if (cancelled) return
        setMembers(loaded)
      })
      .catch((error) => {
        if (cancelled) return
        setLoadError(memberApiErrorMessage(error, 'Could not load members. Is the backend running?'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return members.filter((member) => {
      const matchesSearch =
        !query ||
        (member.displayName ?? '').toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query)
      const matchesRole = roleFilter === 'all' || member.role === roleFilter
      const matchesStatus = statusFilter === 'all' || member.status === statusFilter
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [members, search, roleFilter, statusFilter])

  const showNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice((current) => (current === message ? null : current)), 4000)
  }

  const upsertMember = (member: Member) => {
    setMembers((current) => {
      const existing = current.findIndex((m) => m.id === member.id || m.email === member.email)
      if (existing === -1) return [...current, member]
      return current.map((m, index) => (index === existing ? member : m))
    })
  }

  const handleInvited = (rows: BatchInviteRow[]) => {
    for (const row of rows) {
      if (row.member) upsertMember(row.member)
    }
    setInvitationsReloadKey((key) => key + 1)

    const invited = rows.filter((row) => row.status === 'Invited').length
    if (invited > 0) {
      showNotice(invited === 1 ? 'Invite sent.' : `Invites sent to ${invited} people.`)
    }
  }

  const handleResend = (member: Member) => {
    setOpenRowMenuId(null)
    if (!member.pendingInvitationId) return

    resendInvite(member.pendingInvitationId)
      .then(() => {
        setReloadKey((key) => key + 1)
        setInvitationsReloadKey((key) => key + 1)
        showNotice(`Invite re-sent to ${member.email}.`)
      })
      .catch((error) =>
        showNotice(memberApiErrorMessage(error, `Could not resend the invite to ${member.email}.`)),
      )
  }

  const handleRevoke = (member: Member) => {
    setOpenRowMenuId(null)
    if (!member.pendingInvitationId) return

    revokeInvite(member.pendingInvitationId)
      .then(({ removedUserId }) => {
        if (removedUserId) {
          setMembers((current) => current.filter((m) => m.id !== removedUserId))
        } else {
          setReloadKey((key) => key + 1)
        }
        setInvitationsReloadKey((key) => key + 1)
        showNotice(`Invite to ${member.email} revoked.`)
      })
      .catch((error) =>
        showNotice(memberApiErrorMessage(error, `Could not revoke the invite to ${member.email}.`)),
      )
  }

  const handleToggleRole = (member: Member) => {
    setOpenRowMenuId(null)
    const nextRole: Role = member.role === 'Admin' ? 'Member' : 'Admin'

    updateMember(member.id, { roleId: ROLE_IDS[nextRole] })
      .then((updated) => {
        upsertMember(updated)
        setInvitationsReloadKey((key) => key + 1)
        showNotice(`${updated.displayName ?? updated.email} is now ${nextRole === 'Admin' ? 'an admin' : 'a member'}.`)
      })
      .catch((error) =>
        showNotice(memberApiErrorMessage(error, `Could not change the role of ${member.email}.`)),
      )
  }

  const handleToggleActive = (member: Member) => {
    setOpenRowMenuId(null)
    const nextStatus = member.status === 'Disabled' ? 'Active' : 'Disabled'

    updateMember(member.id, { status: nextStatus })
      .then((updated) => {
        upsertMember(updated)
        showNotice(
          nextStatus === 'Disabled'
            ? `${updated.displayName ?? updated.email} was deactivated. Their data is retained.`
            : `${updated.displayName ?? updated.email} was reactivated.`,
        )
      })
      .catch((error) =>
        showNotice(memberApiErrorMessage(error, `Could not update ${member.email}.`)),
      )
  }

  return (
    <div className="min-h-full flex-1 px-10 py-8" onClick={closeMenus}>
      <div className="mx-auto flex w-full max-w-[1340px] flex-col gap-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[19px] font-bold text-navy">Members</h1>
          <p className="mt-[3px] max-w-[560px] text-[13px] leading-[1.5] text-navy/60">
            See everyone with access to this workspace, their role, and account status.
          </p>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            setInviteOpen(true)
          }}
          className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-brand px-[18px] py-[9px] font-display text-[13px] font-semibold text-white transition-colors hover:bg-brand-deep"
        >
          <Icon name="plus" className="h-[13px] w-[13px]" />
          Invite members
        </button>
      </header>

      {notice && (
        <div className="flex items-center gap-2 rounded-[14px] bg-brand-tint px-4 py-3 text-[13px] font-medium text-navy">
          <span aria-hidden="true" className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand" />
          {notice}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-full bg-surface-muted p-[3px]">
          {(['members', 'invitations'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setView(option)}
              className={`rounded-full px-3.5 py-[7px] font-display text-[12.5px] font-semibold ${
                view === option ? 'bg-navy text-cream' : 'text-navy/55'
              }`}
            >
              {option === 'members' ? 'Members' : 'Invitations'}
            </button>
          ))}
        </div>

        {view === 'members' && (
          <>
            <FilterDropdown
              label={roleFilter === 'all' ? 'Role' : roleFilter}
              isOpen={openFilter === 'role'}
              onToggle={() => setOpenFilter(openFilter === 'role' ? null : 'role')}
              options={[
                { value: 'all', label: 'All roles' },
                { value: 'Admin', label: 'Admin' },
                { value: 'Member', label: 'Member' },
              ]}
              value={roleFilter}
              onSelect={(value) => {
                setRoleFilter(value as RoleFilter)
                setOpenFilter(null)
              }}
            />
            <FilterDropdown
              label={statusFilter === 'all' ? 'Status' : STATUS_DISPLAY[statusFilter]}
              isOpen={openFilter === 'status'}
              onToggle={() => setOpenFilter(openFilter === 'status' ? null : 'status')}
              options={[
                { value: 'all', label: 'All statuses' },
                { value: 'Active', label: 'Active' },
                { value: 'Invited', label: 'Invited' },
                { value: 'Disabled', label: 'Deactivated' },
              ]}
              value={statusFilter}
              onSelect={(value) => {
                setStatusFilter(value as StatusFilter)
                setOpenFilter(null)
              }}
            />

            <span className="flex-1" />

            <label className="flex min-w-[180px] max-w-[280px] flex-1 items-center gap-1.5 rounded-full border-[1.5px] border-navy/[0.08] bg-white px-3.5 py-[7px] focus-within:border-brand">
              <Icon name="search" className="h-3.5 w-3.5 flex-shrink-0 text-navy/50" />
              <input
                className="w-full border-none bg-transparent text-[13px] text-navy outline-none placeholder:text-navy/45"
                placeholder="Search members..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onClick={(event) => event.stopPropagation()}
              />
            </label>
          </>
        )}
      </div>

      {view === 'members' ? (
        <div className="rounded-[18px] bg-white shadow-card">
          <div className={`${GRID} border-b border-navy/[0.08]`}>
            <HeaderCell icon="members" label="Name" />
            <HeaderCell icon="mail" label="Email" />
            <HeaderCell icon="shield" label="Role" />
            <HeaderCell icon="check-badge" label="Status" />
            <HeaderCell icon="billable" label="Rate" />
            <span />
          </div>

          <div className="divide-y divide-navy/[0.08]">
            {isLoading && <LoadingRow />}

            {!isLoading && loadError && (
              <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
                <span className="text-[13px] text-red">{loadError}</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsLoading(true)
                    setLoadError(null)
                    setReloadKey((key) => key + 1)
                  }}
                  className="rounded-full border-[1.5px] border-navy px-4 py-1.5 font-display text-[12.5px] font-semibold text-navy"
                >
                  Try again
                </button>
              </div>
            )}

            {!isLoading &&
              !loadError &&
              filtered.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  menuOpen={openRowMenuId === member.id}
                  onToggleMenu={(event) => {
                    event.stopPropagation()
                    setOpenRowMenuId(openRowMenuId === member.id ? null : member.id)
                    setOpenFilter(null)
                  }}
                  onResend={() => handleResend(member)}
                  onRevoke={() => handleRevoke(member)}
                  onToggleRole={() => handleToggleRole(member)}
                  onToggleActive={() => handleToggleActive(member)}
                />
              ))}

            {!isLoading && !loadError && filtered.length === 0 && (
              <div className="px-5 py-10 text-center text-[13px] text-navy/50">
                {members.length === 0
                  ? 'No members yet. Invite your team to get started.'
                  : 'No members match your search or filters.'}
              </div>
            )}
          </div>
        </div>
      ) : (
        <InvitationsCard
          reloadKey={invitationsReloadKey}
          openRowMenuId={openRowMenuId}
          onToggleRowMenu={(id) => {
            setOpenRowMenuId(openRowMenuId === id ? null : id)
            setOpenFilter(null)
          }}
          onChanged={() => {
            setReloadKey((key) => key + 1)
            setInvitationsReloadKey((key) => key + 1)
          }}
          onRemovedUser={(removedUserId) =>
            setMembers((current) => current.filter((m) => m.id !== removedUserId))
          }
          showNotice={showNotice}
        />
      )}

      {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} onInvited={handleInvited} />}
      </div>
    </div>
  )
}

function LoadingRow() {
  return (
    <div className="flex items-center justify-center px-5 py-10">
      <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-navy/20 border-t-navy" />
    </div>
  )
}

function HeaderCell({ icon, label }: { icon: Parameters<typeof Icon>[0]['name']; label: string }) {
  return (
    <div className="flex items-center gap-1.5 py-1.5 font-display text-[10.5px] font-bold tracking-[0.05em] text-navy/60 uppercase">
      <Icon name={icon} className="h-3 w-3 text-brand" />
      {label}
    </div>
  )
}

interface FilterOption {
  value: string
  label: string
}

function FilterDropdown({
  label,
  options,
  value,
  isOpen,
  onToggle,
  onSelect,
}: {
  label: string
  options: FilterOption[]
  value: string
  isOpen: boolean
  onToggle: () => void
  onSelect: (value: string) => void
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onToggle()
        }}
        className="flex items-center gap-1.5 rounded-full border-[1.5px] border-navy/[0.08] bg-white px-3.5 py-[7px] font-display text-[12.5px] font-semibold text-navy hover:border-brand"
      >
        {label}
        <Icon name="chevron-down" className="h-3 w-3 opacity-60" />
      </button>
      {isOpen && (
        <div className="absolute top-[calc(100%+4px)] left-0 z-20 min-w-[140px] rounded-[14px] bg-white p-[5px] shadow-[0_16px_36px_rgba(31,43,77,0.16)]">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onSelect(option.value)
              }}
              className={`flex w-full items-center rounded-md px-2.5 py-[7px] text-left text-[12.5px] hover:bg-surface-muted ${
                value === option.value ? 'font-bold text-navy' : 'font-medium'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function MemberRow({
  member,
  menuOpen,
  onToggleMenu,
  onResend,
  onRevoke,
  onToggleRole,
  onToggleActive,
}: {
  member: Member
  menuOpen: boolean
  onToggleMenu: (event: React.MouseEvent) => void
  onResend: () => void
  onRevoke: () => void
  onToggleRole: () => void
  onToggleActive: () => void
}) {
  const initials = (member.displayName ?? member.email)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  const hasPendingInvite = member.status === 'Invited' && member.pendingInvitationId !== null

  return (
    <div className={`${GRID} hover:bg-surface-muted`}>
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-[9px] bg-surface-muted font-mono text-[10.5px] font-medium text-navy">
          {initials}
        </span>
        <span className="truncate text-[13px] font-semibold">{member.displayName}</span>
      </div>

      <div className="truncate font-mono text-[12px] text-navy/65">{member.email}</div>

      <Pill label={member.role} dotClassName={ROLE_DOT[member.role]} />
      <Pill label={STATUS_DISPLAY[member.status]} dotClassName={STATUS_DOT[member.status]} />

      {/* Rates wait on RT-61; display-only until then. */}
      <span
        className={`font-mono text-[12.5px] tabular-nums ${member.rate !== null ? 'font-medium' : 'font-normal opacity-40'}`}
        title="Rates are coming with billing (RT-61)."
      >
        {member.rate !== null ? `$${member.rate}/hr` : '—'}
      </span>

      <div className="relative flex justify-end">
        <button
          type="button"
          onClick={onToggleMenu}
          aria-label="Row actions"
          className="flex h-6 w-6 items-center justify-center rounded-md text-navy/50 hover:bg-surface-muted hover:text-navy"
        >
          <Icon name="more" className="h-[15px] w-[15px]" />
        </button>
        {menuOpen && (
          <div className="absolute top-[calc(100%+4px)] right-0 z-30 min-w-[170px] rounded-[14px] bg-white p-[5px] shadow-[0_16px_36px_rgba(31,43,77,0.16)]">
            {hasPendingInvite && <RowMenuItem icon="resend" label="Resend invite" onClick={onResend} />}
            <RowMenuItem
              icon="settings"
              label={member.role === 'Admin' ? 'Make member' : 'Make admin'}
              onClick={onToggleRole}
            />
            {hasPendingInvite ? (
              <RowMenuItem icon="ban" label="Revoke invite" danger onClick={onRevoke} />
            ) : (
              <RowMenuItem
                icon="ban"
                label={member.status === 'Disabled' ? 'Reactivate' : 'Deactivate'}
                danger
                onClick={onToggleActive}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function RowMenuItem({
  icon,
  label,
  danger,
  disabled,
  onClick,
}: {
  icon: Parameters<typeof Icon>[0]['name']
  label: string
  danger?: boolean
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation()
        onClick?.()
      }}
      className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[12.5px] font-medium ${
        disabled
          ? 'cursor-not-allowed text-navy/35'
          : `hover:bg-surface-muted ${danger ? 'text-red' : 'text-navy'}`
      }`}
    >
      <Icon name={icon} className={`h-[13px] w-[13px] ${danger && !disabled ? 'opacity-80' : 'opacity-65'}`} />
      {label}
    </button>
  )
}

/**
 * RT-216 — invitation history with effective statuses. Pending (and expired)
 * invitations can be resent or revoked; accepted/revoked rows are audit trail.
 */
function InvitationsCard({
  reloadKey,
  openRowMenuId,
  onToggleRowMenu,
  onChanged,
  onRemovedUser,
  showNotice,
}: {
  reloadKey: number
  openRowMenuId: string | null
  onToggleRowMenu: (id: string) => void
  onChanged: () => void
  onRemovedUser: (removedUserId: string) => void
  showNotice: (message: string) => void
}) {
  const [invitations, setInvitations] = useState<InvitationListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Refetches (reloadKey bumps) happen silently over the stale list; the
  // spinner only shows for the initial load.
  useEffect(() => {
    let cancelled = false

    listInvitations()
      .then((loaded) => {
        if (cancelled) return
        setInvitations(loaded)
        setLoadError(null)
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(memberApiErrorMessage(error, 'Could not load invitations.'))
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const handleResend = (invitation: InvitationListItem) => {
    resendInvite(invitation.id)
      .then(() => {
        onChanged()
        showNotice(`Invite re-sent to ${invitation.email}.`)
      })
      .catch((error) =>
        showNotice(memberApiErrorMessage(error, `Could not resend the invite to ${invitation.email}.`)),
      )
  }

  const handleRevoke = (invitation: InvitationListItem) => {
    revokeInvite(invitation.id)
      .then(({ removedUserId }) => {
        if (removedUserId) onRemovedUser(removedUserId)
        onChanged()
        showNotice(`Invite to ${invitation.email} revoked.`)
      })
      .catch((error) =>
        showNotice(memberApiErrorMessage(error, `Could not revoke the invite to ${invitation.email}.`)),
      )
  }

  return (
    <div className="rounded-[18px] bg-white shadow-card">
      <div className={`${INVITE_GRID} border-b border-navy/[0.08]`}>
        <HeaderCell icon="mail" label="Email" />
        <HeaderCell icon="shield" label="Role" />
        <HeaderCell icon="check-badge" label="Status" />
        <HeaderCell icon="members" label="Invited by" />
        <HeaderCell icon="calendar" label="Sent" />
        <HeaderCell icon="calendar" label="Expires" />
        <span />
      </div>

      <div className="divide-y divide-navy/[0.08]">
        {isLoading && <LoadingRow />}

        {!isLoading && loadError && (
          <div className="px-5 py-10 text-center text-[13px] text-red">{loadError}</div>
        )}

        {!isLoading &&
          !loadError &&
          invitations.map((invitation) => {
            const isActionable = invitation.status === 'Pending' || invitation.status === 'Expired'
            return (
              <div key={invitation.id} className={`${INVITE_GRID} hover:bg-surface-muted`}>
                <div className="truncate text-[13px] font-semibold">{invitation.email}</div>
                <Pill label={invitation.role} dotClassName={ROLE_DOT[invitation.role]} />
                <Pill label={invitation.status} dotClassName={INVITE_STATUS_DOT[invitation.status]} />
                <div className="truncate text-[12.5px] text-navy/65">{invitation.invitedByName}</div>
                <div className="text-[12.5px] text-navy/65">{formatDate(invitation.createdAtUtc)}</div>
                <div className="text-[12.5px] text-navy/65">
                  {invitation.status === 'Accepted' && invitation.acceptedAtUtc
                    ? `Joined ${formatDate(invitation.acceptedAtUtc)}`
                    : formatDate(invitation.expiresAtUtc)}
                </div>

                <div className="relative flex justify-end">
                  {isActionable && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onToggleRowMenu(invitation.id)
                      }}
                      aria-label="Invitation actions"
                      className="flex h-6 w-6 items-center justify-center rounded-md text-navy/50 hover:bg-surface-muted hover:text-navy"
                    >
                      <Icon name="more" className="h-[15px] w-[15px]" />
                    </button>
                  )}
                  {isActionable && openRowMenuId === invitation.id && (
                    <div className="absolute top-[calc(100%+4px)] right-0 z-30 min-w-[170px] rounded-[14px] bg-white p-[5px] shadow-[0_16px_36px_rgba(31,43,77,0.16)]">
                      <RowMenuItem icon="resend" label="Resend invite" onClick={() => handleResend(invitation)} />
                      <RowMenuItem icon="ban" label="Revoke invite" danger onClick={() => handleRevoke(invitation)} />
                    </div>
                  )}
                </div>
              </div>
            )
          })}

        {!isLoading && !loadError && invitations.length === 0 && (
          <div className="px-5 py-10 text-center text-[13px] text-navy/50">
            No invitations yet. Invite your team to get started.
          </div>
        )}
      </div>
    </div>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Splits comma/semicolon/whitespace-separated input into unique addresses. */
function parseEmails(input: string): string[] {
  const seen = new Set<string>()
  const emails: string[] = []
  for (const part of input.split(/[\s,;]+/)) {
    const email = part.trim()
    if (!email) continue
    const key = email.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    emails.push(email)
  }
  return emails
}

const ROW_STATUS_DISPLAY: Record<BatchInviteRow['status'], string> = {
  Invited: 'Invite sent',
  AlreadyActive: 'Already a member',
  Invalid: 'Invalid address',
  EmailFailed: 'Saved, but the email failed — use resend',
  Duplicate: 'Duplicate',
}

/**
 * RT-275 — invite one or many people at once: emails are comma (or newline)
 * separated and submitted as a single batch with per-address results.
 */
function InviteModal({
  onClose,
  onInvited,
}: {
  onClose: () => void
  onInvited: (rows: BatchInviteRow[]) => void
}) {
  const [emailsInput, setEmailsInput] = useState('')
  const [role, setRole] = useState<Role>('Member')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<BatchInviteRow[] | null>(null)
  const [allowedDomains, setAllowedDomains] = useState<string[]>([])
  const [domain, setDomain] = useState('')
  // Whether the domain warning has been triggered by a send attempt. Kept out of
  // the live typing path so the warning only appears once the user clicks Send.
  const [attemptedSend, setAttemptedSend] = useState(false)

  useEffect(() => {
    let active = true
    listAllowedDomains()
      .then((domains) => {
        if (!active) return
        setAllowedDomains(domains)
        if (domains.length > 0) setDomain(domains[0])
      })
      .catch(() => {
        // The backend still enforces the domain on submit if this fails to load.
      })
    return () => {
      active = false
    }
  }, [])

  const tokens = useMemo(() => parseEmails(emailsInput), [emailsInput])
  // Bare usernames get the selected default domain appended; anything the user
  // typed with an "@" is left as-is so they can override per address.
  const resolvedEmails = useMemo(
    () => tokens.map((token) => (token.includes('@') || !domain ? token : `${token}@${domain}`)),
    [tokens, domain],
  )
  const invalidEmails = useMemo(
    () => resolvedEmails.filter((email) => !email.includes('@')),
    [resolvedEmails],
  )
  const disallowedEmails = useMemo(() => {
    if (allowedDomains.length === 0) return []
    return resolvedEmails.filter((email) => {
      if (!email.includes('@')) return false
      const emailDomain = email.slice(email.lastIndexOf('@') + 1).toLowerCase()
      return !allowedDomains.includes(emailDomain)
    })
  }, [resolvedEmails, allowedDomains])

  const send = () => {
    if (resolvedEmails.length === 0 || invalidEmails.length > 0 || isSending) return

    // Block send on off-domain addresses and surface the warning; the user fixes
    // them and clicks again rather than creating invites that can never sign in.
    if (disallowedEmails.length > 0) {
      setAttemptedSend(true)
      return
    }

    setIsSending(true)
    setError(null)

    inviteMembers(resolvedEmails, role)
      .then((rows) => {
        onInvited(rows)
        if (rows.every((row) => row.status === 'Invited')) {
          onClose()
          return
        }
        setResults(rows)
        setIsSending(false)
      })
      .catch((inviteError) => {
        setError(memberApiErrorMessage(inviteError, 'Could not send the invites. Please try again.'))
        setIsSending(false)
      })
  }

  if (results) {
    return (
      <Modal title="Invite results" subtitle="Some addresses need attention." onClose={onClose}>
        <div className="mb-3 max-h-[260px] overflow-y-auto rounded-[10px] border-[1.5px] border-navy/[0.08]">
          {results.map((row, index) => (
            <div
              key={`${row.email}-${index}`}
              className="flex items-start justify-between gap-3 border-b border-navy/[0.08] px-3 py-2 text-[12.5px] last:border-b-0"
            >
              <span className="truncate font-medium text-navy">{row.email}</span>
              <span
                className={`flex-shrink-0 text-right ${
                  row.status === 'Invited' ? 'text-[#1E8A57]' : 'text-red'
                }`}
                title={row.message ?? undefined}
              >
                {ROW_STATUS_DISPLAY[row.status]}
              </span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-full bg-navy py-2.5 font-display text-[13px] font-semibold text-cream"
        >
          Done
        </button>
      </Modal>
    )
  }

  return (
    <Modal
      title="Invite members"
      subtitle="They'll get an email invite to join this workspace. Separate multiple emails with commas."
      onClose={onClose}
    >
      <div className="mb-3">
        <label className="mb-1.5 block font-display text-[11.5px] font-semibold text-navy/70">
          Email addresses
        </label>
        <textarea
          rows={3}
          className="w-full resize-none rounded-[10px] border-[1.5px] border-navy/[0.08] px-3 py-[9px] text-[13px] text-navy outline-none focus:border-brand"
          placeholder={domain ? `alice, bob (adds @${domain})` : 'name@company.com, other@company.com'}
          value={emailsInput}
          onChange={(event) => {
            setEmailsInput(event.target.value)
            setAttemptedSend(false)
          }}
        />
        {allowedDomains.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <label className="font-display text-[11.5px] font-semibold text-navy/70">Domain</label>
            <select
              className="rounded-[10px] border-[1.5px] border-navy/[0.08] bg-white px-2.5 py-1.5 text-[12.5px] text-navy outline-none focus:border-brand"
              value={domain}
              onChange={(event) => {
                setDomain(event.target.value)
                setAttemptedSend(false)
              }}
            >
              {allowedDomains.map((allowed) => (
                <option key={allowed} value={allowed}>
                  @{allowed}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-navy/45">added to names without an @</span>
          </div>
        )}
        <div className="mt-1 min-h-[16px] text-[11.5px]">
          {invalidEmails.length > 0 ? (
            <span className="text-red">
              Not a valid email: {invalidEmails.join(', ')}
            </span>
          ) : tokens.length > 1 ? (
            <span className="text-navy/50">{tokens.length} addresses</span>
          ) : null}
        </div>
        {attemptedSend && disallowedEmails.length > 0 && (
          <div className="mt-2 rounded-[10px] bg-[#B8860B]/[0.10] px-3 py-2 text-[11.5px] leading-[1.5] text-[#8A6400]">
            {disallowedEmails.join(', ')} {disallowedEmails.length === 1 ? 'is' : 'are'} outside{' '}
            {allowedDomains.map((allowed) => `@${allowed}`).join(', ')} and can't sign in. Remove or
            fix {disallowedEmails.length === 1 ? 'it' : 'them'} to continue.
          </div>
        )}
      </div>
      <div className="mb-3">
        <label className="mb-1.5 block font-display text-[11.5px] font-semibold text-navy/70">Role</label>
        <select
          className="w-full rounded-[10px] border-[1.5px] border-navy/[0.08] bg-white px-3 py-[9px] text-[13px] text-navy outline-none focus:border-brand"
          value={role}
          onChange={(event) => setRole(event.target.value as Role)}
        >
          <option value="Member">Member</option>
          <option value="Admin">Admin</option>
        </select>
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
          type="button"
          disabled={isSending || tokens.length === 0 || invalidEmails.length > 0}
          onClick={send}
          className="flex-1 rounded-full bg-brand py-2.5 font-display text-[13px] font-semibold text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSending ? 'Sending…' : tokens.length > 1 ? `Send ${tokens.length} invites` : 'Send invite'}
        </button>
      </div>
    </Modal>
  )
}
