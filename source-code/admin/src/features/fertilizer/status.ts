import type { BadgeTone } from '@/components/ui/StatusBadge'
import type { BatchStatus, CoverageStatus, NoticeStatus, PaymentMethod, PaymentStatus, RequestStatus } from './types'

export const BATCH_TONE: Record<BatchStatus, BadgeTone> = {
  Fresh: 'success',
  'Expiring soon': 'warning',
  Expired: 'danger',
  Discarded: 'neutral',
}

/* Request lifecycle → existing badge tones (no new colour tokens). */
export const REQUEST_TONE: Record<RequestStatus, BadgeTone> = {
  Requested: 'submitted',
  'Awaiting manager approval': 'warning',
  Approved: 'approved',
  'Partially approved': 'approved',
  Rejected: 'danger',
  'Ready for dispatch': 'assigned',
  'Picked up': 'assigned',
  'Out for delivery': 'assigned',
  'Partially delivered': 'warning',
  Delivered: 'success',
  Failed: 'danger',
  'Returned to factory': 'warning',
  Rescheduled: 'assigned',
  'Needs review': 'danger',
  Cancelled: 'neutral',
}

export const PAYMENT_TONE: Record<PaymentStatus, BadgeTone> = {
  'Not due': 'neutral',
  'Pending deduction': 'gradeNormal',
  Deducted: 'success',
  Unpaid: 'warning',
  'Part paid': 'warning',
  Paid: 'success',
}

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  deduct: 'Deduct from tea payment',
  cash: 'Cash',
  bank: 'Bank transfer',
}

export const NOTICE_TONE: Record<NoticeStatus, BadgeTone> = {
  Queued: 'submitted',
  Sent: 'success',
  'Stored, not delivered': 'neutral',
  Failed: 'danger',
  Cancelled: 'neutral',
}

export const COVERAGE_TONE: Record<CoverageStatus, BadgeTone> = {
  Healthy: 'success',
  Tight: 'warning',
  Short: 'danger',
}
