import type { AuthSession } from '../types/auth'
import type { Role, User } from '../types/user'

const STORAGE_KEY = 'reetrack.user'
const LEGACY_STORAGE_KEY = 'reetrack.auth'

let cachedSession: AuthSession | null | undefined

function readStorage(): AuthSession | null {
  try {
    let raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      raw = localStorage.getItem(LEGACY_STORAGE_KEY)
      if (raw) {
        localStorage.setItem(STORAGE_KEY, raw)
        localStorage.removeItem(LEGACY_STORAGE_KEY)
      }
    }

    if (!raw) return null
    return JSON.parse(raw) as AuthSession
  } catch {
    return null
  }
}

export function loadSession(): AuthSession | null {
  if (cachedSession !== undefined) return cachedSession

  const session = readStorage()
  cachedSession = session
  return session
}

export function saveSession(session: AuthSession): void {
  cachedSession = session
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  localStorage.removeItem(LEGACY_STORAGE_KEY)
}

export function clearSession(): void {
  cachedSession = null
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(LEGACY_STORAGE_KEY)
}

export function primaryRole(roles: string[]): Role {
  return roles.some((role) => role === 'Admin') ? 'Admin' : 'Member'
}

export function toSessionUser(apiUser: {
  id: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  roles: string[]
}): User {
  return {
    id: apiUser.id,
    email: apiUser.email,
    displayName: apiUser.displayName,
    avatarUrl: apiUser.avatarUrl,
    role: primaryRole(apiUser.roles),
    status: 'Active',
    rate: null,
    rateCurrencyCode: null,
    hourTargetMode: null,
    hourTargetHours: null,
    emailVerified: true,
    lastLoginAtUtc: null,
  }
}
