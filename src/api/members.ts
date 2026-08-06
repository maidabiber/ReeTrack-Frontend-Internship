import type { InvitationStatus, Role, User, UserStatus } from '../types/user'
import { parseRole, ROLE_IDS } from '../types/user'
import type { PagedResult } from '../types/paged'
import { apiClient } from './client'
import {
  appendListQueryParams,
  type ListQueryOptions,
  toPagedResult,
} from './pagination'

/**
 * Members and invitations API (MembersController / InvitationsController).
 * Replaces the seed data previously in api/users.ts.
 */

/** Mirrors backend MemberResponse. */
interface MemberResponse {
  id: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  role: string
  roleId: number
  status: string
  emailVerified: boolean
  lastLoginAtUtc: string | null
  pendingInvitationId: string | null
  hourTargetMode: string | null
  hourTargetHours: number | null
}

interface CreateInvitationResponse {
  member: MemberResponse
}

/** Mirrors backend InvitationPreviewResponse. */
export interface InvitationPreview {
  invitedEmail: string
  inviterName: string
  role: string
  appName: string
}

/** A workspace member row: the shared User shape plus invite bookkeeping. */
export interface Member extends User {
  pendingInvitationId: string | null
}

export type ListMembersOptions = ListQueryOptions

function toMember(response: MemberResponse): Member {
  return {
    id: response.id,
    email: response.email,
    displayName: response.displayName,
    avatarUrl: response.avatarUrl,
    role: parseRole(response.role),
    permissions: [],
    status: (response.status as UserStatus) ?? 'Active',
    rate: null,
    rateCurrencyCode: null,
    hourTargetMode:
      response.hourTargetMode === 'Weekly'
        ? 'Weekly'
        : response.hourTargetMode === 'Daily'
          ? 'Daily'
          : null,
    hourTargetHours: response.hourTargetHours ?? null,
    emailVerified: response.emailVerified,
    lastLoginAtUtc: response.lastLoginAtUtc,
    pendingInvitationId: response.pendingInvitationId,
    hasCompletedOnboarding: false,
  }
}

export function listMembers(options: ListMembersOptions = {}): Promise<PagedResult<Member>> {
  const params = new URLSearchParams()
  appendListQueryParams(params, options)
  const qs = params.toString()

  return apiClient
    .get<PagedResult<MemberResponse>>(`/members${qs ? `?${qs}` : ''}`)
    .then((result) => toPagedResult(result, toMember))
}

export function inviteMember(email: string, role: Role): Promise<Member> {
  return apiClient
    .post<CreateInvitationResponse>('/invitations', { email, roleId: ROLE_IDS[role] })
    .then((response) => toMember(response.member))
}

export function resendInvite(invitationId: string): Promise<void> {
  return apiClient.post(`/invitations/${invitationId}/resend`).then(() => undefined)
}

/** Mirrors backend InvitationListItemResponse; status is the effective status. */
export interface InvitationListItem {
  id: string
  email: string
  role: Role
  status: InvitationStatus
  createdAtUtc: string
  expiresAtUtc: string
  invitedByName: string
  acceptedAtUtc: string | null
}

interface InvitationListItemResponse {
  id: string
  email: string
  role: string
  status: string
  createdAtUtc: string
  expiresAtUtc: string
  invitedByName: string
  acceptedAtUtc: string | null
}

export function listInvitations(): Promise<InvitationListItem[]> {
  return apiClient.get<InvitationListItemResponse[]>('/invitations').then((invitations) =>
    invitations.map((invitation) => ({
      ...invitation,
      role: parseRole(invitation.role),
      status: (invitation.status as InvitationStatus) ?? 'Pending',
    })),
  )
}

interface RevokeInvitationResponse {
  removedUserId: string | null
}

/**
 * Revokes a pending invitation. When the invitee never signed in, the backend
 * also deletes their placeholder user and returns its id so callers can drop
 * the row from member lists.
 */
export function revokeInvite(invitationId: string): Promise<{ removedUserId: string | null }> {
  return apiClient
    .post<RevokeInvitationResponse>(`/invitations/${invitationId}/revoke`)
    .then((response) => ({ removedUserId: response.removedUserId }))
}

export function updateMember(
  memberId: string,
  patch: { roleId?: number; status?: 'Active' | 'Disabled' },
): Promise<Member> {
  return apiClient
    .patch<MemberResponse>(`/members/${memberId}`, patch)
    .then(toMember)
}

export type BatchInviteRowStatus = 'Invited' | 'AlreadyActive' | 'Invalid' | 'EmailFailed' | 'Duplicate'

export interface BatchInviteRow {
  email: string
  status: BatchInviteRowStatus
  message: string | null
  member: Member | null
}

interface BatchInvitationResponse {
  results: {
    email: string
    status: string
    message: string | null
    member: MemberResponse | null
  }[]
}

export function inviteMembers(emails: string[], role: Role): Promise<BatchInviteRow[]> {
  return apiClient
    .post<BatchInvitationResponse>('/invitations/batch', { emails, roleId: ROLE_IDS[role] })
    .then((response) =>
      response.results.map((row) => ({
        email: row.email,
        status: (row.status as BatchInviteRowStatus) ?? 'Invalid',
        message: row.message,
        member: row.member ? toMember(row.member) : null,
      })),
    )
}

/**
 * Email domains allowed to be invited (mirrors the backend SSO domain). An
 * empty list means any domain is allowed. The invite form uses this to warn
 * before submitting; the backend still enforces it on POST /invitations.
 */
export function listAllowedDomains(): Promise<string[]> {
  return apiClient
    .get<{ domains: string[] }>('/invitations/allowed-domains')
    .then((response) => response.domains)
}

export function previewInvitation(token: string): Promise<InvitationPreview> {
  return apiClient.get<InvitationPreview>(
    `/invitations/preview?token=${encodeURIComponent(token)}`,
  )
}
