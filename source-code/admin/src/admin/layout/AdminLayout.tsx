import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Building2, ClipboardCheck, LayoutDashboard, LogOut, Menu, ShieldCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import fullLogo from '@/assets/brand/fullLogoGreen.svg'
import { useAdminStore } from '../data/AdminStore'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/requests', label: 'Registration requests', icon: ClipboardCheck, end: false, badge: 'pending' as const },
  { to: '/factories', label: 'Factories', icon: Building2, end: false },
]

function Brand() {
  return (
    <div className="flex items-center gap-2 px-2">
      <img src={fullLogo} alt="Harboost" className="h-7 shrink-0" />
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-primary">
        <ShieldCheck className="size-3" />
        Super Admin
      </span>
    </div>
  )
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const { requests } = useAdminStore()
  const pending = requests.filter((r) => r.status === 'pending').length

  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map(({ to, label, icon: Icon, end, badge }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'relative flex items-center gap-3 rounded-[var(--radius-sm)] px-2 py-2 text-sm font-medium transition-colors',
              isActive ? 'bg-brand-soft text-primary' : 'text-text-muted hover:bg-surface-hover hover:text-text',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-brand" />}
              <Icon className="size-5 shrink-0" strokeWidth={1.5} />
              <span className="flex-1 truncate">{label}</span>
              {badge && pending > 0 && (
                <span
                  aria-label={`${pending} pending`}
                  className="tabular rounded-full bg-warning-bg px-1.5 text-xs font-medium text-warning-fg"
                >
                  {pending}
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-surface p-4 md:flex">
        <Brand />
        <div className="mt-8 flex-1">
          <NavItems />
        </div>
        <div className="border-t border-border pt-4">
          <div className="px-2 pb-3">
            <p className="text-sm font-medium text-text-heading">Platform Admin</p>
            <p className="text-xs text-text-muted">admin@harboost.lk</p>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start">
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface px-4 md:hidden">
        <Brand />
        <Button variant="ghost" iconOnly aria-label="Toggle menu" onClick={() => setMobileOpen((o) => !o)}>
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </header>
      {mobileOpen && (
        <div className="border-b border-border bg-surface p-3 md:hidden">
          <NavItems onNavigate={() => setMobileOpen(false)} />
        </div>
      )}

      <main className="md:pl-64">
        <div className="mx-auto max-w-7xl p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
