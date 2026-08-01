import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Navigate, Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useAuth } from '@/context/AuthContext'

const COLLAPSE_KEY = 'harboost.sidebar.collapsed'

/* Authenticated layout: persistent sidebar + header + routed content.
   Redirects to /login when unauthenticated (auth guard). */
export function AppShell() {
  const { user, loading } = useAuth()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1')

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  // Session hydration (token → /auth/me) is async; wait for it before deciding
  // to redirect, so a page reload on an authenticated route doesn't flash to /login.
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="mx-auto w-full max-w-[var(--content-max)] flex-1 px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
