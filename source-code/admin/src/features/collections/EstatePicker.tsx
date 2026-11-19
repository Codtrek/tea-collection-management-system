import { useMemo, useState } from 'react'
import { Combobox } from '@/components/ui/Combobox'
import { Select } from '@/components/ui/Select'
import type { EstateDirectoryRow } from '@/features/estates/types'

interface EstatePickerProps {
  estates: EstateDirectoryRow[]
  /** the picked estate's id ('EST-0002') or '' */
  value: string
  onChange: (id: string) => void
  error?: string
}

/*
  Estate-first selection for COL-02: search by estate name, owner name or registration
  number (the 'EST-0002' id), optionally narrowed by route first. Picking an estate is the
  ONLY input — its route and today's agent are derived (shown read-only by the caller),
  never chosen here. Built on the shared Combobox (the one picker for long lists).
*/
export function EstatePicker({ estates, value, onChange, error }: EstatePickerProps) {
  const [route, setRoute] = useState('')
  const routes = useMemo(() => [...new Set(estates.map((e) => e.route).filter(Boolean))].sort(), [estates])
  const items = useMemo(
    () =>
      estates
        .filter((e) => !route || e.route === route || e.id === value)
        .sort((a, b) => a.estateName.localeCompare(b.estateName)),
    [estates, route, value],
  )

  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_170px]">
      <Combobox
        label="Estate"
        placeholder="Search estate, owner or registration no. (EST-…)"
        noun="estates"
        items={items}
        value={value}
        onChange={onChange}
        getKey={(e) => e.id}
        getLabel={(e) => e.estateName}
        getMeta={(e) => `${e.ownerName} · ${e.id} · ${e.route || 'No route'}`}
        error={error}
      />
      <Select
        label="Filter by route"
        placeholder="All routes"
        value={route}
        onChange={(e) => setRoute(e.target.value)}
        options={routes.map((r) => ({ value: r, label: r }))}
      />
    </div>
  )
}
