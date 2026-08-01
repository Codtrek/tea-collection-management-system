import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BellOff, CheckCheck } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/data/EmptyState'
import { NotificationCard } from '@/components/layout/NotificationCard'
import { NOTIFICATIONS, NOTIFICATION_TYPES } from '@/data/notifications'
import { cn } from '@/lib/cn'

/* Notification Center full page (global-cross-cutting §3). Filter chips by §15 type. */
export function NotificationCenterPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<string>('all')
  const [items, setItems] = useState(NOTIFICATIONS)

  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter((n) => n.type === filter)),
    [items, filter],
  )

  const markAllRead = () => setItems((prev) => prev.map((n) => ({ ...n, read: true })))

  return (
    <div>
      <PageHeader
        title="Notifications"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Notifications' }]}
        actions={
          <Button variant="secondary" size="sm" onClick={markAllRead}>
            <CheckCheck className="size-4" /> Mark all as read
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>All</Chip>
        {NOTIFICATION_TYPES.map((t) => (
          <Chip key={t} active={filter === t} onClick={() => setFilter(t)}>
            {t}
          </Chip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<BellOff className="size-6" strokeWidth={1.5} />} title="You're all caught up" description="No notifications match this filter." />
      ) : (
        <Card className="p-0">
          <div className="divide-y divide-border">
            {filtered.map((n) => (
              <NotificationCard
                key={n.id}
                n={n}
                onClick={() => {
                  setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
                  navigate(n.href ?? '/dashboard')
                }}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors',
        active
          ? 'border-primary bg-brand-soft text-primary'
          : 'border-border bg-surface text-text-muted hover:bg-surface-hover',
      )}
    >
      {children}
    </button>
  )
}
