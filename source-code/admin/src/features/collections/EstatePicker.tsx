import { useId, useMemo, useState } from 'react'
import { Check, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { cn } from '@/lib/cn'
import type { EstateDirectoryRow } from '@/features/estates/types'

interface EstatePickerProps {
  estates: EstateDirectoryRow[]
  /** the picked estate's id ('EST-0002') or '' */
  value: string
  onChange: (id: string) => void
  error?: string
}

const MAX_RESULTS = 8

/*
  Estate-first selection for COL-02: search by estate name, owner name or registration
  number (the 'EST-0002' id), optionally narrowed by route first. Picking an estate is the
  ONLY input — its route and today's agent are derived (shown read-only by the caller),
  never chosen here.
*/
export function EstatePicker({ estates, value, onChange, error }: EstatePickerProps) {
  const listId = useId()
  const [query, setQuery] = useState('')
  const [route, setRoute] = useState('')

  const selected = estates.find((e) => e.id === value)

  const routes = useMemo(() => [...new Set(estates.map((e) => e.route).filter(Boolean))].sort(), [estates])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return estates
      .filter(
        (e) =>
          (!route || e.route === route) &&
          (!q ||
            e.estateName.toLowerCase().includes(q) ||
            e.ownerName.toLowerCase().includes(q) ||
            e.id.toLowerCase().includes(q)),
      )
      .slice(0, MAX_RESULTS)
  }, [estates, query, route])

  if (selected) {
    return (
      <div>
        <p className="mb-1.5 text-sm font-medium text-text">Estate</p>
        <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border bg-surface px-3.5 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-text">{selected.estateName}</p>
            <p className="truncate text-xs text-text-muted">
              {selected.ownerName} · <span className="id">{selected.id}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Change estate"
            className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-text-muted hover:bg-surface-hover hover:text-text"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_170px]">
        <Input
          label="Estate"
          placeholder="Search estate, owner or registration no. (EST-…)"
          leadingIcon={<Search className="size-4" />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          error={error}
          aria-controls={listId}
        />
        <Select
          label="Filter by route"
          placeholder="All routes"
          value={route}
          onChange={(e) => setRoute(e.target.value)}
          options={routes.map((r) => ({ value: r, label: r }))}
        />
      </div>

      <ul
        id={listId}
        aria-label="Matching estates"
        className="max-h-64 divide-y divide-border overflow-y-auto rounded-[var(--radius-md)] border border-border bg-surface"
      >
        {results.length === 0 ? (
          <li className="px-3.5 py-3 text-sm text-text-muted">No active estate matches.</li>
        ) : (
          results.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => onChange(e.id)}
                className={cn('flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-surface-hover')}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-text">{e.estateName}</span>
                  <span className="block truncate text-xs text-text-muted">
                    {e.ownerName} · <span className="id">{e.id}</span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-xs text-text-muted">
                  {e.route || 'No route'}
                  <Check className="size-3.5 opacity-0" aria-hidden />
                </span>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
