import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Bell, LogOut, User as UserIcon, ChevronDown } from 'lucide-react'
import { Popover } from '@/components/ui/Popover'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Avatar } from '@/components/ui/Avatar'
import { NotificationCard } from './NotificationCard'
import { useAuth } from '@/context/AuthContext'
import { NOTIFICATIONS } from '@/data/notifications'
import type { Role } from '@/types'

const roleTone: Record<Role, Parameters<typeof StatusBadge>[0]['tone']> = {
  Administrator: 'gradeNormal',
  Officer: 'assigned',
  Manager: 'approved',
}

export function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const unread = NOTIFICATIONS.filter((n) => !n.read).length

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`)
  }

  if (!user) return null

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-surface/90 px-6 backdrop-blur">
      <form onSubmit={submitSearch} className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search employees, estates, collections…"
          aria-label="Global search"
          className="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface-sunken pl-9 pr-3 text-sm text-text placeholder:text-text-disabled focus:border-primary focus:bg-surface focus:outline-none"
        />
      </form>

      <div className="ml-auto flex items-center gap-1">
        {/* Notifications */}
        <Popover
          panelClassName="w-96"
          trigger={() => (
            <span className="relative flex size-10 items-center justify-center rounded-[var(--radius-sm)] text-text-muted hover:bg-surface-hover hover:text-text">
              <Bell className="size-5" strokeWidth={1.5} />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
                  {unread}
                </span>
              )}
            </span>
          )}
        >
          {(close) => (
            <div>
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-text-heading">Notifications</p>
                <span className="text-xs text-text-muted">{unread} unread</span>
              </div>
              <div className="max-h-96 divide-y divide-border overflow-y-auto">
                {NOTIFICATIONS.slice(0, 6).map((n) => (
                  <NotificationCard
                    key={n.id}
                    n={n}
                    onClick={() => {
                      close()
                      navigate(n.href ?? '/notifications')
                    }}
                  />
                ))}
              </div>
              <button
                onClick={() => {
                  close()
                  navigate('/notifications')
                }}
                className="w-full border-t border-border py-2.5 text-center text-sm font-medium text-primary hover:bg-surface-hover"
              >
                View all
              </button>
            </div>
          )}
        </Popover>

        {/* Profile */}
        <Popover
          panelClassName="w-64"
          trigger={(open) => (
            <span className="flex items-center gap-2 rounded-[var(--radius-sm)] p-1.5 pr-2 hover:bg-surface-hover">
              <Avatar src={user.avatarUrl} name={user.name} size="sm" />
              <span className="hidden text-left sm:block">
                <span className="block text-[13px] font-medium leading-tight text-text">{user.name}</span>
                <span className="block text-xs leading-tight text-text-muted">{user.role}</span>
              </span>
              <ChevronDown className={`size-4 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
            </span>
          )}
        >
          {(close) => (
            <div className="py-1">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-medium text-text">{user.name}</p>
                <p className="mb-2 text-xs text-text-muted">{user.factory}</p>
                <StatusBadge tone={roleTone[user.role]}>{user.role}</StatusBadge>
              </div>
              <button
                onClick={() => {
                  close()
                  navigate('/profile')
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-text hover:bg-surface-hover"
              >
                <UserIcon className="size-4" strokeWidth={1.5} /> Profile &amp; Settings
              </button>
              <button
                onClick={() => {
                  close()
                  logout()
                  navigate('/login')
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-danger-fg hover:bg-surface-hover"
              >
                <LogOut className="size-4" strokeWidth={1.5} /> Logout
              </button>
            </div>
          )}
        </Popover>
      </div>
    </header>
  )
}
