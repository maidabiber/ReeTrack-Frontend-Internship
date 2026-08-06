import type { AuthSession, AuthenticatedUserResponse } from '../types/auth'
import { toSessionUser } from '../lib/authSession'
import { apiClient } from './client'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

function toAuthSession(apiUser: AuthenticatedUserResponse): AuthSession {
  return { user: toSessionUser(apiUser) }
}

export function googleLoginUrl(returnUrl: string): string {
  const params = new URLSearchParams({ returnUrl })
  return `${API_BASE_URL}/auth/google?${params.toString()}`
}

export function getCurrentUser(): Promise<AuthSession> {
  return apiClient
    .get<AuthenticatedUserResponse>('/auth/me')
    .then((apiUser) => toAuthSession(apiUser))
}

export function completeOnboarding(): Promise<void> {
  return apiClient.post('/auth/onboarding-complete').then(() => undefined)
}

export function signOut(): Promise<void> {
  return apiClient.post('/auth/logout').then(() => undefined)
}

export function getAuthErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'body' in error) {
    const body = (error as { body: unknown }).body
    if (body && typeof body === 'object' && 'message' in body) {
      const message = (body as { message: unknown }).message
      if (typeof message === 'string' && message.length > 0) return message
    }
  }

  if (error instanceof Error && error.message) return error.message
  return 'Something went wrong while signing in. Please try again.'
}
