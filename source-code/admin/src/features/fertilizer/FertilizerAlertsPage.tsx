import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, CheckCircle2, Eye, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { AlertList, type AlertListItem } from '@/components/patterns/AlertList'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { EmptyState } from '@/components/data/EmptyState'
import { StatCard } from '@/components/data/StatCard'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import { BATCHES, batchStatus, daysToExpiry } from './data'
import type { FertilizerBatch } from './types'
import { formatDate, formatNumber, formatWeight } from '@/lib/format'

/* FERT-04 — home screen for the "Low/Expiring Fertilizer Stock" notification (§15).
   Manager is the primary viewer; Admin/Officer can act (discard). */
export function FertilizerAlertsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { can } = useAuth()
  const canAct = can('fertilizer', 'edit')
  const [discarding, setDiscarding] = useState<FertilizerBatch | null>(null)

  const expiring = BATCHES.filter((b) => !b.discarded && daysToExpiry(b) <= 30)
    .sort((a, b) => daysToExpiry(a) - daysToExpiry(b))

  const within7 = expiring.filter((b) => daysToExpiry(b) <= 7).length
  const within30 = expiring.length

  const items: AlertListItem[] = expiring.map((b) => {
    const days = daysToExpiry(b)
    return {
      key: b.id,
      urgency: days <= 7 ? 'critical' : 'warning',
      title: `${b.item} — ${b.id}`,
      detail:
        days < 0
          ? `Expired ${formatDate(b.expiryDate)} (${batchStatus(b)})`
          : `Expires in ${days} ${days === 1 ? 'day' : 'days'} — ${formatDate(b.expiryDate)}`,
      meta: formatWeight(b.quantityKg),
      actions: (
        <>
          <Button size="sm" variant="secondary" onClick={() => navigate(`/fertilizer/${b.id}`)}>
            <Eye className="size-4" /> View Batch
          </Button>
          {canAct && (
            <Button size="sm" variant="ghost" onClick={() => setDiscarding(b)}>
              <Trash2 className="size-4" /> Mark Discarded
            </Button>
          )}
        </>
      ),
    }
  })

  return (
    <div>
      <PageHeader
        title="Expiring Soon / Alerts"
        breadcrumb={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Fertilizer Inventory', to: '/fertilizer' },
          { label: 'Alerts' },
        ]}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:max-w-lg">
        <StatCard
          label="Expiring within 7 days"
          value={within7}
          format={formatNumber}
          icon={<CalendarClock className="size-4" />}
          tone={within7 > 0 ? 'warning' : 'default'}
        />
        <StatCard label="Expiring within 30 days" value={within30} format={formatNumber} icon={<CalendarClock className="size-4" />} />
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="size-6" strokeWidth={1.5} />}
          title="No fertilizer nearing expiry"
          description="All batches are fresh. Alerts appear here when stock comes within 30 days of expiry."
        />
      ) : (
        <AlertList items={items} />
      )}

      <LightConfirmModal
        open={!!discarding}
        onClose={() => setDiscarding(null)}
        onConfirm={() => {
          toast(`${discarding?.id} marked as discarded`, 'warning')
          setDiscarding(null)
        }}
        tone="danger"
        title="Discard this batch"
        confirmLabel="Mark as Discarded"
        message={
          <>
            <strong>{discarding?.item}</strong> ({discarding?.id}) will be removed from available stock. Reversible
            only via a new correcting entry.
          </>
        }
      />
    </div>
  )
}
