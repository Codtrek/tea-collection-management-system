import { useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Rows2, Rows3 } from 'lucide-react'
import { Checkbox } from '@/components/ui/Checkbox'
import { cn } from '@/lib/cn'

export interface Column<T> {
  key: string
  header: string
  /** cell renderer; falls back to String(row[key]) */
  render?: (row: T) => ReactNode
  align?: 'left' | 'right'
  className?: string
}

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
}: DataTableProps<T>) {
  const [page, setPage] = useState(0)
  const [compact, setCompact] = useState(() => localStorage.getItem('harboost.table.compact') === '1')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const start = page * pageSize
  const pageRows = rows.slice(start, start + pageSize)

  const toggleDensity = () => {
    setCompact((c) => {
      localStorage.setItem('harboost.table.compact', c ? '0' : '1')
      return !c
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
          {selected.size > 0 ? `${selected.size} selected` : `${rows.length} records`}
        </span>
        <button
          onClick={toggleDensity}
          aria-label="Toggle row density"
          className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-text-muted hover:bg-surface-hover hover:text-text"
        >
          {compact ? <Rows3 className="size-4" /> : <Rows2 className="size-4" />}
        </button>
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
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    'px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-text-muted',
                    c.align === 'right' ? 'text-right' : 'text-left',
                  )}
                >
                  {c.header}
                </th>
              ))}
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
                    selected.has(key) && 'bg-brand-soft/50',
                  )}
                >
                  {selectable && (
                    <td className={cn('px-4', rowPad)} onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selected.has(key)} onChange={() => toggleRow(key)} aria-label="Select row" />
                    </td>
                  )}
                  {columns.map((c) => (
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
            Showing {start + 1}–{Math.min(start + pageSize, rows.length)} of {rows.length}
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
