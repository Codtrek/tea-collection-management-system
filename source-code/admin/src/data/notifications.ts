import type { AppNotification } from '@/types'

/* Example notifications from global-cross-cutting §3 + master §15 types. */
export const NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n-1',
    tone: 'warning',
    title: 'Fertilizer batch FB-2291 expires in 3 days',
    time: '2026-07-17T09:20:00',
    read: false,
    type: 'Low / Expiring Fertilizer Stock',
    href: '/fertilizer/alerts',
  },
  {
    id: 'n-2',
    tone: 'success',
    title: 'Payment of Rs. 1,245,600 processed for Green Valley Estate',
    time: '2026-07-17T07:30:00',
    read: false,
    type: 'Payment Processed',
    href: '/estates/settlements',
  },
  {
    id: 'n-3',
    tone: 'danger',
    title: 'Weight mismatch reported for Collection GV-2026-0714',
    time: '2026-07-17T04:45:00',
    read: false,
    type: 'Weight Mismatch Complaint',
    href: '/collections/GV-2026-0714',
  },
  {
    id: 'n-4',
    tone: 'info',
    title: 'Advance request submitted by S. Fernando — Rs. 15,000',
    time: '2026-07-16T15:10:00',
    read: true,
    type: 'Advance Request Submitted',
    href: '/employees/advances',
  },
  {
    id: 'n-5',
    tone: 'success',
    title: 'Collection GV-2026-0712 confirmed with photo evidence',
    time: '2026-07-16T11:02:00',
    read: true,
    type: 'Collection Confirmed',
    href: '/collections',
  },
]

export const NOTIFICATION_TYPES = [
  'Collection Confirmed',
  'Delivery Finalized',
  'Payment Processed',
  'Fertilizer Request Approved / Rejected',
  'Advance Request Submitted',
  'Weight Mismatch Complaint',
  'Low / Expiring Fertilizer Stock',
  'System Alert',
]
