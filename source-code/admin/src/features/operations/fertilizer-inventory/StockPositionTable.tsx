import { Fragment, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ArrowLeftRight, ShoppingCart } from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { CoverageBar } from '@/components/data/CoverageBar'
import { RowAction } from '@/components/data/DataTable'
import { BATCHES, batchStatus } from './data'
import { BATCH_TONE, COVERAGE_TONE } from './status'
import type { ItemPosition } from './types'
import { formatDate, formatWeight } from '@/lib/format'
import { cn } from '@/lib/cn'

/*
  FERT-01 item-level position table (addendum §5.2) with an expandable row per item
  revealing that item's batches — the original FERT-01 columns, relocated. Bespoke
  rather than the shared DataTable, which has no expand affordance.
*/
export function StockPositionTable({ positions, canLog }: { positions: ItemPosition[]; canLog: boolean }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (item: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(item)) next.delete(item)
      else next.add(item)
      return next
    })

  return (
    <div className="rounded-[var(--radius-lg)] bg-surface shadow-[var(--shadow-1)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse">
          <thead className="bg-surface-sunken">
            <tr className="border-b border-border">
              <th className="w-8 px-2 py-2.5" />
              <Th>Item</Th>
              <Th>Category</Th>
              <Th align="right">On hand</Th>
              <Th align="right">Committed</Th>
              <Th align="right">Available</Th>
              <Th align="right">Pending</Th>
              <Th>Coverage</Th>
              <Th>Status</Th>
              <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wide text-text-muted">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => {
              const open = expanded.has(p.item)
              const batches = BATCHES.filter((b) => b.item === p.item)
              return (
                <Fragment key={p.item}>
                  <tr
                    onClick={() => toggle(p.item)}
                    className="cursor-pointer border-b border-[#eff2ed] transition-colors last:border-0 hover:bg-surface-hover"
                  >
                    <td className="px-2 py-3">
                      <ChevronRight
                        className={cn('size-4 text-text-muted transition-transform', open && 'rotate-90')}
                        aria-hidden
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-text">{p.item}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{p.category}</td>
                    <td className="tabular px-4 py-3 text-right text-sm text-text">{formatWeight(p.onHand)}</td>
                    <td className="tabular px-4 py-3 text-right text-sm text-text">{formatWeight(p.committed)}</td>
                    <td
                      className={cn(
                        'tabular px-4 py-3 text-right text-sm font-semibold',
                        p.available < 0 ? 'text-danger-fg' : 'text-text-heading',
                      )}
                    >
                      {formatWeight(p.available)}
                    </td>
                    <td className="tabular px-4 py-3 text-right text-sm text-text-muted">{formatWeight(p.pendingDemand)}</td>
                    <td className="px-4 py-3">
                      <CoverageBar onHand={p.onHand} committed={p.committed} available={p.available} ratio={p.coverageRatio} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={COVERAGE_TONE[p.status]}>
                        {p.status === 'Short' ? `Short ${formatWeight(Math.max(0, -p.available) || p.pendingDemand - p.available)}` : p.status}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        {canLog && (
                          <>
                            <RowAction
                              icon={<ArrowLeftRight className="size-4" />}
                              label="Log movement"
                              onClick={() => navigate('/fertilizer/movement/new')}
                            />
                            <RowAction
                              icon={<ShoppingCart className="size-4" />}
                              label="Order more"
                              onClick={() => navigate('/fertilizer/movement/new')}
                            />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>

                  {open && (
                    <tr className="bg-surface-sunken/40">
                      <td />
                      <td colSpan={9} className="px-4 pb-4 pt-1">
                        <div className="overflow-hidden rounded-[var(--radius-md)] border border-border">
                          <table className="w-full border-collapse text-sm">
                            <thead className="bg-surface-sunken">
                              <tr className="border-b border-border text-[11px] uppercase tracking-wide text-text-muted">
                                <Th>Batch</Th>
                                <Th align="right">Quantity</Th>
                                <Th>Received</Th>
                                <Th>Expiry</Th>
                                <Th>Status</Th>
                                <Th>Location</Th>
                              </tr>
                            </thead>
                            <tbody>
                              {batches.map((b) => (
                                <tr
                                  key={b.id}
                                  onClick={() => navigate(`/fertilizer/${b.id}`)}
                                  className="cursor-pointer border-b border-[#eff2ed] transition-colors last:border-0 hover:bg-surface-hover"
                                >
                                  <td className="id px-4 py-2.5 text-xs text-text-muted">{b.id}</td>
                                  <td className="tabular px-4 py-2.5 text-right text-text">{formatWeight(b.quantityKg)}</td>
                                  <td className="px-4 py-2.5 text-text">{formatDate(b.receivedDate)}</td>
                                  <td className="px-4 py-2.5 text-text">{formatDate(b.expiryDate)}</td>
                                  <td className="px-4 py-2.5">
                                    <StatusBadge tone={BATCH_TONE[batchStatus(b)]}>{batchStatus(b)}</StatusBadge>
                                  </td>
                                  <td className="px-4 py-2.5 text-text">{b.location}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Th({ children, align }: { children?: React.ReactNode; align?: 'right' }) {
  return (
    <th
      className={cn(
        'px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-text-muted',
        align === 'right' ? 'text-right' : 'text-left',
      )}
    >
      {children}
    </th>
  )
}
