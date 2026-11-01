import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { History, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { ErrorState } from '@/components/data/ErrorState'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import * as estatesService from '@/services/estates'
import { ESTATE_RECOVERY_TONE } from './estate-advance-filters'
import { formatCurrency, formatDate } from '@/lib/format'

/*
  EST-05 detail (Estate-Owner-Advances-Addendum §3): one estate advance — who it went to, why, and
  its deduction schedule: each processed settlement that recovered part of it, then the pending
  settlement that's planned to. Balances come from the server's estate-advance-balance.ts.
*/
export function EstateAdvanceDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['estates', 'advances', 'detail', id],
    queryFn: () => estatesService.getAdvance(id),
  })

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }
  if (isError) {
    return <ErrorState title="Couldn't load this advance" description="It may not exist." onRetry={() => void refetch()} />
  }

  const { advance: a, recoveries, planned } = data
  const fact = (label: string, value: ReactNode) => (
    <div className="flex justify-between gap-4 border-t border-border py-2 text-sm first:border-t-0">
      <span className="text-text-muted">{label}</span>
      <span className="text-right text-text">{value}</span>
    </div>
  )

  return (
    <div>
      <PageHeader
        title={`${a.estateName} — ${formatCurrency(a.amount)}`}
        breadcrumb={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Estate Owner Advances', to: '/estates/advances' },
          { label: a.id },
        ]}
        description={`${a.ownerName} · ${a.route || 'No route'}`}
        actions={
          <Button variant="secondary" onClick={() => navigate(`/estates/${a.estateId}?tab=timeline`)}>
            <History className="size-4" /> Owner's full history
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge tone={ESTATE_RECOVERY_TONE[a.recovery]}>{a.recovery}</StatusBadge>
        <span className="text-xs text-text-muted">
          issued by {a.issuedBy} on {formatDate(a.dateIssued)}
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card className="p-0">
          <CardHeader className="px-5 pt-4">
            <CardTitle>Deduction schedule</CardTitle>
          </CardHeader>
          {recoveries.length === 0 && !planned ? (
            <p className="px-5 pb-4 text-sm text-text-muted">
              {a.remaining > 0
                ? 'Not deducted yet — it comes off this estate’s next processed settlement.'
                : 'No settlement is on record for this advance.'}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken text-[11px] uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="px-5 py-2 text-left">Settlement</th>
                  <th className="px-5 py-2 text-left">Period</th>
                  <th className="px-5 py-2 text-left">Status</th>
                  <th className="px-5 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recoveries.map((r) => (
                  <tr key={r.settlementId} className="border-t border-border">
                    <td className="px-5 py-2">
                      <Link to={`/estates/settlements/${r.settlementId}`} className="id text-primary hover:underline">
                        {r.settlementId}
                      </Link>
                    </td>
                    <td className="px-5 py-2">{r.period}</td>
                    <td className="px-5 py-2">
                      <StatusBadge tone="success">Recovered</StatusBadge>
                      <span className="block text-xs text-text-muted">{formatDate(r.recoveredAt)}</span>
                    </td>
                    <td className="tabular px-5 py-2 text-right">{formatCurrency(r.amount)}</td>
                  </tr>
                ))}
                {planned && (
                  <tr className="border-t border-border">
                    <td className="px-5 py-2">
                      <Link to={`/estates/settlements/${planned.settlementId}`} className="id text-primary hover:underline">
                        {planned.settlementId}
                      </Link>
                    </td>
                    <td className="px-5 py-2">{planned.period}</td>
                    <td className="px-5 py-2">
                      <StatusBadge tone="warning">Planned</StatusBadge>
                      <span className="block text-xs text-text-muted">settlement still pending</span>
                    </td>
                    <td className="tabular px-5 py-2 text-right">
                      {formatCurrency(planned.advanceDeduction)}
                      <span className="block text-xs text-text-muted">advance deduction on that settlement</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Advance</CardTitle>
          </CardHeader>
          {fact('Reference', <span className="id">{a.id}</span>)}
          {fact(
            'Estate',
            <Link to={`/estates/${a.estateId}`} className="text-primary hover:underline">
              {a.estateName}
            </Link>,
          )}
          {fact('Owner', a.ownerName)}
          {fact('Reason', a.reason)}
          {fact('Amount', <span className="tabular">{formatCurrency(a.amount)}</span>)}
          {fact('Deducted', <span className="tabular">{formatCurrency(a.recovered)}</span>)}
          {fact('Remaining', <span className="tabular font-semibold text-text-heading">{formatCurrency(a.remaining)}</span>)}
        </Card>
      </div>
    </div>
  )
}
