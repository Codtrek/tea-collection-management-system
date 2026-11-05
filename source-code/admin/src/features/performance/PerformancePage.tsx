import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/data/EmptyState'

/*
  Performance (Performance-Addendum). The old page's figures (96% / 90% / 98%, the trend and the
  W1–W4 chart) were hard-coded, so they are gone. The team overview reads PerformanceService —
  every measure from real records, with its counts.
*/
export function PerformancePage() {
  return (
    <div>
      <PageHeader title="Performance" breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Performance' }]} />
      <p className="-mt-2 mb-4 text-sm text-text-muted">Use these figures to start a conversation, not to make decisions on their own.</p>
      <Card>
        <EmptyState title="Team overview" description="The team overview is being rebuilt from real attendance, dispatch, collection and fertilizer records." />
      </Card>
    </div>
  )
}
