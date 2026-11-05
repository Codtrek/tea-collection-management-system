import { useMemo, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown, Columns3, Rows2, Rows3 } from 'lucide-react'
import { Checkbox } from '@/components/ui/Checkbox'
import { Popover } from '@/components/ui/Popover'
import { cn } from '@/lib/cn'

export interface Column<T> {
  key: string
  header: string
  /** cell renderer; falls back to String(row[key]) */
  render?: (row: T) => ReactNode
  align?: 'left' | 'right'
  className?: string
  /** enables click-to-sort on this header; required alongside `sortValue` */
  sortable?: boolean
  /** raw comparable value for sorting — most columns render JSX, so this can't fall back to `render()` */
  sortValue?: (row: T) => string | number
  /** shows this column in the "Columns" visibility popover (default columns not marked hideable are always shown) */
  hideable?: boolean
}

type SortDirection = 'asc' | 'desc' | null

export interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  /** right-aligned per-row quick actions */
  actions?: (row: T) => ReactNode
  onRowClick?: (row: T) => void
  /** enables the bulk-select column + returns selected keys */
  selectable?: boolean
  onSelectionChange?: (keys: string[]) => void
  pageSize?: number
  emptyState?: ReactNode
  /** column key + direction to sort by before any user interaction */
  defaultSort?: { key: string; direction: 'asc' | 'desc' }
  /**
   * enables the "Columns" visibility popover for columns marked `hideable`,
   * persisting the choice to localStorage under this key (same mechanism as
   * the density toggle) — omit to keep every column always visible, as today
   */
  columnPrefsKey?: string
  /** column keys hidden before any user choice or saved preference exists */
  initialHidden?: string[]
  /** rowKey of a single row to visually highlight (e.g. a deep-linked record) — same tint the bulk-select path uses */
  highlightRowKey?: string
}

/*
  Reusable DataTable (master §11 / foundations §5). Sticky header, hover-only
  rows (no zebra), density toggle (persisted), bulk select, pagination, right-
  aligned numeric columns. Reused by every list screen across modules.
*/
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  actions,
  onRowClick,
  selectable,
  onSelectionChange,
  pageSize = 8,
  emptyState,
  defaultSort,
  columnPrefsKey,
  initialHidden,
  highlightRowKey,
}: DataTableProps<T>) {
  const [page, setPage] = useState(0)
  const [compact, setCompact] = useState(() => localStorage.getItem('harboost.table.compact') === '1')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState<{ key: string; direction: SortDirection }>(
    () => defaultSort ?? { key: '', direction: null },
  )
  const [hidden, setHidden] = useState<Set<string>>(() => {
    if (!columnPrefsKey) return new Set(initialHidden ?? [])
    try {
      const raw = localStorage.getItem(`harboost.table.columns.${columnPrefsKey}`)
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set(initialHidden ?? [])
    } catch {
      return new Set(initialHidden ?? [])
    }
  })

  const visibleColumns = useMemo(() => columns.filter((c) => !hidden.has(c.key)), [columns, hidden])
  const hideableColumns = useMemo(() => columns.filter((c) => c.hideable), [columns])

  const sortedRows = useMemo(() => {
    if (!sort.direction || !sort.key) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col?.sortValue) return rows
    const dir = sort.direction === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const av = col.sortValue!(a)
      const bv = col.sortValue!(b)
      if (av === bv) return 0
      return av > bv ? dir : -dir
    })
  }, [rows, sort, columns])

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize))
  const start = page * pageSize
  const pageRows = sortedRows.slice(start, start + pageSize)

  const toggleDensity = () => {
    setCompact((c) => {
      localStorage.setItem('harboost.table.compact', c ? '0' : '1')
      return !c
    })
  }

  const cycleSort = (key: string) => {
    setSort((s) => {
      if (s.key !== key) return { key, direction: 'asc' }
      if (s.direction === 'asc') return { key, direction: 'desc' }
      return { key: '', direction: null }
    })
    setPage(0)
  }

  const toggleColumn = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      if (columnPrefsKey) {
        localStorage.setItem(`harboost.table.columns.${columnPrefsKey}`, JSON.stringify([...next]))
      }
      return next
    })
  }

  const setSel = (next: Set<string>) => {
    setSelected(next)
    onSelectionChange?.([...next])
  }
  const toggleRow = (key: string) => {
    const next = new Set(selected)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setSel(next)
  }
  const allOnPageSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(rowKey(r)))
  const toggleAll = () => {
    const next = new Set(selected)
    if (allOnPageSelected) pageRows.forEach((r) => next.delete(rowKey(r)))
    else pageRows.forEach((r) => next.add(rowKey(r)))
    setSel(next)
  }

  if (rows.length === 0 && emptyState) return <>{emptyState}</>

  const rowPad = compact ? 'h-11' : 'h-[52px]'

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-xs text-text-muted">
          {selected.size > 0 ? `${selected.size} selected` : `${sortedRows.length} records`}
        </span>
        <div className="flex items-center gap-1">
          {columnPrefsKey && hideableColumns.length > 0 && (
            <Popover
              trigger={(open) => (
                <span
                  aria-label="Choose columns"
                  className={cn(
                    'flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-text-muted hover:bg-surface-hover hover:text-text',
                    open && 'bg-surface-hover text-text',
                  )}
                >
                  <Columns3 className="size-4" />
                </span>
              )}
              panelClassName="min-w-[200px] p-2"
            >
              {() => (
                <div className="flex flex-col gap-1">
                  <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-text-muted">Columns</p>
                  {hideableColumns.map((c) => (
                    <label
                      key={c.key}
                      className="flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-sm text-text hover:bg-surface-hover"
                    >
                      <Checkbox checked={!hidden.has(c.key)} onChange={() => toggleColumn(c.key)} />
                      {c.header}
                    </label>
                  ))}
                </div>
              )}
            </Popover>
          )}
          <button
            onClick={toggleDensity}
            aria-label="Toggle row density"
            className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-text-muted hover:bg-surface-hover hover:text-text"
          >
            {compact ? <Rows3 className="size-4" /> : <Rows2 className="size-4" />}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <thead className="sticky top-0 z-10 bg-surface-sunken">
            <tr className="border-b border-border">
              {selectable && (
                <th className="w-10 px-4 py-2.5">
                  <Checkbox checked={allOnPageSelected} onChange={toggleAll} aria-label="Select all on page" />
                </th>
              )}
              {visibleColumns.map((c) => {
                const isSorted = sort.key === c.key && sort.direction
                return (
                  <th
                    key={c.key}
                    aria-sort={isSorted ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={cn(
                      'px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-text-muted',
                      c.align === 'right' ? 'text-right' : 'text-left',
                    )}
                  >
                    {c.sortable ? (
                      <button
                        type="button"
                        onClick={() => cycleSort(c.key)}
                        className={cn(
                          'inline-flex items-center gap-1 hover:text-text',
                          c.align === 'right' && 'flex-row-reverse',
                          isSorted && 'text-text',
                        )}
                      >
                        {c.header}
                        {isSorted ? (
                          sort.direction === 'asc' ? (
                            <ChevronUp className="size-3.5" aria-hidden />
                          ) : (
                            <ChevronDown className="size-3.5" aria-hidden />
                          )
                        ) : (
                          <ChevronsUpDown className="size-3.5 opacity-50" aria-hidden />
                        )}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                )
              })}
              {actions && <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wide text-text-muted">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => {
              const key = rowKey(row)
              return (
                <tr
                  key={key}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'border-b border-[#eff2ed] transition-colors last:border-0',
                    onRowClick && 'cursor-pointer',
                    'hover:bg-surface-hover',
                    (selected.has(key) || key === highlightRowKey) && 'bg-brand-soft/50',
                  )}
                >
                  {selectable && (
                    <td className={cn('px-4', rowPad)} onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selected.has(key)} onChange={() => toggleRow(key)} aria-label="Select row" />
                    </td>
                  )}
                  {visibleColumns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        'px-4 text-sm text-text',
                        rowPad,
                        c.align === 'right' && 'tabular text-right',
                        c.className,
                      )}
                    >
                      {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')}
                    </td>
                  ))}
                  {actions && (
                    <td className={cn('px-4 text-right', rowPad)} onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">{actions(row)}</div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
          <span className="text-xs text-text-muted">
            Showing {start + 1}–{Math.min(start + pageSize, sortedRows.length)} of {sortedRows.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="Previous page"
              className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-text-muted hover:bg-surface-hover disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="tabular px-2 text-xs text-text-muted">
              {page + 1} / {pageCount}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={page === pageCount - 1}
              aria-label="Next page"
              className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-text-muted hover:bg-surface-hover disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Icon-only row action button with a 44px hit-area over a 32px visual (foundations §5). */
export function RowAction({ icon, label, onClick, tone }: { icon: ReactNode; label: string; onClick: () => void; tone?: 'default' | 'danger' }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      aria-label={label}
      title={label}
      className={cn(
        'flex size-8 items-center justify-center rounded-[var(--radius-sm)] p-1.5 transition-colors',
        tone === 'danger'
          ? 'text-text-muted hover:bg-danger-bg hover:text-danger-fg'
          : 'text-text-muted hover:bg-surface-hover hover:text-text',
      )}
    >
      {icon}
    </button>
  )
}
