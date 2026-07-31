/**
 * Typed fetch wrapper for the ReeTrack backend.
 *
 * Base URL comes from VITE_API_BASE_URL (defaults to the relative "/api" path,
 * which vite.config.ts proxies to the backend during local development).
 */

import { clearSession } from '../lib/authSession'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, message: string, body: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  /** JSON-serialisable request body; sets the Content-Type header automatically. */
  body?: unknown
}

export interface BlobDownload {
  blob: Blob
  /** Filename from Content-Disposition when the server provides one. */
  filename: string | null
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const payload = await parseBody(response)

  if (!response.ok) {
    if (response.status === 401) {
      clearSession()
    }

    throw new ApiError(response.status, response.statusText, payload)
  }

  return payload as T
}

/**
 * Binary download helper (exports). Keeps credentials:'include' and surfaces
 * API errors through ApiError so a 403 shows a message instead of a bogus file.
 */
export async function requestBlob(path: string, options: RequestOptions = {}): Promise<BlobDownload> {
  const { body, headers, ...rest } = options

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      Accept: '*/*',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    if (response.status === 401) {
      clearSession()
    }

    const payload = await parseBody(response)
    throw new ApiError(response.status, response.statusText, payload)
  }

  const blob = await response.blob()
  const filename = parseContentDispositionFilename(response.headers.get('Content-Disposition'))
  return { blob, filename }
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return response.json()
  }
  return response.text()
}

/** Pulls filename / filename* from a Content-Disposition header. */
export function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) return null

  const utf8 = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header)
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1].trim().replace(/^"|"$/g, ''))
    } catch {
      return utf8[1].trim().replace(/^"|"$/g, '')
    }
  }

  const plain = /filename\s*=\s*("?)([^";]+)\1/i.exec(header)
  return plain?.[2]?.trim() ?? null
}

/**
 * Extracts a human-readable message from an API error: the backend's RFC 7807
 * ProblemDetails `message` (falling back to `title`/`detail`, or a raw string
 * body), a friendlier message for network failures, or the given fallback.
 * Canonical version of the per-module `*ApiErrorMessage` helpers, which now
 * just delegate here.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'body' in error) {
    const body = (error as { body: unknown }).body
    if (typeof body === 'string' && body.length > 0) return body

    if (body && typeof body === 'object') {
      for (const key of ['message', 'title', 'detail'] as const) {
        const value = (body as Record<string, unknown>)[key]
        if (typeof value === 'string' && value.length > 0) return value
      }
    }
  }

  if (error instanceof Error && error.message) {
    if (error.message === 'Failed to fetch') {
      return 'Could not reach the server. Make sure the backend is running.'
    }

    return error.message
  }

  return fallback
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
}
