import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CircleCheck, Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { useAdminStore } from '../data/AdminStore'
import { formatDate, formatNumber, totalUsersOf } from '../data/selectors'
import { ROLE_LABELS, type FactoryRole } from '../data/types'
import { AdminStatusBadge } from '../components/AdminStatusBadge'
import { ActionDialog } from '../components/ActionDialog'
import { DetailList } from '../components/DetailList'
import { LinkButton } from '../components/LinkButton'

export default function FactoryDetailPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { factories, suspendFactory, reactivateFactory } = useAdminStore()
  const factory = factories.find((f) => f.id === id)
  const [dialog, setDialog] = useState<'suspend' | 'reactivate' | null>(null)

  if (!factory) {
    return (
      <div className="py-24 text-center">
        <p className="text-text-muted">Factory {id} was not found.</p>
        <LinkButton to="/factories" variant="ghost" className="mt-2">
          Back to factories
        </LinkButton>
      </div>
    )
  }

  const { profile, admin } = factory
  const isActive = factory.status === 'active'
  const roles = Object.keys(ROLE_LABELS) as FactoryRole[]

  return (
    <>
      <Link to="/factories" className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Factories
      </Link>

      {params.get('new') && (
        <div
          role="status"
          className="mb-6 flex items-start gap-3 rounded-[var(--radius-lg)] border border-primary/30 bg-brand-soft p-4 text-sm text-text"
        >
          <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            <span className="font-medium">{profile.name}</span> is now on Harboost. An invitation was sent to{' '}
            {admin.email} to set up the Factory Administrator account.
          </p>
        </div>
      )}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-text-heading">{profile.name}</h1>
            <AdminStatusBadge status={factory.status} />
          </div>
          <p className="mt-1 text-sm text-text-muted">
            {factory.id} · {profile.district} · on Harboost since {formatDate(factory.registeredAt)}
          </p>
        </div>
        {isActive ? (
          <Button variant="secondary" className="text-danger-fg" onClick={() => setDialog('suspend')}>
            <Pause className="size-4" /> Suspend factory
          </Button>
        ) : (
          <Button onClick={() => setDialog('reactivate')}>
            <Play className="size-4" /> Reactivate
          </Button>
        )}
      </div>

      {!isActive && factory.suspendReason && (
        <div className="mb-6 rounded-[var(--radius-lg)] border border-border bg-surface-hover p-4 text-sm">
          <p className="font-medium text-text">Suspended</p>
          <p className="mt-1 text-text-muted">{factory.suspendReason}</p>
          <p className="mt-2 text-xs text-text-muted">
            Users of this factory cannot sign in until it is reactivated. Their data is kept.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ['Users', formatNumber(totalUsersOf(factory))],
          ['Estates', formatNumber(factory.estates)],
          ['Collection routes', formatNumber(factory.routes)],
        ].map(([label, value]) => (
          <Card key={label} className="p-5">
            <p className="text-[13px] font-medium text-text-muted">{label}</p>
            <p className="tabular mt-1 text-2xl font-semibold text-text-heading">{value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Factory details</CardTitle>
            </CardHeader>
            <DetailList
              items={[
                ['Business registration no.', profile.businessRegNo],
                ['Tea Board registration no.', profile.teaBoardRegNo],
                ['Elevation', profile.elevation],
                ['District', profile.district],
                ['Address', profile.address],
                ['Phone', profile.phone],
                ['Email', profile.email],
                ['Estimated suppliers', formatNumber(profile.estimatedSuppliers)],
              ]}
            />
          </Card>
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="text-base">Factory Administrator</CardTitle>
                <p className="text-[13px] text-text-muted">Primary contact for this factory</p>
              </div>
            </CardHeader>
            <DetailList
              items={[
                ['Full name', admin.fullName],
                ['Designation', admin.designation],
                ['NIC', admin.nic],
                ['Email', admin.email],
                ['Phone', admin.phone],
              ]}
            />
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Users by role</CardTitle>
          </CardHeader>
          <ul className="divide-y divide-border text-sm">
            {roles.map((role) => (
              <li key={role} className="flex justify-between py-2">
                <span className="text-text-muted">{ROLE_LABELS[role]}</span>
                <span className="tabular font-medium text-text">{formatNumber(factory.userCounts[role])}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <ActionDialog
        open={dialog === 'suspend'}
        onClose={() => setDialog(null)}
        title={`Suspend ${profile.name}?`}
        description="All users of this factory are signed out and blocked from signing in. No data is deleted, and you can reactivate at any time."
        confirmLabel="Suspend factory"
        destructive
        reason={{ label: 'Reason', placeholder: 'Shown to the Factory Administrator', required: true }}
        onConfirm={(reason) => suspendFactory(factory.id, reason)}
      />
      <ActionDialog
        open={dialog === 'reactivate'}
        onClose={() => setDialog(null)}
        title={`Reactivate ${profile.name}?`}
        description="Users of this factory will be able to sign in again immediately."
        confirmLabel="Reactivate"
        onConfirm={() => reactivateFactory(factory.id)}
      />
    </>
  )
}
