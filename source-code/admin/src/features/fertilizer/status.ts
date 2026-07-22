import type { BadgeTone } from '@/components/ui/StatusBadge'
import type { BatchStatus, CoverageStatus, RequestStatus } from './types'

export const BATCH_TONE: Record<BatchStatus, BadgeTone> = {
  Fresh: 'success',
  'Expiring soon': 'warning',
  Expired: 'danger',
  Discarded: 'neutral',
}

/* Request lifecycle → existing badge tones (addendum §4 — no new color tokens). */
export const REQUEST_TONE: Record<RequestStatus, BadgeTone> = {
  Submitted: 'submitted',
  Approved: 'approved',
  'Partially Dispatched': 'warning',
  Dispatched: 'success',
  Deducted: 'gradeNormal',
  Rejected: 'danger',
  Cancelled: 'neutral',
}

export const COVERAGE_TONE: Record<CoverageStatus, BadgeTone> = {
  Healthy: 'success',
  Tight: 'warning',
  Short: 'danger',
}
