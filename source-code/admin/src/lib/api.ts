/*
  Typed fetch wrapper — the portal's one seam onto the NestJS API. Attaches the
  JWT, throws a typed ApiError on failure, and notifies AuthContext on a 401 so
  the session can be torn down. Every service module (`src/services/*.ts`) goes
  through this instead of calling `fetch` directly.
*/

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const TOKEN_KEY = 'harboost.token'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

let onUnauthorized: (() => void) | null = null

/** Registered once by AuthContext so a 401 anywhere logs the session out. */
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers })
  } catch {
    // fetch rejects at the network layer (server down, DNS, CORS) — surface it as a
    // typed ApiError so callers' `instanceof ApiError` handling gives a clear message.
    throw new ApiError(0, 'Unable to reach the server. Please make sure the backend is running and try again.')
  }

  if (res.status === 401) {
    onUnauthorized?.()
  }

  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null)
    const message =
      body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
        ? body.message
        : res.statusText
    throw new ApiError(res.status, message)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
