import { formatDate, formatDateTime } from '@/lib/format'
import { SettlementCalculationView } from './SettlementCalculationView'
import type { SettlementCalculation } from './settlement-run-types'
import type { SettlementRow, StatementParties } from './types'

/*
  The estate owner's printable statement (Settlement-Addendum): the same breakdown the factory
  processed — rate periods, kg, each deduction with its source, carried-forward amounts, net —
  read from the settlement's frozen calculation, so a later rate change never alters it. A draft
  prints marked "Draft — not final". Printing hides everything else on the page.
*/
export function OwnerStatement({
  settlement: s,
  calc,
  parties,
}: {
  settlement: SettlementRow
  calc: SettlementCalculation
  parties: StatementParties
}) {
  const { factory, owner } = parties
  const draft = s.status !== 'Processed'
  return (
    <article id="owner-statement" className="rounded-[var(--radius-lg)] border border-border bg-surface p-6 text-sm">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="text-base font-semibold text-text-heading">{factory.name || 'Tea factory'}</p>
          {factory.address && <p className="text-text-muted">{factory.address}</p>}
          <p className="text-xs text-text-muted">
            {[factory.contact, factory.email, factory.registrationNo && `Reg. ${factory.registrationNo}`].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-base font-semibold text-text-heading">Leaf payment statement</p>
          <p className="text-text">{s.period}</p>
          <p className="id text-xs text-text-muted">{s.id}</p>
          {draft && <p className="mt-1 text-xs font-semibold uppercase text-warning-fg">Draft — not final</p>}
        </div>
      </header>

      <section className="grid gap-4 border-b border-border py-4 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted">Estate owner</p>
          <p className="font-medium text-text">{owner.name}</p>
          <p className="text-text">{owner.estateName}</p>
          {owner.address && <p className="text-text-muted">{owner.address}</p>}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted">Paid by</p>
          <p className="text-text">
            {owner.payoutMethod === 'cash' ? 'Cash' : `Bank transfer${owner.bank ? ` — ${owner.bank}` : ''}`}
          </p>
          {owner.payoutMethod === 'bank' && owner.accountMasked && (
            <p className="tabular text-text-muted">Account {owner.accountMasked}</p>
          )}
        </div>
      </section>

      <div className="py-4">
        <SettlementCalculationView calc={calc} />
      </div>

      <footer className="border-t border-border pt-3 text-xs text-text-muted">
        {calc.frozenAt
          ? `Processed ${formatDate(calc.frozenAt)}${s.processedBy ? ` by ${s.processedBy}` : ''}. These figures are frozen.`
          : `Calculated ${formatDateTime(calc.calculatedAt)}. A draft is recalculated until it is processed.`}{' '}
        Each delivery is priced at the grade rate in force on its delivery date. No bank charge is deducted.
      </footer>
    </article>
  )
}
