import type { BadgeTone } from '@/components/ui/StatusBadge'
import type { AdvanceStatus, RecoveryStatus } from './types'

/* Status tones for Salary Advances — kept out of the page files (fast-refresh lint). */
export const ADVANCE_TONE: Record<AdvanceStatus, BadgeTone> = { Pending: 'warning', Approved: 'success', Rejected: 'danger' }

export const RECOVERY_TONE: Record<RecoveryStatus, BadgeTone> = {
  'Not started': 'neutral',
  Recovering: 'assigned',
  Recovered: 'success',
}
