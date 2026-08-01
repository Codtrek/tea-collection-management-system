import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Pencil, HandCoins, Banknote, CircleSlash, FileText, Eye, EyeOff, Truck } from 'lucide-react'
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
import { ESTATES, advancesForEstate, settlementsForEstate, grossRevenue, netPayable } from './data'
import { collectionsForEstate } from '@/features/collections/data'
import { COLLECTION_TONE } from '@/features/collections/status'
import type { EstateAdvance, Settlement } from './types'
import type { CollectionRecord } from '@/features/collections/types'
import { formatCurrency, formatDate, formatWeight, initials, maskAccount } from '@/lib/format'

/* EST-03 — DetailPageWithTabs: Overview | Deliveries | Payments | Advances | Documents. */
export function EstateDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { can } = useAuth()
  const canEdit = can('estateOwners', 'edit')
  const canManage = can('estateOwners', 'approve')

  const [deactivating, setDeactivating] = useState(false)
  const [showAccount, setShowAccount] = useState(false)

  const estate = ESTATES.find((e) => e.id === id)
  if (!estate) {
    return <ErrorState title="Estate not found" description={`No estate owner with ID “${id}”.`} onRetry={() => navigate('/estates')} />
  }

  const deliveries = collectionsForEstate(estate.id)
  const advances = advancesForEstate(estate.id)
  const settlements = settlementsForEstate(estate.id)

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
            ),
          },
          {
            id: 'deliveries',
            label: 'Deliveries History',
            content: (
              <DataTable
                columns={deliveryColumns}
                rows={deliveries}
                rowKey={(c) => c.id}
                onRowClick={(c) => navigate(`/collections/${c.id}`)}
                emptyState={<EmptyState title="No deliveries yet" description="Collection records from the field flow appear here." />}
              />
            ),
          },
          {
            id: 'payments',
            label: 'Payment History',
            content: (
              <DataTable
                columns={paymentColumns}
                rows={settlements}
                rowKey={(s) => s.id}
                emptyState={<EmptyState title="No settlements yet" description="Processed payment settlements appear here." />}
              />
            ),
          },
          {
            id: 'advances',
            label: 'Advances',
            content: (
              <DataTable
                columns={advanceColumns}
                rows={advances}
                rowKey={(a) => a.id}
                emptyState={
                  <EmptyState
                    title="No advances issued"
                    description="Advance payments issued to this estate appear here and deduct at the next settlement."
                    action={canEdit ? <Button size="sm" onClick={() => navigate(`/estates/advances/new?estate=${estate.id}`)}>Issue Advance</Button> : undefined}
                  />
                }
              />
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
        onConfirm={() => {
          toast(`${estate.estateName} deactivated`, 'warning')
          setDeactivating(false)
          navigate('/estates')
        }}
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

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-text-muted">{label}</dt>
      <dd className={mono ? 'id text-right text-text' : 'text-right text-text'}>{value}</dd>
    </div>
  )
}
