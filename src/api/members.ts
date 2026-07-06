import type { Role, User, UserStatus } from '../types/user'
import { ROLE_IDS } from '../types/user'
import { apiClient } from './client'

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

function toMember(response: MemberResponse): Member {
  return {
    id: response.id,
    email: response.email,
    displayName: response.displayName,
    avatarUrl: response.avatarUrl,
    role: response.role === 'Admin' ? 'Admin' : 'Member',
    status: (response.status as UserStatus) ?? 'Active',
    rate: null, // no backend support yet (RT-61)
    emailVerified: response.emailVerified,
    lastLoginAtUtc: response.lastLoginAtUtc,
    pendingInvitationId: response.pendingInvitationId,
  }
}

export function listMembers(): Promise<Member[]> {
  return apiClient
    .get<MemberResponse[]>('/members')
    .then((members) => members.map(toMember))
}

export function inviteMember(email: string, role: Role): Promise<Member> {
  return apiClient
    .post<CreateInvitationResponse>('/invitations', { email, roleId: ROLE_IDS[role] })
    .then((response) => toMember(response.member))
}

export function resendInvite(invitationId: string): Promise<void> {
  return apiClient.post(`/invitations/${invitationId}/resend`).then(() => undefined)
}

export function previewInvitation(token: string): Promise<InvitationPreview> {
  return apiClient.get<InvitationPreview>(
    `/invitations/preview?token=${encodeURIComponent(token)}`,
  )
}

/** Extracts the backend's `{ message }` error body, falling back to a default. */
export function memberApiErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'body' in error) {
    const body = (error as { body: unknown }).body
    if (body && typeof body === 'object' && 'message' in body) {
      const message = (body as { message: unknown }).message
      if (typeof message === 'string' && message.length > 0) return message
    }
  }
  return fallback
}
