import type { BadgeTone } from '@/components/ui/StatusBadge'
import type { CollectionRecord, CollectionStatus } from './types'

/* Status chain per master §5 + the web-originated provisional state. */
export const COLLECTION_TONE: Record<CollectionStatus, BadgeTone> = {
  Submitted: 'submitted',
  Approved: 'approved',
  'Agent Assigned': 'assigned',
  Collected: 'warning',
  Confirmed: 'success',
  'Pending Agent Confirmation': 'warning',
}

/** Editable only before the record is Confirmed (lock rule §7.1). */
export function isLocked(record: CollectionRecord): boolean {
  return record.status === 'Confirmed'
}
