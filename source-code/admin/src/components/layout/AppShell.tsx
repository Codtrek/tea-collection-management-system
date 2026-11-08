import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useAuth } from '@/context/AuthContext'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { NARROW_QUERY, readSidebarPref, sidebarCollapsed, sidebarKey, writeSidebarPref } from './sidebar-pref'

/* Authenticated layout: persistent sidebar + header + routed content.
   Redirects to /login when unauthenticated (auth guard). */
export function AppShell() {
  const { user, loading } = useAuth()
  // A new page starts at the top. Without this, a page rendered from the query cache opened at the
  // previous page's scroll position, with its title hidden under the sticky top bar.
  const { pathname } = useLocation()
  useEffect(() => window.scrollTo(0, 0), [pathname])
  // collapsed to icons by default below 1280px; the user's choice is remembered per user and mode
  const mode = useMediaQuery(NARROW_QUERY) ? 'narrow' : 'wide'
  const key = sidebarKey(user?.id ?? 'anonymous', mode)
  // choices made in this page view win over storage (which may be unavailable)
  const [chosen, setChosen] = useState<Record<string, boolean>>({})
  const collapsed = chosen[key] ?? sidebarCollapsed(readSidebarPref(key), mode)
  const toggle = () => {
    writeSidebarPref(key, !collapsed)
    setChosen((c) => ({ ...c, [key]: !collapsed }))
  }

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
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="mx-auto w-full min-w-0 max-w-[var(--content-max)] flex-1 px-4 py-6 sm:px-6 lg:px-8 print:max-w-none print:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
