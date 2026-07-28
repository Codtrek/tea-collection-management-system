import { useState } from 'react'
import { Plus, Upload, Loader2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader'
import { AdminGuard } from './AdminGuard'
import { Tabs } from '@/components/ui/Tabs'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LightConfirmModal } from '@/components/patterns/LightConfirmModal'
import { DataTable, type Column } from '@/components/data/DataTable'
import { ErrorState } from '@/components/data/ErrorState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useToast } from '@/components/ui/Toast'
import { ApiError } from '@/lib/api'
import * as adminService from '@/services/admin'
import type { GradeRate } from './types'
import { formatCurrency, formatDate } from '@/lib/format'

/*
  ADM-01 — factory details + the business-rule values other modules calculate
  against. Grade rates are VERSIONED with effective dates (the doc's
  correctness concern) and now persisted server-side (grade_rates): EST-08
  snapshots the rate at collection time, so past settlements never silently
  recalculate when a rate changes. General info / transport / beneficiary items
  remain static config UI for now (no backing table this slice).
*/

const ITEM_TYPES = [
  { name: 'Rice', unit: 'kg' },
  { name: 'Dhal', unit: 'kg' },
  { name: 'Flour', unit: 'kg' },
]

const TABS = [
  { id: 'general', label: 'General Info' },
  { id: 'grades', label: 'Grade Rates' },
  { id: 'transport', label: 'Transport Rates' },
  { id: 'items', label: 'Beneficiary Item Types' },
]

export function FactorySetupPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('general')
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)

  // New-rate-version form (Grade Rates tab)
  const [newSuper, setNewSuper] = useState('185')
  const [newNormal, setNewNormal] = useState('95')
  const [newEffective, setNewEffective] = useState('2026-08-01')
  const [confirmVersion, setConfirmVersion] = useState(false)

  const {
    data: rates,
    isPending: ratesLoading,
    isError: ratesError,
    refetch: refetchRates,
  } = useQuery({
    queryKey: ['admin', 'grade-rates'],
    queryFn: adminService.getGradeRates,
  })

  const publishMutation = useMutation({
    mutationFn: () =>
      adminService.createGradeRate({
        superRate: Number(newSuper),
        normalRate: Number(newNormal),
        effectiveDate: newEffective,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'grade-rates'] })
      toast('New grade-rate version published — audit entry recorded')
      setConfirmVersion(false)
    },
    onError: (err) =>
      toast(err instanceof ApiError ? err.message : 'Could not publish the rate version', 'danger'),
  })

  const rateColumns: Column<GradeRate>[] = [
    {
      key: 'effectiveDate',
      header: 'Effective from',
      render: (r) => (
        <span className="flex items-center gap-2">
          {formatDate(r.effectiveDate)}
          {r.current && <StatusBadge tone="success">Current</StatusBadge>}
        </span>
      ),
    },
    { key: 'superRate', header: 'Super (Rs./kg)', align: 'right', render: (r) => formatCurrency(r.superRate) },
    { key: 'normalRate', header: 'Normal (Rs./kg)', align: 'right', render: (r) => formatCurrency(r.normalRate) },
    { key: 'setBy', header: 'Set by' },
  ]

  const save = () => {
    setSaving(true)
    setTimeout(() => {
      toast('Factory setup saved')
      setSaving(false)
      setConfirming(false)
    }, 400)
  }

  return (
    <AdminGuard>
      <PageHeader
        title="Factory Setup"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Administration' }, { label: 'Factory Setup' }]}
        actions={
          tab === 'grades' ? (
            <Button onClick={() => setConfirmVersion(true)}>Publish New Version</Button>
          ) : (
            <Button onClick={() => setConfirming(true)}>Save Changes</Button>
          )
        }
      />

      <Tabs tabs={TABS} active={tab} onChange={setTab} className="mb-5" />

      {tab === 'general' && (
        <Card className="max-w-2xl">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Factory name" defaultValue="Nuwara Eliya Tea Factory" />
            <Input label="Registration number" defaultValue="REG-TF-1998-0042" />
            <div className="sm:col-span-2">
              <Input label="Address" defaultValue="Kandapola Rd, Nuwara Eliya" />
            </div>
            <Input label="Contact number" defaultValue="0522223344" />
            <Input label="Email" type="email" defaultValue="info@harboost.lk" />
            <div className="sm:col-span-2">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-border bg-surface-sunken px-4 py-6 text-center hover:bg-surface-hover">
                <Upload className="size-5 text-text-muted" strokeWidth={1.5} />
                <span className="text-sm font-medium text-text">Factory logo</span>
                <span className="text-xs text-text-muted">Feeds the Login screen branding (§7). Click to upload (demo).</span>
                <input type="file" className="hidden" />
              </label>
            </div>
          </div>
        </Card>
      )}

      {tab === 'grades' && (
        <div className="flex max-w-3xl flex-col gap-4">
          <Card>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-heading">New rate version</h3>
              <span className="text-xs text-text-muted">Applies from its effective date — past settlements keep their rate</span>
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <Input label="Super grade (Rs./kg)" type="number" min="0" value={newSuper} onChange={(e) => setNewSuper(e.target.value)} />
              <Input label="Normal grade (Rs./kg)" type="number" min="0" value={newNormal} onChange={(e) => setNewNormal(e.target.value)} />
              <Input label="Effective date" type="date" value={newEffective} onChange={(e) => setNewEffective(e.target.value)} />
            </div>
          </Card>

          {ratesLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
            </div>
          ) : ratesError || !rates ? (
            <ErrorState title="Couldn't load grade rates" onRetry={() => void refetchRates()} />
          ) : (
            <DataTable columns={rateColumns} rows={rates} rowKey={(r) => r.id} />
          )}
        </div>
      )}

      {tab === 'transport' && (
        <Card className="max-w-2xl">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Rate per km (Rs.)" type="number" min="0" defaultValue="42" hint="Used in the transport cost calculation (§8.1.6)." />
            <Input label="Minimum charge per pickup (Rs.)" type="number" min="0" defaultValue="500" />
          </div>
          <p className="mt-4 rounded-[var(--radius-md)] bg-surface-sunken p-3.5 text-sm text-text-muted">
            Estates with the <strong className="text-text">self-delivery exemption</strong> are excluded from transport
            cost automatically — no per-estate configuration needed here.
          </p>
        </Card>
      )}

      {tab === 'items' && (
        <Card className="max-w-2xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-heading">Beneficiary item types (§8.1.5)</h3>
            <Button size="sm" variant="secondary" onClick={() => toast('Item type added (demo)')}>
              <Plus className="size-4" /> Add Item Type
            </Button>
          </div>
          <ul className="divide-y divide-border rounded-[var(--radius-md)] border border-border">
            {ITEM_TYPES.map((t) => (
              <li key={t.name} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-medium text-text">{t.name}</span>
                <span className="text-xs text-text-muted">Unit: {t.unit}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-text-muted">
            Feeds the beneficiary-item workflow if that scope folds into Fertilizer Inventory later.
          </p>
        </Card>
      )}

      {/* Publish a new grade-rate version — the one real write on this page. */}
      <LightConfirmModal
        open={confirmVersion}
        onClose={() => setConfirmVersion(false)}
        onConfirm={() => publishMutation.mutate()}
        loading={publishMutation.isPending}
        title="Publish new grade rates"
        confirmLabel="Publish Version"
        message={
          <>
            New rates of <strong>Super Rs. {newSuper}/kg</strong> · <strong>Normal Rs. {newNormal}/kg</strong> take
            effect from <strong>{formatDate(newEffective)}</strong>. Settlements before that date keep the rates in
            force at collection time. This is recorded in the audit log.
          </>
        }
      />

      {/* General / transport / items aren't backed by a table yet — save is a stub. */}
      <LightConfirmModal
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={save}
        loading={saving}
        title="Save factory setup"
        confirmLabel="Save Changes"
        message="General info, transport rates and beneficiary items aren't persisted server-side yet — this is a demo save."
      />
    </AdminGuard>
  )
}
