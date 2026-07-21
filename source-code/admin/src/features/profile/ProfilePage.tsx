import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Toggle } from '@/components/ui/Toggle'
import { StatusBadge, type BadgeTone } from '@/components/ui/StatusBadge'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import { DEFAULT_PERMISSIONS } from '@/context/permissions'
import { AvatarUploader } from './AvatarUploader'
import { NOTIFICATION_TYPES } from '@/data/notifications'
import { useState } from 'react'
import type { ModuleKey, Role } from '@/types'

const roleTone: Record<Role, BadgeTone> = {
  Administrator: 'gradeNormal',
  Officer: 'assigned',
  Manager: 'approved',
}

const MODULE_LABELS: Record<ModuleKey, string> = {
  dashboard: 'Dashboard',
  collection: 'Collection',
  fertilizer: 'Fertilizer',
  estateOwners: 'Estate Owners',
  payroll: 'Payroll',
  advances: 'Advances',
  employees: 'Employees',
  attendance: 'Attendance',
  performance: 'Performance',
  reports: 'Reports',
  administration: 'Administration',
}

export function ProfilePage() {
  const { user, logout } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATION_TYPES.map((t) => [t, true])),
  )

  if (!user) return null
  const perms = DEFAULT_PERMISSIONS[user.role]

  return (
    <div>
      <PageHeader title="Profile & Settings" breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Profile' }]} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <div className="flex items-center gap-4">
              <AvatarUploader />
              <div>
                <h2 className="text-lg font-semibold text-text-heading">{user.name}</h2>
                <p className="text-sm text-text-muted">{user.factory}</p>
                <div className="mt-1.5"><StatusBadge tone={roleTone[user.role]}>{user.role}</StatusBadge></div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader><CardTitle>Contact Details</CardTitle></CardHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Full name" defaultValue={user.name} />
              <Input label="Email" type="email" defaultValue={user.email} />
              <Input label="Contact number" defaultValue="+94 77 123 4567" />
              <Input label="Factory" defaultValue={user.factory} disabled />
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={() => toast('Profile updated')}>Save Changes</Button>
            </div>
          </Card>

          <Card>
            <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Current password" revealable placeholder="••••••••" />
              <div className="hidden sm:block" />
              <Input label="New password" revealable placeholder="••••••••" />
              <Input label="Confirm new password" revealable placeholder="••••••••" />
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="secondary" onClick={() => toast('Password changed')}>Change Password</Button>
            </div>
          </Card>

          <Card>
            <CardHeader><CardTitle>Notification Preferences</CardTitle></CardHeader>
            <div className="flex flex-col gap-3">
              {NOTIFICATION_TYPES.map((t) => (
                <div key={t} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                  <span className="text-sm text-text">{t}</span>
                  <Toggle checked={prefs[t]} onChange={(v) => setPrefs((p) => ({ ...p, [t]: v }))} />
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader><CardTitle>Your Permissions</CardTitle></CardHeader>
            <p className="mb-3 text-[13px] text-text-muted">
              Role is assigned by a Factory Administrator and isn't self-editable.
            </p>
            <ul className="flex flex-col gap-2">
              {(Object.keys(MODULE_LABELS) as ModuleKey[]).map((m) => (
                <li key={m} className="flex items-center justify-between text-sm">
                  <span className="text-text">{MODULE_LABELS[m]}</span>
                  <span className="text-xs capitalize text-text-muted">{perms[m]}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader><CardTitle>Session</CardTitle></CardHeader>
            <p className="text-[13px] text-text-muted">Signed in · Last active just now</p>
            <Button
              variant="danger"
              className="mt-4 w-full"
              onClick={() => {
                logout()
                navigate('/login')
              }}
            >
              <LogOut className="size-4" /> Logout
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
