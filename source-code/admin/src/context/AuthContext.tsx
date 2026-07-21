import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { ModuleKey, PermissionLevel, Role, User } from '@/types'
import { DEFAULT_PERMISSIONS, meets } from './permissions'

interface AuthContextValue {
  user: User | null
  login: (role: Role) => void
  logout: () => void
  /** Set or clear (null) the current user's profile picture. Mock: persists a data URL to localStorage. */
  updateAvatar: (dataUrl: string | null) => void
  /** Permission check — reads the data-driven matrix, never hardcodes a role. */
  can: (module: ModuleKey, level?: PermissionLevel) => boolean
  level: (module: ModuleKey) => PermissionLevel
}

const AuthContext = createContext<AuthContextValue | null>(null)

/* Mock users, one per role, so the Login screen can demo role-based redirects. */
const MOCK_USERS: Record<Role, User> = {
  Administrator: { id: 'u-admin', name: 'A. Bandara', role: 'Administrator', email: 'admin@harboost.lk', factory: 'Nuwara Eliya Tea Factory' },
  Officer: { id: 'u-officer', name: 'S. Fernando', role: 'Officer', email: 'officer@harboost.lk', factory: 'Nuwara Eliya Tea Factory' },
  Manager: { id: 'u-manager', name: 'R. Jayasuriya', role: 'Manager', email: 'manager@harboost.lk', factory: 'Nuwara Eliya Tea Factory' },
}

const STORAGE_KEY = 'harboost.role'
// Per-role for the mock; keyed by user id once the real backend lands.
const avatarKey = (role: Role) => `harboost.avatar.${role}`

/** Hydrate the mock user for a role, merging any saved avatar. */
function userForRole(role: Role): User {
  const avatarUrl = localStorage.getItem(avatarKey(role)) ?? undefined
  return { ...MOCK_USERS[role], avatarUrl }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Role | null
    return stored ? userForRole(stored) : null
  })

  const login = useCallback((role: Role) => {
    localStorage.setItem(STORAGE_KEY, role)
    setUser(userForRole(role))
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }, [])

  const updateAvatar = useCallback((dataUrl: string | null) => {
    setUser((prev) => {
      if (!prev) return prev
      if (dataUrl) localStorage.setItem(avatarKey(prev.role), dataUrl)
      else localStorage.removeItem(avatarKey(prev.role))
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
    () => ({ user, login, logout, updateAvatar, can, level }),
    [user, login, logout, updateAvatar, can, level],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
