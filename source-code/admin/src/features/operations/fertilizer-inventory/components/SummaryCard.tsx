import { cn } from '@/lib/cn'

type CardTone = 'default' | 'danger' | 'success'

interface SummaryCardProps {
  icon: React.ReactNode
  label: string
  value: string
  note: string
  tone?: CardTone
  onClick?: () => void
}

export default function SummaryCard({
  icon,
  label,
  value,
  note,
  tone = 'default',
  onClick,
}: SummaryCardProps) {
  const valueColor = tone === 'danger' ? 'text-danger-fg' : tone === 'success' ? 'text-success-fg' : 'text-text-heading'
  const iconWrap =
    tone === 'danger'
      ? 'bg-danger-bg text-danger-fg'
      : tone === 'success'
        ? 'bg-success-bg text-success-fg'
        : 'bg-brand-soft text-primary'

  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        'rounded-[var(--radius-lg)] bg-surface p-5 text-left shadow-[var(--shadow-1)] transition-shadow',
        onClick && 'hover:shadow-[var(--shadow-2)]',
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] font-medium text-text-muted">{label}</span>
        <span className={cn('flex size-8 items-center justify-center rounded-[var(--radius-sm)]', iconWrap)}>{icon}</span>
      </div>
      <p className={cn('tabular text-[28px] font-semibold leading-none tracking-tight', valueColor)}>{value}</p>
      <p className="mt-2 text-xs text-text-muted">{note}</p>
    </Wrapper>
  )
}