import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react'
import type { AppNotification, NotificationTone } from '@/types'
import { formatRelative } from '@/lib/format'
import { cn } from '@/lib/cn'

const toneMap: Record<NotificationTone, { cls: string; icon: typeof Info }> = {
  success: { cls: 'bg-success-bg text-success-fg', icon: CheckCircle2 },
  warning: { cls: 'bg-warning-bg text-warning-fg', icon: AlertTriangle },
  danger: { cls: 'bg-danger-bg text-danger-fg', icon: XCircle },
  info: { cls: 'bg-approved-bg text-approved-fg', icon: Info },
}

/* Single NotificationCard shared by the header dropdown and the full page, so both stay identical. */
export function NotificationCard({ n, onClick }: { n: AppNotification; onClick?: () => void }) {
  const tone = toneMap[n.tone]
  const Icon = tone.icon
  return (
    <button
      onClick={onClick}
      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-hover"
    >
      <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full', tone.cls)}>
        <Icon className="size-4" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block text-sm', n.read ? 'text-text-muted' : 'font-medium text-text')}>
          {n.title}
        </span>
        <span className="mt-0.5 block text-xs text-text-muted">{formatRelative(n.time)}</span>
      </span>
      {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" aria-label="Unread" />}
    </button>
  )
}
