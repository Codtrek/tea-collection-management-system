import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { ModuleKey, PermissionLevel, Role, User } from '@/types'
import { DEFAULT_PERMISSIONS, meets } from './permissions'

interface AuthContextValue {
  user: User | null
  login: (role: Role) => void
  logout: () => void
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Role | null
    return stored ? MOCK_USERS[stored] : null
  })

  const login = useCallback((role: Role) => {
    localStorage.setItem(STORAGE_KEY, role)
    setUser(MOCK_USERS[role])
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }, [])

  const level = useCallback(
    (module: ModuleKey): PermissionLevel => (user ? DEFAULT_PERMISSIONS[user.role][module] : 'none'),
    [user],
  )

  const can = useCallback(
    (module: ModuleKey, required: PermissionLevel = 'view') => meets(level(module), required),
    [level],
  )

  const value = useMemo(() => ({ user, login, logout, can, level }), [user, login, logout, can, level])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
