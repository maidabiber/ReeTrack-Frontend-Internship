import { useMemo, useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { Modal } from '../components/ui/Modal'
import { Pill } from '../components/ui/Pill'
import { SEED_MEMBERS } from '../api/users'
import type { Role, User, UserStatus } from '../types/user'

type RoleFilter = 'all' | Role
type StatusFilter = 'all' | UserStatus
type OpenFilter = 'role' | 'status' | null

const STATUS_DISPLAY: Record<UserStatus, string> = {
  Active: 'Active',
  Invited: 'Invited',
  Disabled: 'Deactivated',
}

const ROLE_DOT: Record<Role, string> = {
  Admin: 'bg-purple',
  Member: 'bg-navy/45',
}

const STATUS_DOT: Record<UserStatus, string> = {
  Active: 'bg-[#1E8A57]',
  Invited: 'bg-[#B8860B]',
  Disabled: 'bg-navy/35',
}

const GRID = 'grid grid-cols-[2fr_2.2fr_0.9fr_0.9fr_0.7fr_32px] items-center gap-2.5 px-3.5 py-2'

/**
 * RT-271 — Members / user management screen. Lists everyone with access to the
 * workspace, with role/status filters, search, inline rate editing, per-row
 * actions and an invite modal. Data is seeded locally until the backend user
 * endpoints exist (see api/users.ts).
 */
export default function MembersPage() {
  const [members, setMembers] = useState<User[]>(SEED_MEMBERS)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [openFilter, setOpenFilter] = useState<OpenFilter>(null)
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null)
  const [editingRateId, setEditingRateId] = useState<string | null>(null)
  const [rateDraft, setRateDraft] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)

  const closeMenus = () => {
    setOpenFilter(null)
    setOpenRowMenuId(null)
  }

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

  const updateMember = (id: string, patch: Partial<User>) => {
    setMembers((current) => current.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }

  const commitRate = () => {
    if (editingRateId === null) return
    const parsed = Number.parseFloat(rateDraft)
    const rate = rateDraft.trim() === '' || Number.isNaN(parsed) ? null : Math.max(0, parsed)
    updateMember(editingRateId, { rate })
    setEditingRateId(null)
    setRateDraft('')
  }

  const startEditRate = (member: User) => {
    if (editingRateId !== null && editingRateId !== member.id) commitRate()
    setEditingRateId(member.id)
    setRateDraft(member.rate !== null ? String(member.rate) : '')
  }

  const sendInvite = (email: string, role: Role) => {
    const trimmed = email.trim()
    if (!trimmed) return
    const displayName = trimmed.split('@')[0]
    setMembers((current) => [
      ...current,
      {
        id: `invite-${Date.now()}`,
        email: trimmed,
        displayName,
        avatarUrl: null,
        role,
        status: 'Invited',
        rate: null,
        emailVerified: false,
        lastLoginAtUtc: null,
      },
    ])
    setInviteOpen(false)
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 px-8 py-6" onClick={closeMenus}>
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
          className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-purple px-[18px] py-[9px] font-display text-[13px] font-semibold text-cream hover:bg-[#5B2FE0]"
        >
          <Icon name="plus" className="h-[13px] w-[13px]" />
          Invite members
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-2">
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

        <label className="flex min-w-[180px] max-w-[280px] flex-1 items-center gap-1.5 rounded-full border-[1.5px] border-navy/[0.08] bg-white px-3.5 py-[7px] focus-within:border-purple">
          <Icon name="search" className="h-3.5 w-3.5 flex-shrink-0 text-navy/50" />
          <input
            className="w-full border-none bg-transparent text-[13px] text-navy outline-none placeholder:text-navy/45"
            placeholder="Search members..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onClick={(event) => event.stopPropagation()}
          />
        </label>
      </div>

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
          {filtered.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              menuOpen={openRowMenuId === member.id}
              isEditingRate={editingRateId === member.id}
              rateDraft={rateDraft}
              onToggleMenu={(event) => {
                event.stopPropagation()
                setOpenRowMenuId(openRowMenuId === member.id ? null : member.id)
                setOpenFilter(null)
              }}
              onToggleRole={() => {
                updateMember(member.id, { role: member.role === 'Admin' ? 'Member' : 'Admin' })
                setOpenRowMenuId(null)
              }}
              onToggleActive={() => {
                updateMember(member.id, {
                  status: member.status === 'Disabled' ? 'Active' : 'Disabled',
                })
                setOpenRowMenuId(null)
              }}
              onResend={() => setOpenRowMenuId(null)}
              onStartEditRate={() => startEditRate(member)}
              onRateDraftChange={setRateDraft}
              onCommitRate={commitRate}
              onCancelRate={() => {
                setEditingRateId(null)
                setRateDraft('')
              }}
            />
          ))}

          {filtered.length === 0 && (
            <div className="px-5 py-10 text-center text-[13px] text-navy/50">
              No members match your search or filters.
            </div>
          )}
        </div>
      </div>

      {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} onSend={sendInvite} />}
    </div>
  )
}

function HeaderCell({ icon, label }: { icon: Parameters<typeof Icon>[0]['name']; label: string }) {
  return (
    <div className="flex items-center gap-1.5 py-1.5 font-display text-[10.5px] font-bold tracking-[0.05em] text-navy/60 uppercase">
      <Icon name={icon} className="h-3 w-3 text-purple" />
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
        className="flex items-center gap-1.5 rounded-full border-[1.5px] border-navy/[0.08] bg-white px-3.5 py-[7px] font-display text-[12.5px] font-semibold text-navy hover:border-purple-soft"
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
              className={`flex w-full items-center rounded-md px-2.5 py-[7px] text-left text-[12.5px] hover:bg-cream-card ${
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
  isEditingRate,
  rateDraft,
  onToggleMenu,
  onToggleRole,
  onToggleActive,
  onResend,
  onStartEditRate,
  onRateDraftChange,
  onCommitRate,
  onCancelRate,
}: {
  member: User
  menuOpen: boolean
  isEditingRate: boolean
  rateDraft: string
  onToggleMenu: (event: React.MouseEvent) => void
  onToggleRole: () => void
  onToggleActive: () => void
  onResend: () => void
  onStartEditRate: () => void
  onRateDraftChange: (value: string) => void
  onCommitRate: () => void
  onCancelRate: () => void
}) {
  const initials = (member.displayName ?? member.email)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div className={`${GRID} hover:bg-cream-card`}>
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-[9px] bg-cream-card font-display text-[10.5px] font-bold text-navy">
          {initials}
        </span>
        <span className="truncate text-[13px] font-semibold">{member.displayName}</span>
      </div>

      <div className="truncate text-[12.5px] text-navy/65">{member.email}</div>

      <Pill label={member.role} dotClassName={ROLE_DOT[member.role]} />
      <Pill label={STATUS_DISPLAY[member.status]} dotClassName={STATUS_DOT[member.status]} />

      <div
        className="-mx-1.5 -my-[3px] cursor-pointer rounded-md px-1.5 py-[3px] hover:bg-cream-card"
        onClick={(event) => {
          event.stopPropagation()
          if (!isEditingRate) onStartEditRate()
        }}
      >
        {isEditingRate ? (
          <input
            autoFocus
            className="w-16 rounded-md border-[1.5px] border-purple px-1.5 py-[3px] text-[13px] font-semibold text-navy outline-none"
            value={rateDraft}
            onChange={(event) => onRateDraftChange(event.target.value)}
            onBlur={onCommitRate}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
              else if (event.key === 'Escape') onCancelRate()
            }}
          />
        ) : (
          <span className={`text-[13px] ${member.rate !== null ? 'font-semibold' : 'font-medium opacity-40'}`}>
            {member.rate !== null ? `$${member.rate}/hr` : 'Set rate'}
          </span>
        )}
      </div>

      <div className="relative flex justify-end">
        <button
          type="button"
          onClick={onToggleMenu}
          aria-label="Row actions"
          className="flex h-6 w-6 items-center justify-center rounded-md text-navy/50 hover:bg-cream-card hover:text-navy"
        >
          <Icon name="more" className="h-[15px] w-[15px]" />
        </button>
        {menuOpen && (
          <div className="absolute top-[calc(100%+4px)] right-0 z-30 min-w-[170px] rounded-[14px] bg-white p-[5px] shadow-[0_16px_36px_rgba(31,43,77,0.16)]">
            <RowMenuItem icon="settings" label={member.role === 'Admin' ? 'Make member' : 'Make admin'} onClick={onToggleRole} />
            {member.status === 'Invited' && (
              <RowMenuItem icon="resend" label="Resend invite" onClick={onResend} />
            )}
            <RowMenuItem
              icon="ban"
              label={member.status === 'Disabled' ? 'Reactivate' : 'Deactivate'}
              danger
              onClick={onToggleActive}
            />
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
  onClick,
}: {
  icon: Parameters<typeof Icon>[0]['name']
  label: string
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[12.5px] font-medium hover:bg-cream-card ${
        danger ? 'text-red' : 'text-navy'
      }`}
    >
      <Icon name={icon} className={`h-[13px] w-[13px] ${danger ? 'opacity-80' : 'opacity-65'}`} />
      {label}
    </button>
  )
}

function InviteModal({
  onClose,
  onSend,
}: {
  onClose: () => void
  onSend: (email: string, role: Role) => void
}) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('Member')

  return (
    <Modal
      title="Invite a member"
      subtitle="They'll get an email invite to join this workspace."
      onClose={onClose}
    >
      <div className="mb-3">
        <label className="mb-1.5 block font-display text-[11.5px] font-semibold text-navy/70">
          Email address
        </label>
        <input
          className="w-full rounded-[10px] border-[1.5px] border-navy/[0.08] px-3 py-[9px] text-[13px] text-navy outline-none focus:border-purple"
          placeholder="name@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className="mb-3">
        <label className="mb-1.5 block font-display text-[11.5px] font-semibold text-navy/70">Role</label>
        <select
          className="w-full rounded-[10px] border-[1.5px] border-navy/[0.08] bg-white px-3 py-[9px] text-[13px] text-navy outline-none focus:border-purple"
          value={role}
          onChange={(event) => setRole(event.target.value as Role)}
        >
          <option value="Member">Member</option>
          <option value="Admin">Admin</option>
        </select>
      </div>
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
          onClick={() => onSend(email, role)}
          className="flex-1 rounded-full bg-purple py-2.5 font-display text-[13px] font-semibold text-cream hover:bg-[#5B2FE0]"
        >
          Send invite
        </button>
      </div>
    </Modal>
  )
}
