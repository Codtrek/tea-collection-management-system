import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { History, Info, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { ErrorState } from '@/components/data/ErrorState'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import * as estatesService from '@/services/estates'
import { formatCurrency, formatDate, formatWeight } from '@/lib/format'

/*
  EST-07 detail (Settlement-Period-View-Addendum): one settlement — the period's deliveries and
  grade lines, each deduction line and net payable. The stored totals are what was (or will be)
  paid; the lines are the supporting detail. The owner's full history is EST-10's timeline.
*/
export function SettlementDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['estates', 'settlements', 'detail', id],
    queryFn: () => estatesService.getSettlement(id),
  })

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }
  if (isError) {
    return <ErrorState title="Couldn't load this settlement" description="It may not exist." onRetry={() => void refetch()} />
  }

  const { settlement: s, deliveries, fertilizerCharges, advances } = data
  const back = `/estates/settlements?month=${s.month}`
  const chargesTotal = fertilizerCharges.reduce((sum, c) => sum + c.totalCharge, 0)
  const advancesTotal = advances.reduce((sum, a) => sum + a.amount, 0)
  const linesDiffer =
    Math.abs(chargesTotal - s.deductions.fertilizer) > 0.5 || Math.abs(advancesTotal - s.deductions.advances) > 0.5

  return (
    <div>
      <PageHeader
        title={`${s.estateName} — ${s.period}`}
        breadcrumb={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Settlements', to: back },
          { label: s.id },
        ]}
        description={`${s.ownerName} · ${s.route || 'No route'} · paid by ${s.paymentMethod === 'cash' ? 'cash' : 'bank'}`}
        actions={
          <Button variant="secondary" onClick={() => navigate(`/estates/${s.estateId}?tab=timeline`)}>
            <History className="size-4" /> Owner's full history
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge tone={s.status === 'Processed' ? 'success' : 'warning'}>{s.status}</StatusBadge>
        {s.processedOn && (
          <span className="text-xs text-text-muted">
            by {s.processedBy} on {formatDate(s.processedOn)}
          </span>
        )}
        {s.missingBank && <StatusBadge tone="danger">No bank details</StatusBadge>}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          <Card className="p-0">
            <CardHeader className="px-5 pt-4">
              <CardTitle>Deliveries in {s.period}</CardTitle>
            </CardHeader>
            {deliveries.length === 0 ? (
              <p className="px-5 pb-4 text-sm text-text-muted">No confirmed deliveries are on record for this month.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-surface-sunken text-[11px] uppercase tracking-wide text-text-muted">
                  <tr>
                    <th className="px-5 py-2 text-left">Delivery</th>
                    <th className="px-5 py-2 text-left">Date</th>
                    <th className="px-5 py-2 text-right">Super</th>
                    <th className="px-5 py-2 text-right">Normal</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map((d) => (
                    <tr key={d.id} className="border-t border-border">
                      <td className="px-5 py-2">
                        <Link to={`/collections/${d.id}`} className="id text-primary hover:underline">
                          {d.id}
                        </Link>
                      </td>
                      <td className="px-5 py-2">{formatDate(d.date)}</td>
                      <td className="tabular px-5 py-2 text-right">{formatWeight(d.superKg)}</td>
                      <td className="tabular px-5 py-2 text-right">{formatWeight(d.normalKg)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card className="p-0">
            <CardHeader className="px-5 pt-4">
              <CardTitle>Fertilizer charges</CardTitle>
            </CardHeader>
            {fertilizerCharges.length === 0 ? (
              <p className="px-5 pb-4 text-sm text-text-muted">No fertilizer charges recorded against this settlement.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {fertilizerCharges.map((c) => (
                  <li key={c.id} className="flex justify-between px-5 py-2">
                    <span>
                      <span className="id">{c.id}</span>
                      <span className="text-text-muted">
                        {' '}
                        · {formatDate(c.date)} · {formatWeight(c.quantityKg)} × {formatCurrency(c.ratePerKg)}
                      </span>
                    </span>
                    <span className="tabular">{formatCurrency(c.totalCharge)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-0">
            <CardHeader className="px-5 pt-4">
              <CardTitle>Owner advances</CardTitle>
            </CardHeader>
            {advances.length === 0 ? (
              <p className="px-5 pb-4 text-sm text-text-muted">No advances against this settlement.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {advances.map((a) => (
                  <li key={a.id} className="flex justify-between px-5 py-2">
                    <span>
                      <span className="id">{a.id}</span>
                      <span className="text-text-muted">
                        {' '}
                        · {formatDate(a.dateIssued)} · {a.reason} · {a.status}
                      </span>
                    </span>
                    <span className="tabular">{formatCurrency(a.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card className="h-fit p-5">
          <CardTitle className="mb-3">Net payable</CardTitle>
          <dl className="tabular grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-text-muted">
              Super {formatWeight(s.superKg)} × {formatCurrency(s.superRate)}
            </dt>
            <dd className="text-right">{formatCurrency(s.superKg * s.superRate)}</dd>
            <dt className="text-text-muted">
              Normal {formatWeight(s.normalKg)} × {formatCurrency(s.normalRate)}
            </dt>
            <dd className="text-right">{formatCurrency(s.normalKg * s.normalRate)}</dd>
            <dt className="font-medium">Gross revenue</dt>
            <dd className="text-right font-medium">{formatCurrency(s.gross)}</dd>
            <dt className="text-text-muted">− Fertilizer</dt>
            <dd className="text-right">{formatCurrency(s.deductions.fertilizer)}</dd>
            <dt className="text-text-muted">− Advances</dt>
            <dd className="text-right">{formatCurrency(s.deductions.advances)}</dd>
            <dt className="text-text-muted">− Other (transport{s.selfDelivery ? ', self-delivery' : ''})</dt>
            <dd className="text-right">{formatCurrency(s.deductions.other)}</dd>
            {s.adjustment !== 0 && (
              <>
                <dt className="text-text-muted">± Grading adjustment</dt>
                <dd className="text-right">{formatCurrency(s.adjustment)}</dd>
              </>
            )}
            <dt className="mt-2 border-t border-border pt-2 font-semibold text-text-heading">Net payable</dt>
            <dd className={`mt-2 border-t border-border pt-2 text-right font-semibold ${s.net <= 0 ? 'text-danger-fg' : 'text-text-heading'}`}>
              {formatCurrency(s.net)}
            </dd>
          </dl>
          {linesDiffer && (
            <p className="mt-3 flex gap-1.5 text-xs text-text-muted">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              The deduction totals are the amounts stored on this settlement; the lines listed don't add up to them exactly
              (older records were imported as totals).
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}
