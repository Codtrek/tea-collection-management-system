import type { BadgeTone } from '@/components/ui/StatusBadge'

/* Shared by salary and estate owner advances — kept out of component files (fast-refresh lint). */
export type ScheduleStatus = 'Deducted' | 'Reserved' | 'Planned'

export const SCHEDULE_TONE: Record<ScheduleStatus, BadgeTone> = { Deducted: 'success', Reserved: 'assigned', Planned: 'neutral' }

export const RESCHEDULE_TONE: Record<'Pending' | 'Approved' | 'Rejected', BadgeTone> = {
  Pending: 'warning',
  Approved: 'success',
  Rejected: 'danger',
}
