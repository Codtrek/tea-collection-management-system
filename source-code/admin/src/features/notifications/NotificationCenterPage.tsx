import { BellOff } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/data/EmptyState'

/*
  Notification Center (global-cross-cutting §3). The portal inbox isn't built yet (System
  Settings Part 2), so the page shows an honest empty state instead of example notifications.
*/
export function NotificationCenterPage() {
  return (
    <div>
      <PageHeader title="Notifications" breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Notifications' }]} />
      <EmptyState
        icon={<BellOff className="size-6" strokeWidth={1.5} />}
        title="No notifications yet"
        description="Approval requests, leave decisions and processed payments for you will appear here."
      />
    </div>
  )
}
