import type { Role, User } from '../types/user'

/**
 * Seed members used while the backend user endpoints are being built. The
 * members screen reads this and mutates a local copy; the functions below are
 * placeholders for the real API calls (apiClient) once they exist.
 */
export const SEED_MEMBERS: User[] = [
  member('u1', 'Reese Sharma', 'reese.sharma@fernhollow.co', 'Admin', 'Active', 65),
  member('u2', 'Marcus Yeoh', 'marcus.yeoh@fernhollow.co', 'Member', 'Active', 40),
  member('u3', 'Priya Shah', 'priya.shah@fernhollow.co', 'Admin', 'Active', 58),
  member('u4', 'Devon Clarke', 'devon.clarke@fernhollow.co', 'Member', 'Invited', null),
  member('u5', 'Lena Ostrowski', 'lena.ostrowski@fernhollow.co', 'Member', 'Active', 45),
  member('u6', 'Théo Bernard', 'theo.bernard@fernhollow.co', 'Member', 'Disabled', 38),
  member('u7', 'Amara Okafor', 'amara.okafor@fernhollow.co', 'Member', 'Active', 42),
  member('u8', 'Julian Voss', 'julian.voss@fernhollow.co', 'Member', 'Invited', null),
  member('u9', 'Nadia Petrov', 'nadia.petrov@fernhollow.co', 'Admin', 'Active', 60),
  member('u10', 'Sam Whitfield', 'sam.whitfield@fernhollow.co', 'Member', 'Active', 35),
  member('u11', 'Grace Odongo', 'grace.odongo@fernhollow.co', 'Member', 'Disabled', 37),
  member('u12', 'Iker Alvarez', 'iker.alvarez@fernhollow.co', 'Member', 'Invited', null),
]

function member(
  id: string,
  displayName: string,
  email: string,
  role: Role,
  status: User['status'],
  rate: number | null,
): User {
  return {
    id,
    email,
    displayName,
    avatarUrl: null,
    role,
    status,
    rate,
    emailVerified: status !== 'Invited',
    lastLoginAtUtc: null,
  }
}

// --- API stubs -------------------------------------------------------------
// These resolve immediately with the seed data for now. Swap the bodies for
// apiClient calls (e.g. apiClient.get('/members')) when the backend is ready.

export function listMembers(): Promise<User[]> {
  return Promise.resolve(SEED_MEMBERS)
}

export function inviteMember(email: string, role: Role): Promise<Invitation> {
  return Promise.resolve({ email, role })
}

export interface Invitation {
  email: string
  role: Role
}
