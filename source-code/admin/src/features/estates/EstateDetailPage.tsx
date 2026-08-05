import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, HandCoins, Banknote, CircleSlash, FileText, Eye, EyeOff, Loader2, Truck } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DetailPageWithTabs } from '@/components/patterns/DetailPageWithTabs'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { DataTable, type Column } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { ErrorState } from '@/components/data/ErrorState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import * as estatesService from '@/services/estates'
import { grossRevenue, netPayable } from './calc'
import { EstateAnalyticsBody } from './EstateAnalyticsPage'
import { EstateTimelineTab } from './EstateTimelineTab'
import { LifetimeSummary } from './LifetimeSummary'
import { COLLECTION_TONE } from '@/features/collections/status'
import type { EstateAdvance, Settlement } from './types'
import type { CollectionRecord } from '@/features/collections/types'
import { formatCurrency, formatDate, formatWeight, initials, maskAccount } from '@/lib/format'

/* EST-03 — DetailPageWithTabs: Overview | Timeline | Analytics | Deliveries | Payments | Advances | Documents. */
export function EstateDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const canEdit = can('estateOwners', 'edit')
  const canManage = can('estateOwners', 'approve')

  const [deactivating, setDeactivating] = useState(false)
  const [showAccount, setShowAccount] = useState(false)
  // §7 — each paginated tab defaults to the last 90 days; "View all" widens
  // the range rather than switching to client-side slicing of a full fetch.
  const [deliveriesShowAll, setDeliveriesShowAll] = useState(false)
  const [paymentsShowAll, setPaymentsShowAll] = useState(false)
  const [advancesShowAll, setAdvancesShowAll] = useState(false)

  const {
    data: estate,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['estate', id],
    queryFn: () => estatesService.getById(id!),
    enabled: !!id,
  })

  const { data: lifetime } = useQuery({
    queryKey: ['estates', id, 'lifetime'],
    queryFn: () => estatesService.getLifetimeMetrics(id!),
    enabled: !!id,
  })

  const deliveriesQuery = useQuery({
    queryKey: ['estates', id, 'deliveries', deliveriesShowAll],
    queryFn: () => estatesService.getDeliveries(id!, deliveriesShowAll ? { from: '2000-01-01', limit: 25 } : { limit: 25 }),
    enabled: !!id,
  })
  const paymentsQuery = useQuery({
    queryKey: ['estates', id, 'payments', paymentsShowAll],
    queryFn: () => estatesService.getPayments(id!, paymentsShowAll ? { from: '2000-01-01', limit: 25 } : { limit: 25 }),
    enabled: !!id,
  })
  const advancesQuery = useQuery({
    queryKey: ['estates', id, 'advances', advancesShowAll],
    queryFn: () => estatesService.getAdvancesFor(id!, advancesShowAll ? { from: '2000-01-01', limit: 25 } : { limit: 25 }),
    enabled: !!id,
  })

  const deactivateMutation = useMutation({
    mutationFn: (estateId: string) => estatesService.deactivate(estateId),
    onSuccess: (updated) => {
      toast(`${updated.estateName} deactivated`, 'warning')
      setDeactivating(false)
      void queryClient.invalidateQueries({ queryKey: ['estate', id] })
      void queryClient.invalidateQueries({ queryKey: ['estates'] })
      navigate('/estates')
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Could not deactivate this estate', 'danger'),
  })

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }

  if (isError || !estate) {
    return <ErrorState title="Estate not found" description={`No estate owner with ID “${id}”.`} onRetry={() => void refetch()} />
  }

  const deliveryColumns: Column<CollectionRecord>[] = [
    { key: 'id', header: 'Delivery', render: (c) => <span className="id text-xs">{c.id}</span> },
    { key: 'date', header: 'Date', render: (c) => formatDate(c.date) },
    { key: 'weightKg', header: 'Weight', align: 'right', render: (c) => formatWeight(c.weightKg) },
    {
      key: 'grade',
      header: 'Grade',
      render: (c) =>
        c.grade === 'Pending' ? (
          <span className="text-xs text-text-muted">Pending</span>
        ) : (
          <StatusBadge tone={c.grade === 'Super' ? 'gradeSuper' : 'gradeNormal'}>{c.grade}</StatusBadge>
        ),
    },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge tone={COLLECTION_TONE[c.status]}>{c.status}</StatusBadge> },
  ]

  const paymentColumns: Column<Settlement>[] = [
    { key: 'period', header: 'Period' },
    { key: 'gross', header: 'Gross', align: 'right', render: (s) => formatCurrency(grossRevenue(s)) },
    {
      key: 'deductions',
      header: 'Deductions',
      align: 'right',
      render: (s) => formatCurrency(s.transportCost + s.fertilizerDeduction + s.advanceDeduction),
    },
    { key: 'net', header: 'Net Paid', align: 'right', render: (s) => formatCurrency(netPayable(s)) },
    {
      key: 'status',
      header: 'Status',
      render: (s) => <StatusBadge tone={s.status === 'Processed' ? 'success' : 'warning'}>{s.status}</StatusBadge>,
    },
  ]

  const advanceColumns: Column<EstateAdvance>[] = [
    { key: 'id', header: 'Advance', render: (a) => <span className="id text-xs">{a.id}</span> },
    { key: 'amount', header: 'Amount', align: 'right', render: (a) => formatCurrency(a.amount) },
    { key: 'dateIssued', header: 'Issued', render: (a) => formatDate(a.dateIssued) },
    { key: 'issuedBy', header: 'Issued by' },
    {
      key: 'status',
      header: 'Status',
      render: (a) => <StatusBadge tone={a.status === 'Deducted' ? 'success' : 'warning'}>{a.status}</StatusBadge>,
    },
  ]

  return (
    <div>
      <PageHeader
        title={estate.estateName}
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Estate Owners', to: '/estates' }, { label: estate.id }]}
        actions={
          <>
            {canEdit && (
              <Button variant="secondary" onClick={() => navigate(`/estates/${estate.id}/edit`)}>
                <Pencil className="size-4" /> Edit
              </Button>
            )}
            {canEdit && (
              <Button variant="secondary" onClick={() => navigate(`/estates/advances/new?estate=${estate.id}`)}>
                <HandCoins className="size-4" /> Issue Advance
              </Button>
            )}
            {canEdit && (
              <Button onClick={() => navigate('/estates/settlements/process')}>
                <Banknote className="size-4" /> Process Settlement
              </Button>
            )}
          </>
        }
      />

      <DetailPageWithTabs
        header={
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex size-14 items-center justify-center rounded-full bg-brand-soft text-lg font-semibold text-primary">
              {initials(estate.estateName)}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-text-heading">{estate.estateName}</h2>
              <p className="text-sm text-text-muted">
                {estate.ownerName} · {estate.location} · <span className="id text-xs">{estate.id}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={estate.status === 'Active' ? 'success' : 'danger'}>{estate.status}</StatusBadge>
              <StatusBadge tone="assigned">{estate.route}</StatusBadge>
              {estate.selfDelivery && (
                <StatusBadge tone="approved" icon={<Truck />}>
                  Self-delivery
                </StatusBadge>
              )}
            </div>
            {canManage && estate.status === 'Active' && (
              <Button variant="ghost" size="sm" onClick={() => setDeactivating(true)}>
                <CircleSlash className="size-4" /> Deactivate
              </Button>
            )}
          </div>
        }
        tabs={[
          {
            id: 'overview',
            label: 'Overview',
            content: (
              <div className="flex flex-col gap-4">
                {lifetime && <LifetimeSummary metrics={lifetime} />}
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
                    <h3 className="mb-3 text-[13px] font-semibold text-text-heading">Contact & location</h3>
                    <dl className="flex flex-col gap-2.5">
                      <InfoRow label="Owner" value={estate.ownerName} />
                      <InfoRow label="NIC" value={estate.nic} mono />
                      <InfoRow label="Contact" value={estate.contact} />
                      <InfoRow label="Email" value={estate.email ?? '—'} />
                      <InfoRow label="Address" value={estate.address} />
                      <InfoRow label="Route" value={`${estate.route} (auto-assigned)`} />
                    </dl>
                  </div>
                  <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
                    <h3 className="mb-3 text-[13px] font-semibold text-text-heading">Deliveries & bank</h3>
                    <dl className="flex flex-col gap-2.5">
                      <InfoRow label="YTD deliveries" value={formatWeight(estate.ytdDeliveriesKg)} />
                      <InfoRow label="Transport" value={estate.selfDelivery ? 'Self-delivered — cost exempt' : 'Factory collection'} />
                      <InfoRow label="Bank" value={estate.bank.bank || 'Missing — excluded from settlements'} />
                      <InfoRow label="Branch" value={estate.bank.branch || '—'} />
                      <div className="flex justify-between gap-4 text-sm">
                        <dt className="text-text-muted">Account</dt>
                        <dd className="flex items-center gap-1.5 text-right text-text">
                          {estate.bank.account ? (
                            <>
                              <span className="id">{showAccount ? estate.bank.account : maskAccount(estate.bank.account)}</span>
                              <button
                                onClick={() => setShowAccount((s) => !s)}
                                aria-label={showAccount ? 'Hide account number' : 'Reveal account number'}
                                className="text-text-muted hover:text-text"
                              >
                                {showAccount ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                              </button>
                            </>
                          ) : (
                            '—'
                          )}
                        </dd>
                      </div>
                    </dl>
                    {estate.lastUpdatedBy && (
                      <p className="mt-4 border-t border-border pt-3 text-xs text-text-muted">
                        Last updated by {estate.lastUpdatedBy} on {estate.lastUpdatedOn && formatDate(estate.lastUpdatedOn)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ),
          },
          {
            id: 'timeline',
            label: 'Timeline',
            content: <EstateTimelineTab estateId={estate.id} />,
          },
          {
            id: 'analytics',
            label: 'Analytics',
            content: <EstateAnalyticsBody estateId={estate.id} />,
          },
          {
            id: 'deliveries',
            label: 'Deliveries History',
            content: (
              <PaginatedTabBody
                query={deliveriesQuery}
                showAll={deliveriesShowAll}
                onShowAll={() => setDeliveriesShowAll(true)}
              >
                <DataTable
                  columns={deliveryColumns}
                  rows={deliveriesQuery.data?.rows ?? []}
                  rowKey={(c) => c.id}
                  onRowClick={(c) => navigate(`/collections/${c.id}`)}
                  emptyState={<EmptyState title="No deliveries yet" description="Collection records from the field flow appear here." />}
                />
              </PaginatedTabBody>
            ),
          },
          {
            id: 'payments',
            label: 'Payment History',
            content: (
              <PaginatedTabBody query={paymentsQuery} showAll={paymentsShowAll} onShowAll={() => setPaymentsShowAll(true)}>
                <DataTable
                  columns={paymentColumns}
                  rows={paymentsQuery.data?.rows ?? []}
                  rowKey={(s) => s.id}
                  emptyState={<EmptyState title="No settlements yet" description="Processed payment settlements appear here." />}
                />
              </PaginatedTabBody>
            ),
          },
          {
            id: 'advances',
            label: 'Advances',
            content: (
              <PaginatedTabBody query={advancesQuery} showAll={advancesShowAll} onShowAll={() => setAdvancesShowAll(true)}>
                <DataTable
                  columns={advanceColumns}
                  rows={advancesQuery.data?.rows ?? []}
                  rowKey={(a) => a.id}
                  emptyState={
                    <EmptyState
                      title="No advances issued"
                      description="Advance payments issued to this estate appear here and deduct at the next settlement."
                      action={canEdit ? <Button size="sm" onClick={() => navigate(`/estates/advances/new?estate=${estate.id}`)}>Issue Advance</Button> : undefined}
                    />
                  }
                />
              </PaginatedTabBody>
            ),
          },
          {
            id: 'documents',
            label: 'Documents',
            content: (
              <div className="rounded-[var(--radius-lg)] border border-border bg-surface">
                {estate.documents.length === 0 ? (
                  <EmptyState title="No documents uploaded" />
                ) : (
                  <ul className="divide-y divide-border">
                    {estate.documents.map((d) => (
                      <li key={d.name} className="flex items-center gap-3 px-4 py-3">
                        <span className="flex size-9 items-center justify-center rounded-[var(--radius-sm)] bg-brand-soft text-primary">
                          <FileText className="size-4" />
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-text">{d.name}</p>
                          <p className="text-xs text-text-muted">Uploaded {formatDate(d.uploadedOn)}</p>
                        </div>
                        <Button size="sm" variant="secondary">
                          View
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ),
          },
        ]}
      />

      <LightConfirmModal
        open={deactivating}
        onClose={() => setDeactivating(false)}
        onConfirm={() => deactivateMutation.mutate(estate.id)}
        loading={deactivateMutation.isPending}
        tone="danger"
        title="Deactivate estate owner"
        confirmLabel="Deactivate"
        message={
          <>
            Deactivating <strong>{estate.estateName}</strong> stops new collections and settlements. Historical records
            remain intact.
          </>
        }
      />
    </div>
  )
}

/**
 * §7 — wraps a paginated tab's table with loading/error states and the
 * "Showing last 90 days · View all" control. `query` is a TanStack Query
 * result carrying a `PaginatedResult<T>`; this component doesn't care about
 * the row type, only the pagination envelope.
 */
function PaginatedTabBody({
  query,
  showAll,
  onShowAll,
  children,
}: {
  query: { isPending: boolean; isError: boolean; data?: { total: number }; refetch: () => void }
  showAll: boolean
  onShowAll: () => void
  children: React.ReactNode
}) {
  if (query.isPending) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }
  if (query.isError) {
    return <ErrorState title="Couldn't load this tab" onRetry={() => query.refetch()} />
  }
  return (
    <div className="flex flex-col gap-3">
      {!showAll && (
        <p className="text-xs text-text-muted">
          Showing last 90 days ({query.data?.total ?? 0}) ·{' '}
          <button type="button" onClick={onShowAll} className="font-medium text-primary underline-offset-2 hover:underline">
            View all
          </button>
        </p>
      )}
      {children}
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-text-muted">{label}</dt>
      <dd className={mono ? 'id text-right text-text' : 'text-right text-text'}>{value}</dd>
    </div>
  )
}
