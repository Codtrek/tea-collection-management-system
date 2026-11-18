import { useId, useState, type ReactNode } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { comboboxKey, filterOptions } from './combobox-logic'

export interface ComboboxProps<T> {
  label: string
  items: T[]
  /** the selected item's key, or '' for none */
  value: string
  onChange: (key: string) => void
  getKey: (item: T) => string
  /** the main line — and what the field shows once picked */
  getLabel: (item: T) => string
  /** the second line, to tell similar names apart, e.g. "EMP-0042 · Tea Collecting Agent" */
  getMeta?: (item: T) => string
  /** what typing matches against (default: label + meta) */
  getSearchText?: (item: T) => string
  placeholder?: string
  error?: string
  /** shown under the field (e.g. the picked employee's outstanding balance) */
  hint?: ReactNode
  /** "employees" → "No employees match 'pere'" */
  noun?: string
  /** options rendered at once; "Show more" adds another page (long rosters) */
  pageSize?: number
  /** lets the field be cleared back to "none" (filters: "All estates") */
  clearable?: boolean
  disabled?: boolean
  /** opt-in: a reason the option can't be picked (listed greyed, with a tooltip) — e.g. an inactive estate */
  getDisabledReason?: (item: T) => string | null
  /** the badge on a disabled option (default "Unavailable") */
  disabledBadge?: string
}

/*
  The ONE searchable picker for long lists of people or estates (Advance request, COL-02, the
  fertilizer request, estate advances, report filters). On focus it lists everything; typing
  filters by any part of the name or ID; ↑ ↓ move, Enter picks, Esc closes. The behaviour lives in
  combobox-logic.ts (unit-tested); this file only renders it. ARIA 1.2 combobox pattern.
*/
export function Combobox<T>({
  label,
  items,
  value,
  onChange,
  getKey,
  getLabel,
  getMeta,
  getSearchText,
  placeholder = 'Search…',
  error,
  hint,
  noun = 'results',
  pageSize = 50,
  clearable = true,
  disabled,
  getDisabledReason,
  disabledBadge = 'Unavailable',
}: ComboboxProps<T>) {
  const id = useId()
  const listId = `${id}-list`
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(-1)
  const [shown, setShown] = useState(pageSize)

  const selected = items.find((i) => getKey(i) === value)
  const textOf = getSearchText ?? ((i: T) => `${getLabel(i)} ${getMeta?.(i) ?? ''}`)
  const matches = filterOptions(items, query, textOf)
  const visible = matches.slice(0, shown)
  const reasonOf = (item: T) => getDisabledReason?.(item) ?? null
  const isDisabled = (i: number) => !!visible[i] && reasonOf(visible[i]) !== null

  const close = () => {
    setOpen(false)
    setActive(-1)
    setQuery('')
    setShown(pageSize)
  }
  const pick = (item: T) => {
    if (reasonOf(item) !== null) return
    onChange(getKey(item))
    close()
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium uppercase tracking-wide text-text-muted">
        {label}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" aria-hidden />
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && active >= 0 ? `${id}-opt-${active}` : undefined}
          aria-invalid={!!error}
          autoComplete="off"
          disabled={disabled}
          placeholder={selected ? undefined : placeholder}
          value={open ? query : selected ? getLabel(selected) : ''}
          onFocus={() => {
            setOpen(true)
            setActive(-1)
          }}
          onBlur={close}
          onChange={(e) => {
            const q = e.target.value
            setQuery(q)
            setOpen(true)
            // typing highlights the first match that can be picked, so Enter takes it
            setActive(q.trim() ? filterOptions(items, q, textOf).slice(0, pageSize).findIndex((i) => reasonOf(i) === null) : -1)
            setShown(pageSize)
          }}
          onKeyDown={(e) => {
            const r = comboboxKey({ open, active }, e.key, visible.length, isDisabled)
            if (!r.handled) return
            e.preventDefault()
            if (r.select) pick(visible[active])
            else if (!r.open) close()
            else {
              setOpen(true)
              setActive(r.active)
            }
          }}
          className={cn(
            'h-10 w-full rounded-[var(--radius-sm)] border bg-surface pl-9 pr-16 text-sm text-text placeholder:text-text-disabled transition-colors',
            'focus:border-primary focus:outline-none disabled:bg-surface-sunken',
            error ? 'border-danger' : 'border-border',
          )}
        />
        <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
          {clearable && selected && !disabled && (
            <button
              type="button"
              aria-label={`Clear ${label.toLowerCase()}`}
              // mousedown, so the input doesn't blur first
              onMouseDown={(e) => {
                e.preventDefault()
                onChange('')
              }}
              className="flex size-7 items-center justify-center rounded-[var(--radius-xs)] text-text-muted hover:text-text"
            >
              <X className="size-4" />
            </button>
          )}
          <ChevronDown className="size-4 text-text-muted" aria-hidden />
        </span>

        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-label={label}
            className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-[var(--radius-md)] border border-border bg-surface py-1 shadow-[var(--shadow-2)]"
          >
            {visible.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-text-muted" role="presentation">
                {query.trim() ? `No ${noun} match ‘${query.trim()}’` : `No ${noun}`}
              </li>
            ) : (
              visible.map((item, i) => {
                const key = getKey(item)
                const reason = reasonOf(item)
                return (
                  <li
                    key={key}
                    id={`${id}-opt-${i}`}
                    role="option"
                    aria-selected={key === value}
                    aria-disabled={reason !== null || undefined}
                    title={reason ?? undefined}
                    ref={i === active ? (el) => el?.scrollIntoView({ block: 'nearest' }) : undefined}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      pick(item)
                    }}
                    onMouseEnter={() => reason === null && setActive(i)}
                    className={cn(
                      'px-3 py-2',
                      reason !== null ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                      i === active ? 'bg-surface-hover' : '',
                      key === value && 'bg-brand-soft/50',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className={cn('block truncate text-sm font-medium', reason !== null ? 'text-text-muted' : 'text-text')}>{getLabel(item)}</span>
                      {reason !== null && (
                        <span className="shrink-0 rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] font-medium text-text-muted">{disabledBadge}</span>
                      )}
                    </span>
                    {getMeta && <span className="block truncate text-xs text-text-muted">{getMeta(item)}</span>}
                    {reason !== null && <span className="sr-only">{reason}</span>}
                  </li>
                )
              })
            )}
            {matches.length > visible.length && (
              <li role="presentation" className="border-t border-border px-3 py-2 text-xs text-text-muted">
                Showing {visible.length} of {matches.length} — keep typing to narrow, or{' '}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    setShown((n) => n + pageSize)
                  }}
                >
                  show more
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
      {error ? (
        <p className="text-xs text-danger-fg" role="alert">
          {error}
        </p>
      ) : (
        hint && <div className="text-xs text-text-muted">{hint}</div>
      )}
    </div>
  )
}
