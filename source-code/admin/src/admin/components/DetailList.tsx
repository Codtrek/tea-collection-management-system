import type { ReactNode } from 'react'

export function DetailList({ items }: { items: [label: string, value: ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs text-text-muted">{label}</dt>
          <dd className="mt-0.5 break-words text-sm font-medium text-text">{value || '—'}</dd>
        </div>
      ))}
    </dl>
  )
}
