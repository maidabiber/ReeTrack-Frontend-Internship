import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { UserAvatar } from '../components/ui/UserAvatar'
import { Modal } from '../components/ui/Modal'
import {
  DirectoryHeader,
  DirectorySearch,
  LoadErrorState,
  NoticeBanner,
  SegmentedTabs,
} from '../components/directory/DirectoryControls'
import {
  HeaderCell,
  RowMenu,
  RowMenuItem,
  SkeletonRow,
  StatusMark,
} from '../components/directory/DirectoryTable'
import { riseDelay } from '../components/directory/directoryChrome'
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
import {
  downloadInviteCsvTemplate,
  MAX_INVITE_BATCH,
  parseEmails,
  parseInviteCsv,
} from '../lib/parseInviteCsv'
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

/* Role/status are plain text, told apart by colour and weight only — no
 * badge chrome. Admin carries weight; statuses carry a quiet semantic hue. */
const ROLE_COLOR: Record<Role, string> = {
  Admin: 'font-semibold text-brand-hi',
  Member: 'text-navy/60',
}

const STATUS_COLOR: Record<UserStatus, string> = {
  Active: 'text-[#1E8A57]',
  Invited: 'text-brand',
  Disabled: 'text-navy/45',
}

const INVITE_STATUS_COLOR: Record<InvitationStatus, string> = {
  Pending: 'text-brand',
  Accepted: 'text-[#1E8A57]',
  Revoked: 'text-navy/45',
  Expired: 'text-red/80',
}

const GRID = 'grid grid-cols-[2fr_2.2fr_0.9fr_0.9fr_0.7fr_32px] items-center gap-2.5 px-3.5 py-2'
const INVITE_GRID =
  'grid grid-cols-[2.2fr_0.8fr_1fr_1.5fr_1fr_1fr_32px] items-center gap-2.5 px-3.5 py-2'

/**
 * RT-271/RT-216/RT-217 — Members & invitations management. Lists everyone with
 * access via GET /api/members with working role change and (de)activation
 * (PATCH /api/members/{id}); the Invitations view shows the full invitation
 * history (GET /api/invitations) with resend and revoke. Invites accept
 * multiple comma-separated emails or a CSV upload via POST /api/invitations/batch
 * (RT-275 / CSV batch invite).
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
      <div className="mx-auto flex w-full max-w-page flex-col gap-4">
      <DirectoryHeader
        title="Members"
        count={view === 'members' && !isLoading && !loadError ? filtered.length : null}
        actionLabel="Invite members"
        onAction={(event) => {
          event.stopPropagation()
          setInviteOpen(true)
        }}
      />

      {notice && <NoticeBanner>{notice}</NoticeBanner>}

      <div className="flex flex-wrap items-center gap-2">
        <SegmentedTabs
          options={[
            { value: 'members', label: 'Members' },
            { value: 'invitations', label: 'Invitations' },
          ]}
          value={view}
          onChange={setView}
        />

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

            <DirectorySearch placeholder="Search members..." value={search} onChange={setSearch} />
          </>
        )}
      </div>

      {view === 'members' ? (
        <div className="rounded-2xl bg-white shadow-card">
          <div className={`${GRID} border-b border-navy/[0.08]`}>
            <HeaderCell icon="members" label="Name" />
            <HeaderCell icon="mail" label="Email" />
            <HeaderCell icon="shield" label="Role" />
            <HeaderCell icon="check-badge" label="Status" />
            <HeaderCell icon="billable" label="Rate" />
            <span />
          </div>

          <div className="divide-y divide-navy/[0.08]">
            {isLoading && <SkeletonRows />}

            {!isLoading && loadError && (
              <LoadErrorState
                message={loadError}
                onRetry={() => {
                  setIsLoading(true)
                  setLoadError(null)
                  setReloadKey((key) => key + 1)
                }}
              />
            )}

            {!isLoading &&
              !loadError &&
              filtered.map((member, index) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  index={index}
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
              <div className="px-5 py-10 text-center text-body text-navy/50">
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

/** Ghost rows while members load, matching the real grid's geometry. */
function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }, (_, index) => (
        <SkeletonRow key={index} gridClassName={GRID} index={index}>
          <div className="flex items-center gap-2.5">
            <span className="h-[26px] w-[26px] flex-shrink-0 rounded-full bg-surface-muted" />
            <span className="h-3 w-24 rounded-full bg-navy/10" />
          </div>
          <span className="h-3 w-40 rounded-full bg-navy/[0.07]" />
          <span className="h-3 w-14 rounded-full bg-navy/[0.07]" />
          <span className="h-3 w-14 rounded-full bg-navy/[0.07]" />
          <span className="h-3 w-10 rounded-full bg-navy/[0.07]" />
          <span />
        </SkeletonRow>
      ))}
    </>
  )
}

/** Ghost rows while invitations load, matching the invitation grid. */
function InvitationSkeletonRows() {
  return (
    <>
      {Array.from({ length: 4 }, (_, index) => (
        <SkeletonRow key={index} gridClassName={INVITE_GRID} index={index}>
          <span className="h-3 w-40 rounded-full bg-navy/10" />
          <span className="h-3 w-12 rounded-full bg-navy/[0.07]" />
          <span className="h-3 w-14 rounded-full bg-navy/[0.07]" />
          <span className="h-3 w-24 rounded-full bg-navy/[0.07]" />
          <span className="h-3 w-16 rounded-full bg-navy/[0.07]" />
          <span className="h-3 w-16 rounded-full bg-navy/[0.07]" />
          <span />
        </SkeletonRow>
      ))}
    </>
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
  const isFiltering = value !== 'all'
  return (
    <div className="relative">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onToggle()
        }}
        className={`flex items-center gap-1.5 rounded-full px-3.5 py-compact font-mono text-eyebrow font-medium tracking-[0.12em] uppercase shadow-soft transition-colors ${
          isFiltering ? 'bg-navy text-cream' : 'bg-white text-navy/55 hover:text-navy'
        }`}
      >
        {label}
        <Icon name="chevron-down" className="h-3 w-3 opacity-60" />
      </button>
      {isOpen && (
        <div className="absolute top-[calc(100%+4px)] left-0 z-20 min-w-[140px] rounded-xl bg-white/80 p-menu shadow-dropdown backdrop-blur-xl">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onSelect(option.value)
              }}
              className={`flex w-full items-center rounded-xs px-2.5 py-compact text-left text-caption hover:bg-surface-muted ${
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
  index,
  menuOpen,
  onToggleMenu,
  onResend,
  onRevoke,
  onToggleRole,
  onToggleActive,
}: {
  member: Member
  index: number
  menuOpen: boolean
  onToggleMenu: (event: React.MouseEvent) => void
  onResend: () => void
  onRevoke: () => void
  onToggleRole: () => void
  onToggleActive: () => void
}) {
  const hasPendingInvite = member.status === 'Invited' && member.pendingInvitationId !== null

  return (
    <div
      className={`${GRID} transition-colors hover:bg-surface-muted/60 motion-safe:animate-rise`}
      style={riseDelay(index)}
    >
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

      <StatusMark label={member.role} colorClassName={ROLE_COLOR[member.role]} />
      <StatusMark label={STATUS_DISPLAY[member.status]} colorClassName={STATUS_COLOR[member.status]} />

      {/* Rates wait on RT-61; display-only until then. */}
      <span
        className={`font-mono text-caption tabular-nums ${member.rate !== null ? 'font-medium' : 'font-normal opacity-40'}`}
        title="Rates are coming with billing (RT-61)."
      >
        {member.rate !== null ? `$${member.rate}/hr` : '—'}
      </span>

      <RowMenu open={menuOpen} onToggle={onToggleMenu}>
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
      </RowMenu>
    </div>
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
    <div className="rounded-2xl bg-white shadow-card">
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
        {isLoading && <InvitationSkeletonRows />}

        {!isLoading && loadError && (
          <div className="px-5 py-10 text-center text-body text-red">{loadError}</div>
        )}

        {!isLoading &&
          !loadError &&
          invitations.map((invitation, index) => {
            const isActionable = invitation.status === 'Pending' || invitation.status === 'Expired'
            return (
              <div
                key={invitation.id}
                className={`${INVITE_GRID} transition-colors hover:bg-surface-muted/60 motion-safe:animate-rise`}
                style={riseDelay(index)}
              >
                <div className="truncate text-md font-semibold">{invitation.email}</div>
                <StatusMark label={invitation.role} colorClassName={ROLE_COLOR[invitation.role]} />
                <StatusMark
                  label={invitation.status}
                  colorClassName={INVITE_STATUS_COLOR[invitation.status]}
                />
                <div className="truncate text-caption text-navy/65">{invitation.invitedByName}</div>
                <div className="text-sm text-navy/65">{formatDate(invitation.createdAtUtc)}</div>
                <div className="text-sm text-navy/65">
                  {invitation.status === 'Accepted' && invitation.acceptedAtUtc
                    ? `Joined ${formatDate(invitation.acceptedAtUtc)}`
                    : formatDate(invitation.expiresAtUtc)}
                </div>

                {isActionable ? (
                  <RowMenu
                    open={openRowMenuId === invitation.id}
                    onToggle={(event) => {
                      event.stopPropagation()
                      onToggleRowMenu(invitation.id)
                    }}
                    ariaLabel="Invitation actions"
                  >
                    <RowMenuItem icon="resend" label="Resend invite" onClick={() => handleResend(invitation)} />
                    <RowMenuItem icon="ban" label="Revoke invite" danger onClick={() => handleRevoke(invitation)} />
                  </RowMenu>
                ) : (
                  <span />
                )}
              </div>
            )
          })}

        {!isLoading && !loadError && invitations.length === 0 && (
          <div className="px-5 py-10 text-center text-body text-navy/50">
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

const ROW_STATUS_DISPLAY: Record<BatchInviteRow['status'], string> = {
  Invited: 'Invite sent',
  AlreadyActive: 'Already a member',
  Invalid: 'Invalid address',
  EmailFailed: 'Email failed — use resend',
  Duplicate: 'Duplicate in this list',
}

const ROW_STATUS_CLASS: Record<BatchInviteRow['status'], string> = {
  Invited: 'text-[#1E8A57]',
  AlreadyActive: 'text-navy/55',
  Invalid: 'text-red',
  EmailFailed: 'text-red',
  Duplicate: 'text-navy/55',
}

function inviteResultsSubtitle(rows: BatchInviteRow[]): string {
  const invited = rows.filter((row) => row.status === 'Invited').length
  const skipped = rows.length - invited
  if (invited === 0) return 'None of these invites could be sent.'
  if (skipped === 0) return 'All invites were sent.'
  return `${invited} sent · ${skipped} need${skipped === 1 ? 's' : ''} a look`
}

/**
 * RT-275 — invite one or many people at once: emails are comma (or newline)
 * separated, or loaded from a CSV, and submitted as a single batch with
 * per-address results.
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
  const [csvNotice, setCsvNotice] = useState<string | null>(null)
  const [csvFileName, setCsvFileName] = useState<string | null>(null)
  const [results, setResults] = useState<BatchInviteRow[] | null>(null)
  const [allowedDomains, setAllowedDomains] = useState<string[]>([])
  const [domain, setDomain] = useState('')
  // Whether the domain warning has been triggered by a send attempt. Kept out of
  // the live typing path so the warning only appears once the user clicks Send.
  const [attemptedSend, setAttemptedSend] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
  const overBatchLimit = resolvedEmails.length > MAX_INVITE_BATCH

  const loadCsvFile = (file: File) => {
    setError(null)
    setCsvNotice(null)
    setCsvFileName(null)
    setAttemptedSend(false)

    const reader = new FileReader()
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : ''
      const parsed = parseInviteCsv(text)
      if (parsed.length === 0) {
        setCsvNotice('No email addresses found in that CSV.')
        return
      }
      setEmailsInput(parsed.join('\n'))
      if (parsed.length <= MAX_INVITE_BATCH) {
        setCsvFileName(file.name)
      }
    }
    reader.onerror = () => {
      setCsvNotice('Could not read that file. Try exporting again as CSV.')
    }
    reader.readAsText(file)
  }

  const send = () => {
    if (resolvedEmails.length === 0 || invalidEmails.length > 0 || overBatchLimit || isSending) return

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
      <Modal title="Invite results" subtitle={inviteResultsSubtitle(results)} onClose={onClose}>
        <ul className="mb-3 max-h-[260px] space-y-2 overflow-y-auto">
          {results.map((row, index) => (
            <li
              key={`${row.email}-${index}`}
              className="rounded-md bg-surface-muted px-3 py-2.5"
              title={row.message ?? undefined}
            >
              <p className="truncate font-mono text-sm text-navy">{row.email}</p>
              <p className={`mt-0.5 text-sm ${ROW_STATUS_CLASS[row.status]}`}>
                {ROW_STATUS_DISPLAY[row.status]}
              </p>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-full bg-navy py-2.5 font-display text-body font-semibold text-cream"
        >
          Done
        </button>
      </Modal>
    )
  }

  return (
    <Modal
      title="Invite members"
      subtitle="They'll get an email invite to join this workspace. Paste emails or upload a CSV."
      onClose={onClose}
    >
      <div className="mb-3">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <label className="font-display text-label font-semibold text-navy/70">Email addresses</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={downloadInviteCsvTemplate}
              className="font-display text-label font-semibold text-navy/55 transition-colors hover:text-navy"
            >
              Download template
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="font-display text-label font-semibold text-brand transition-colors hover:text-brand-deep"
            >
              Upload CSV
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file) loadCsvFile(file)
              }}
            />
          </div>
        </div>
        <textarea
          rows={Math.min(8, Math.max(3, resolvedEmails.length || 3))}
          className="w-full resize-y rounded-md border-control border-navy/[0.08] px-3 py-field font-mono text-sm text-navy outline-none focus:border-brand"
          placeholder={domain ? `alice, bob (adds @${domain})` : 'name@company.com, other@company.com'}
          value={emailsInput}
          onChange={(event) => {
            setEmailsInput(event.target.value)
            setAttemptedSend(false)
            setCsvNotice(null)
            setCsvFileName(null)
          }}
        />
        {allowedDomains.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <label className="font-display text-label font-semibold text-navy/70">Domain</label>
            <select
              className="rounded-md border-control border-navy/[0.08] bg-white px-2.5 py-1.5 text-sm text-navy outline-none focus:border-brand"
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
            <span className="text-xs text-navy/45">added to names without an @</span>
          </div>
        )}
        <div className="mt-1.5 min-h-[16px] text-sm">
          {invalidEmails.length > 0 ? (
            <span className="text-red">Not a valid email: {invalidEmails.join(', ')}</span>
          ) : overBatchLimit ? (
            <span className="text-red">
              You can invite up to {MAX_INVITE_BATCH} people at a time. Remove a few and try again.
            </span>
          ) : csvNotice ? (
            <span className="text-red">{csvNotice}</span>
          ) : tokens.length > 0 ? (
            <span className="text-navy/50">
              {tokens.length} address{tokens.length === 1 ? '' : 'es'}
              {csvFileName ? ` from ${csvFileName}` : ''}
            </span>
          ) : null}
        </div>
        {attemptedSend && disallowedEmails.length > 0 && (
          <div className="mt-2 rounded-md bg-[#B8860B]/[0.10] px-3 py-2 text-sm leading-[1.5] text-[#8A6400]">
            {disallowedEmails.join(', ')} {disallowedEmails.length === 1 ? 'is' : 'are'} outside{' '}
            {allowedDomains.map((allowed) => `@${allowed}`).join(', ')} and can't sign in. Remove or
            fix {disallowedEmails.length === 1 ? 'it' : 'them'} to continue.
          </div>
        )}
      </div>
      <div className="mb-3">
        <label className="mb-1.5 block font-display text-label font-semibold text-navy/70">Role</label>
        <select
          className="w-full rounded-md border-control border-navy/[0.08] bg-white px-3 py-field text-body text-navy outline-none focus:border-brand"
          value={role}
          onChange={(event) => setRole(event.target.value as Role)}
        >
          <option value="Member">Member</option>
          <option value="Admin">Admin</option>
        </select>
      </div>

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
          type="button"
          disabled={isSending || tokens.length === 0 || invalidEmails.length > 0 || overBatchLimit}
          onClick={send}
          className="flex-1 rounded-full bg-brand py-2.5 font-display text-body font-semibold text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSending ? 'Sending…' : tokens.length > 1 ? `Send ${tokens.length} invites` : 'Send invite'}
        </button>
      </div>
    </Modal>
  )
}
