import { StatusBadge, type BadgeTone } from '@/components/ui/StatusBadge'
import type { FactoryStatus, RequestStatus } from '../data/types'

type Status = RequestStatus | FactoryStatus

/* Thin domain → tone mapping over the shared StatusBadge; no styling of its own. */
const STATUS: Record<Status, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Pending', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  active: { label: 'Active', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
  suspended: { label: 'Suspended', tone: 'neutral' },
}

export function AdminStatusBadge({ status }: { status: Status }) {
  const s = STATUS[status]
  return <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
}
