import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError, getToken, PASSWORD_CHANGE_REQUIRED, setForbiddenHandler, setToken, setUnauthorizedHandler } from '@/lib/api'
import * as authService from '@/services/auth'
import type { ModuleKey, PermissionLevel, User } from '@/types'
import { DEFAULT_PERMISSIONS, meets } from './permissions'

interface AuthContextValue {
  user: User | null
  /** True until the initial session hydration (token → /auth/me) settles. */
  loading: boolean
  login: (phone: string, password: string) => Promise<User>
  logout: () => void
  /** Adopt a fresh session (e.g. after a password change returns a new token). */
  setSession: (token: string, user: User) => void
  /** Set or clear (null) the current user's profile picture. Mock: persists a data URL to localStorage. */
  updateAvatar: (dataUrl: string | null) => void
  /** Permission check — reads the data-driven matrix, never hardcodes a role. */
  can: (module: ModuleKey, level?: PermissionLevel) => boolean
  level: (module: ModuleKey) => PermissionLevel
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Session hydration survives a transient failure (rate limit, network blip, server restart):
 * it retries, and only a real 401 ends the session. Before, any error here signed the user out.
 */
async function meWithRetry(): Promise<User> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await authService.me()
    } catch (err) {
      const transient = err instanceof ApiError && (err.status === 0 || err.status === 429 || err.status >= 500)
      if (!transient || attempt >= 3) throw err
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
    }
  }
}

// Avatars aren't stored by the backend yet; bridge via localStorage keyed by user id
// until the profile endpoint lands and this becomes a Cloudinary URL from the API.
const avatarKey = (userId: string) => `harboost.avatar.${userId}`

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => !!getToken())

  const withAvatar = useCallback((u: User): User => {
    const avatarUrl = localStorage.getItem(avatarKey(u.id)) ?? undefined
    return { ...u, avatarUrl }
  }, [])

  useEffect(() => {
    if (!getToken()) return
    let cancelled = false
    meWithRetry()
      .then((u) => {
        if (!cancelled) setUser(withAvatar(u))
      })
      .catch((err: unknown) => {
        // only a refused session clears the token; a server that's down keeps it for the next try
        if (!cancelled && err instanceof ApiError && err.status === 401) setToken(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [withAvatar])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(logout)
  }, [logout])

  /*
    Permissions are checked by the server on every request (Users-Roles-Addendum §6), so the
    server is always right; this keeps the UI in step. Re-read /auth/me when the window regains
    focus (at most every 30 s) and right after any 403 — a reduced permission or a temporary
    password then shows up without a sign-out. A 401 from /auth/me logs out as usual.
  */
  useEffect(() => {
    let last = 0
    const refresh = (force: boolean) => {
      if (!getToken()) return
      const now = Date.now()
      if (!force && now - last < 30_000) return
      last = now
      authService
        .me()
        .then((u) => setUser((prev) => (prev ? { ...withAvatar(u) } : prev)))
        .catch(() => undefined)
    }
    const onFocus = () => refresh(false)
    window.addEventListener('focus', onFocus)
    setForbiddenHandler((code) => {
      if (code === PASSWORD_CHANGE_REQUIRED) {
        setUser((prev) => (prev ? { ...prev, mustChangePassword: true } : prev))
      }
      refresh(true)
    })
    return () => {
      window.removeEventListener('focus', onFocus)
      setForbiddenHandler(() => undefined)
    }
  }, [withAvatar])

  const login = useCallback(
    async (phone: string, password: string) => {
      const { accessToken, user: loggedInUser, mustChangePassword } = await authService.login(phone, password)
      setToken(accessToken)
      const next = withAvatar({ ...loggedInUser, mustChangePassword: loggedInUser.mustChangePassword ?? mustChangePassword })
      setUser(next)
      return next
    },
    [withAvatar],
  )

  const setSession = useCallback(
    (token: string, u: User) => {
      setToken(token)
      setUser(withAvatar(u))
    },
    [withAvatar],
  )

  const updateAvatar = useCallback((dataUrl: string | null) => {
    setUser((prev) => {
      if (!prev) return prev
      if (dataUrl) localStorage.setItem(avatarKey(prev.id), dataUrl)
      else localStorage.removeItem(avatarKey(prev.id))
      return { ...prev, avatarUrl: dataUrl ?? undefined }
    })
  }, [])

  const level = useCallback(
    (module: ModuleKey): PermissionLevel => {
      if (!user) return 'none'
      // Server-driven (ADM-02) wins; DEFAULT_PERMISSIONS is the fallback when the
      // backend didn't supply a map (older token, unseeded role_permissions).
      return user.permissions?.[module] ?? DEFAULT_PERMISSIONS[user.role][module] ?? 'none'
    },
    [user],
  )

  const can = useCallback(
    (module: ModuleKey, required: PermissionLevel = 'view') => meets(level(module), required),
    [level],
  )

  const value = useMemo(
    () => ({ user, loading, login, logout, setSession, updateAvatar, can, level }),
    [user, loading, login, logout, setSession, updateAvatar, can, level],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
