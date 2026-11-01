import { Link, useLocation } from 'react-router-dom'
import { PanelLeftClose, PanelLeft } from 'lucide-react'
import { NAV_GROUPS } from './nav'
import { activeNavTo } from './nav-match'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/cn'
import fullLogo from '@/assets/brand/fullLogoGreen.svg'
import brandMark from '@/assets/brand/brandLogoGreen.svg'

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { can } = useAuth()
  const { pathname } = useLocation()

  // Permission-aware: whole group hides when no child is permitted (§4 — hidden, never greyed).
  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => can(i.module, 'view')),
  })).filter((g) => g.items.length > 0)
  // Only the most specific match lights (/estates/advances/new → Estate Owner Advances, not Estate Owners).
  const litTo = activeNavTo(
    pathname,
    groups.flatMap((g) => g.items.map((i) => i.to)),
  )

  return (
    <aside
      className="sticky top-0 flex h-screen shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-[var(--duration-base)]"
      style={{ width: collapsed ? 'var(--sidebar-w-collapsed)' : 'var(--sidebar-w)' }}
    >
      <div className={cn('flex h-16 items-center border-b border-border', collapsed ? 'justify-center px-2' : 'px-4')}>
        <img src={collapsed ? brandMark : fullLogo} alt="Harboost" className={collapsed ? 'h-7' : 'h-8'} />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map((group, gi) => (
          <div key={group.label ?? gi} className="mb-4">
            {group.label && !collapsed && (
              <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                {group.label}
              </p>
            )}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    title={collapsed ? item.label : undefined}
                    aria-current={item.to === litTo ? 'page' : undefined}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-[var(--radius-sm)] px-2 py-2 text-sm font-medium transition-colors',
                      collapsed && 'justify-center',
                      item.to === litTo ? 'bg-brand-soft text-primary' : 'text-text-muted hover:bg-surface-hover hover:text-text',
                    )}
                  >
                    {item.to === litTo && <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-brand" />}
                    <item.icon className="size-5 shrink-0" strokeWidth={1.5} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <button
        onClick={onToggle}
        className={cn(
          'flex h-12 items-center gap-3 border-t border-border px-4 text-sm text-text-muted hover:text-text',
          collapsed && 'justify-center px-0',
        )}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <PanelLeft className="size-5" strokeWidth={1.5} /> : <PanelLeftClose className="size-5" strokeWidth={1.5} />}
        {!collapsed && 'Collapse'}
      </button>
    </aside>
  )
}
