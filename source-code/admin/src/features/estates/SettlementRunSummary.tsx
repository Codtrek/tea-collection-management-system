import { cn } from '@/lib/cn'
import { excludedReasons, ratePeriodsText, totalsLines } from './settlement-run'
import type { RunTotals, SettlementRun } from './settlement-run-types'

/*
  The run's totals. The Process page's totals row and the confirm popup both render THIS, from the
  same `run.totals` object the backend processes with — they can't disagree (settlement-run.test.ts).
*/
export function RunTotalsList({ totals, className }: { totals: RunTotals; className?: string }) {
  return (
    <dl className={cn('tabular grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm', className)}>
      {totalsLines(totals).map((l) => (
        <div key={l.key} className={cn('contents', l.strong && 'font-semibold')}>
          <dt className={l.strong ? 'text-text' : 'text-text-muted'}>{l.label}</dt>
          <dd className={cn('text-right', l.strong ? 'text-text-heading' : 'text-text')} data-total={l.key}>
            {l.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** The confirm popup's review: period, who is in and out (and why), rate periods, totals. */
export function RunConfirmSummary({ run }: { run: SettlementRun }) {
  const out = excludedReasons(run)
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-border p-4 text-sm">
      <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
        <span className="text-text-muted">Period</span>
        <span className="font-medium text-text">{run.period}</span>
        <span className="text-text-muted">Estates included</span>
        <span className="tabular font-medium text-text">{run.totals.estates}</span>
        <span className="text-text-muted">Estates excluded</span>
        <span className="tabular font-medium text-text">{out.length}</span>
      </div>
      {out.length > 0 && (
        <ul className="max-h-32 list-disc overflow-y-auto pl-5 text-xs text-text-muted">
          {out.map((o) => (
            <li key={o.estateName}>
              <span className="font-medium text-text">{o.estateName}</span> — {o.reason}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-text-muted">{ratePeriodsText(run.ratePeriods)}</p>
      <RunTotalsList totals={run.totals} className="border-t border-border pt-2" />
      <p className="text-xs text-text-muted">
        Processing freezes these settlements and their calculations. This cannot be undone.
      </p>
    </div>
  )
}
