import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getToken, setToken, setUnauthorizedHandler } from '@/lib/api'
import * as authService from '@/services/auth'
import type { ModuleKey, PermissionLevel, User } from '@/types'
import { DEFAULT_PERMISSIONS, meets } from './permissions'

interface AuthContextValue {
  user: User | null
  /** True until the initial session hydration (token → /auth/me) settles. */
  loading: boolean
  login: (phone: string, password: string) => Promise<void>
  logout: () => void
  /** Set or clear (null) the current user's profile picture. Mock: persists a data URL to localStorage. */
  updateAvatar: (dataUrl: string | null) => void
  /** Permission check — reads the data-driven matrix, never hardcodes a role. */
  can: (module: ModuleKey, level?: PermissionLevel) => boolean
  level: (module: ModuleKey) => PermissionLevel
}

const AuthContext = createContext<AuthContextValue | null>(null)

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
    authService
      .me()
      .then((u) => {
        if (!cancelled) setUser(withAvatar(u))
      })
      .catch(() => {
        if (!cancelled) setToken(null)
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

  const login = useCallback(
    async (phone: string, password: string) => {
      const { accessToken, user: loggedInUser } = await authService.login(phone, password)
      setToken(accessToken)
      setUser(withAvatar(loggedInUser))
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
    (module: ModuleKey): PermissionLevel => (user ? DEFAULT_PERMISSIONS[user.role][module] : 'none'),
    [user],
  )

  const can = useCallback(
    (module: ModuleKey, required: PermissionLevel = 'view') => meets(level(module), required),
    [level],
  )

  const value = useMemo(
    () => ({ user, loading, login, logout, updateAvatar, can, level }),
    [user, loading, login, logout, updateAvatar, can, level],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
