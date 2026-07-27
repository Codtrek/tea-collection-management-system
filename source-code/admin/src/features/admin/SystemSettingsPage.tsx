import { useState } from 'react'
import { Cloud, MessageSquareText } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { AdminGuard } from './AdminGuard'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Toggle } from '@/components/ui/Toggle'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useToast } from '@/components/ui/Toast'

/*
  ADM-03 — system-level configuration. Localization is omitted entirely: the
  v1 decision is an English-only web portal (§14). Integration cards are
  status display only — Cloudinary/SMS are configured outside the UI.
*/

const NOTIFICATION_TYPES = [
  { key: 'route-assigned', label: 'Route Assigned', hint: 'Agent gets their day’s route' },
  { key: 'advance-approved', label: 'Advance Approved', hint: 'Employee/estate advance decisions' },
  { key: 'fertilizer-expiry', label: 'Low / Expiring Fertilizer Stock', hint: 'Feeds FERT-04 alerts' },
  { key: 'payment-processed', label: 'Payment Processed', hint: 'Settlement & payroll completion' },
  { key: 'weight-mismatch', label: 'Weight Mismatch Complaint', hint: 'Owner-reported discrepancies' },
]

export function SystemSettingsPage() {
  const { toast } = useToast()
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATION_TYPES.map((n) => [n.key, true])),
  )
  const [saving, setSaving] = useState(false)

  const save = () => {
    setSaving(true)
    setTimeout(() => {
      toast('System settings saved')
      setSaving(false)
    }, 600)
  }

  return (
    <AdminGuard>
      <PageHeader
        title="System Settings"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Administration' }, { label: 'System Settings' }]}
        actions={
          <Button onClick={save} loading={saving}>
            Save Settings
          </Button>
        }
      />

      <div className="grid max-w-4xl gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <ul className="flex flex-col divide-y divide-border">
            {NOTIFICATION_TYPES.map((n) => (
              <li key={n.key} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-text">{n.label}</p>
                  <p className="text-xs text-text-muted">{n.hint}</p>
                </div>
                <Toggle
                  checked={enabled[n.key]}
                  onChange={(v) => setEnabled((prev) => ({ ...prev, [n.key]: v }))}
                  label={enabled[n.key] ? 'On' : 'Off'}
                />
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-border pt-4">
            <Select
              label="Default delivery channel"
              defaultValue="in-app"
              options={[
                { value: 'in-app', label: 'In-app only' },
                { value: 'in-app-email', label: 'In-app + Email' },
              ]}
            />
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Session & security</CardTitle>
            </CardHeader>
            <div className="grid gap-4">
              <Select
                label="Session timeout"
                defaultValue="30"
                options={[
                  { value: '15', label: '15 minutes' },
                  { value: '30', label: '30 minutes' },
                  { value: '60', label: '1 hour' },
                ]}
              />
              <Select
                label="Password policy"
                defaultValue="standard"
                options={[
                  { value: 'standard', label: 'Standard — 8+ chars, 1 number' },
                  { value: 'strict', label: 'Strict — 12+ chars, mixed case, symbol' },
                ]}
              />
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
            </CardHeader>
            <ul className="flex flex-col gap-3">
              <li className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border p-3.5">
                <span className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-brand-soft text-primary">
                    <Cloud className="size-4" />
                  </span>
                  <span className="text-sm font-medium text-text">Cloudinary (photo storage)</span>
                </span>
                <StatusBadge tone="success">Connected</StatusBadge>
              </li>
              <li className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border p-3.5">
                <span className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-brand-soft text-primary">
                    <MessageSquareText className="size-4" />
                  </span>
                  <span className="text-sm font-medium text-text">SMS / Email gateway</span>
                </span>
                <StatusBadge tone="warning">Not Connected</StatusBadge>
              </li>
            </ul>
            <p className="mt-3 text-xs text-text-muted">Status display only — integrations are configured outside the UI.</p>
          </Card>
        </div>
      </div>
    </AdminGuard>
  )
}
