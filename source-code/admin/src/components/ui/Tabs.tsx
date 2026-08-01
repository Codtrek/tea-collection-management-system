import { cn } from '@/lib/cn'

export interface TabItem {
  id: string
  label: string
}

export interface TabsProps {
  tabs: TabItem[]
  active: string
  onChange: (id: string) => void
  className?: string
}

/** Underline tab bar used by DetailPageWithTabs and multi-section screens. */
export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  return (
    <div role="tablist" className={cn('flex gap-1 border-b border-border', className)}>
      {tabs.map((t) => {
        const selected = t.id === active
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(t.id)}
            className={cn(
              'relative -mb-px h-10 px-3 text-sm font-medium transition-colors',
              selected ? 'text-primary' : 'text-text-muted hover:text-text',
            )}
          >
            {t.label}
            {selected && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-brand" />}
          </button>
        )
      })}
    </div>
  )
}
