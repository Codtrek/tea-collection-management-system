import { useId, useState, type ReactNode } from 'react'
import { ChevronDown, Info } from 'lucide-react'
import { Popover } from '@/components/ui/Popover'
import { cn } from '@/lib/cn'

type CardTone = 'default' | 'danger' | 'success'

/**
 * A FERT-01 summary card. Clicking it (or Enter/Space on it) opens the exact records it counts,
 * through `onOpen`. The (i) button states the card's rule, and `preview` (when given) opens on
 * hover, on keyboard focus, or on tap of the chevron for touch screens. The primary action is a
 * stretched button laid over the card, with the (i) and chevron buttons stacked above it as its
 * siblings, so no button is nested inside another.
 */
export function SummaryCard({
  icon,
  label,
  value,
  note,
  rule,
  tone = 'default',
  onOpen,
  openLabel,
  preview,
}: {
  icon: ReactNode
  label: string
  value: string
  note: string
  /** the exact rule, shown by the (i) button */
  rule: ReactNode
  tone?: CardTone
  /** opens the records behind the number; omit to make the card static */
  onOpen?: () => void
  /** what `onOpen` does, for screen readers, e.g. "Show these items in the table" */
  openLabel?: string
  preview?: ReactNode
}) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const previewId = useId()
  const valueColor = tone === 'danger' ? 'text-danger-fg' : tone === 'success' ? 'text-success-fg' : 'text-text-heading'
  const iconWrap =
    tone === 'danger'
      ? 'bg-danger-bg text-danger-fg'
      : tone === 'success'
        ? 'bg-success-bg text-success-fg'
        : 'bg-brand-soft text-primary'

  return (
    <div
      className={cn(
        'relative rounded-[var(--radius-lg)] bg-surface p-5 text-left shadow-[var(--shadow-1)] transition-shadow',
        onOpen && 'hover:shadow-[var(--shadow-2)] focus-within:shadow-[var(--shadow-2)]',
      )}
      onMouseEnter={() => preview && setPreviewOpen(true)}
      onMouseLeave={() => setPreviewOpen(false)}
    >
      {onOpen && (
        <button
          type="button"
          onClick={onOpen}
          onFocus={() => preview && setPreviewOpen(true)}
          aria-label={`${label}: ${value}. ${openLabel ?? 'Open the records'}`}
          aria-describedby={preview && previewOpen ? previewId : undefined}
          className="absolute inset-0 cursor-pointer rounded-[var(--radius-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        />
      )}
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1 text-[13px] font-medium text-text-muted">
          <span className="truncate">{label}</span>
          <span className="relative z-10">
            <Popover
              align="left"
              panelClassName="w-72 p-3"
              trigger={() => (
                <span className="inline-flex items-center rounded-full text-text-muted hover:text-primary">
                  <Info className="size-3.5" aria-hidden />
                  <span className="sr-only">How “{label}” is counted</span>
                </span>
              )}
            >
              {() => <div className="text-xs font-normal text-text">{rule}</div>}
            </Popover>
          </span>
        </span>
        <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)]', iconWrap)}>{icon}</span>
      </div>
      <p className={cn('tabular text-[28px] font-semibold leading-none tracking-tight', valueColor)}>{value}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="text-xs text-text-muted">{note}</p>
        {preview && (
          // touch screens have no hover: the chevron opens the preview without leaving the page
          <button
            type="button"
            onClick={() => setPreviewOpen((o) => !o)}
            aria-expanded={previewOpen}
            aria-controls={previewId}
            className="relative z-10 -mb-1 -mr-1 flex size-6 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-surface-hover hover:text-primary"
          >
            <ChevronDown className={cn('size-4 transition-transform', previewOpen && 'rotate-180')} aria-hidden />
            <span className="sr-only">{previewOpen ? 'Hide preview' : 'Show preview'}</span>
          </button>
        )}
      </div>
      {preview && previewOpen && (
        // padding, not margin, above the panel: the pointer can cross into it without leaving the card
        <div className="absolute inset-x-0 top-full z-30 pt-1">
          <div
            id={previewId}
            role="region"
            aria-label={`${label} preview`}
            className="animate-fade-up rounded-[var(--radius-lg)] border border-border bg-surface p-3 text-xs shadow-[var(--shadow-3)]"
          >
            {preview}
          </div>
        </div>
      )}
    </div>
  )
}
