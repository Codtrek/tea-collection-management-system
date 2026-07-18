import type { BadgeTone } from '@/components/ui/StatusBadge'
import type { BatchStatus } from './types'

export const BATCH_TONE: Record<BatchStatus, BadgeTone> = {
  Fresh: 'success',
  'Expiring soon': 'warning',
  Expired: 'danger',
  Discarded: 'neutral',
}
