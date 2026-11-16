import { AlertTriangle } from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { cn } from '@/lib/cn'
import { formatCurrency, formatDate, formatWeight } from '@/lib/format'
import { dayRange, transportSource } from './settlement-run'
import type { SettlementCalculation } from './settlement-run-types'

/*
  One settlement's whole calculation (Settlement-Addendum): leaf lines grouped by rate period, each
  deduction with its source in the order it was taken, carried-forward amounts and net. Shown on
  the Process page (expanded rows), the settlement detail and the owner statement — always from
  the backend's calculation, frozen once processed.
*/
export function SettlementCalculationView({ calc, compact }: { calc: SettlementCalculation; compact?: boolean }) {
  const steps = calc.order
  return (
    <div className={cn('flex flex-col gap-4 text-sm', compact && 'gap-3')}>
      <Section title="Leaf">
        {calc.ratePeriods.length === 0 && <p className="text-text-muted">No payable deliveries.</p>}
        {calc.ratePeriods.map((p) => (
          <div key={`${p.rolledIn ? 'r' : ''}${p.rateId}`} className="flex flex-col gap-0.5">
            <p className="text-xs font-medium text-text-muted">
              {p.rolledIn ? `Rolled in from an earlier month (${dayRange(p.from, p.to)})` : dayRange(p.from, p.to)} ·{' '}
              {p.deliveries} deliver{p.deliveries === 1 ? 'y' : 'ies'}
            </p>
            {p.superKg > 0 && (
              <Line label={`Super ${formatCurrency(p.superRate)} × ${formatWeight(p.superKg)}`} value={formatCurrency(p.superAmount)} />
            )}
            {p.normalKg > 0 && (
              <Line label={`Normal ${formatCurrency(p.normalRate)} × ${formatWeight(p.normalKg)}`} value={formatCurrency(p.normalAmount)} />
            )}
          </div>
        ))}
        <Line label="Gross leaf value" value={formatCurrency(calc.gross)} strong />
      </Section>

      <Section title="Deductions, in order">
        {calc.adjustments.lines.length > 0 && (
          <>
            {calc.adjustments.lines.map((a) => (
              <Line
                key={a.id}
                label={`Approved correction on ${a.deliveryId}`}
                value={`${a.amount < 0 ? '−' : '+'} ${formatCurrency(Math.abs(a.amount))}`}
              />
            ))}
          </>
        )}
        {steps.map((step) =>
          step === 'transport' ? (
            <div key="transport">
              <Line
                label="Transport"
                source={transportSource(calc)}
                value={calc.transport.status === 'not_configured' ? 'Not configured' : less(calc.transport.taken)}
              />
              {calc.transport.carriedOut > 0 && <Carried amount={calc.transport.carriedOut} />}
            </div>
          ) : step === 'fertilizer' ? (
            <div key="fertilizer" className="flex flex-col gap-0.5">
              {calc.fertilizer.lines.length === 0 && (
                <Line label="Fertilizer" source="No outstanding “Deduct from tea payment” charges" value={less(0)} />
              )}
              {calc.fertilizer.lines.map((f) => (
                <div key={f.chargeId}>
                  <Line
                    label={`Fertilizer ${f.ref} · ${f.item}`}
                    source={`Delivered ${formatDate(f.date)} · ${formatWeight(f.quantityKg)} × ${formatCurrency(f.ratePerKg)}`}
                    value={f.taken ? less(f.taken) : 'Carried forward'}
                    badge={f.checkSeed ? 'Check: possible seed data' : undefined}
                  />
                  {f.carried > 0 && f.taken > 0 && <Carried amount={f.carried} />}
                </div>
              ))}
              {calc.fertilizer.carried > 0 && <Carried amount={calc.fertilizer.carried} what="fertilizer" />}
              {calc.fertilizer.info.length > 0 && (
                <p className="text-xs text-text-muted">
                  Paid by cash or bank (not deducted):{' '}
                  {calc.fertilizer.info.map((f) => `${f.ref} ${f.item} ${formatCurrency(f.amount)}`).join(' · ')}
                </p>
              )}
            </div>
          ) : (
            <div key="advances" className="flex flex-col gap-0.5">
              {calc.advances.lines.length === 0 && <Line label="Advances" source="No installment due" value={less(0)} />}
              {calc.advances.lines.map((a) => (
                <Line
                  key={a.advanceId}
                  label={`Advance ${a.advanceId}`}
                  source={`Installment ${formatCurrency(a.planned)} · cap ${calc.advances.capPct}% of gross = ${formatCurrency(calc.advances.cap)}`}
                  value={less(a.taken)}
                />
              ))}
              {calc.advances.carried > 0 && <Carried amount={calc.advances.carried} what="advance" />}
            </div>
          ),
        )}
      </Section>

      <div className="border-t border-border pt-2">
        <Line label="Net payable" value={formatCurrency(calc.net)} strong />
        {calc.carriedForward > 0 && (
          <p className="tabular mt-1 text-xs text-text-muted">
            Carried forward to the next settlement: {formatCurrency(calc.carriedForward)}
          </p>
        )}
      </div>

      {(calc.ungraded.length > 0 || calc.open.length > 0 || calc.excluded.length > 0) && (
        <Section title="Not in this settlement">
          {[...calc.ungraded, ...calc.open, ...calc.excluded].map((d) => (
            <p key={d.id} className="flex items-start gap-1.5 text-xs text-text-muted">
              <AlertTriangle className="mt-0.5 size-3 shrink-0 text-warning-fg" aria-hidden />
              <span>
                <span className="id">{d.id}</span> ({formatDate(d.date)}) — {d.reason}
              </span>
            </p>
          ))}
        </Section>
      )}
    </div>
  )
}

const less = (n: number) => (n ? `− ${formatCurrency(n)}` : formatCurrency(0))

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">{title}</h4>
      {children}
    </section>
  )
}

function Line({
  label,
  value,
  source,
  strong,
  badge,
}: {
  label: string
  value: string
  source?: string
  strong?: boolean
  badge?: string
}) {
  return (
    <div className="flex justify-between gap-4">
      <div>
        <p className={cn(strong ? 'font-medium text-text' : 'text-text')}>
          {label} {badge && <StatusBadge tone="warning">{badge}</StatusBadge>}
        </p>
        {source && <p className="text-xs text-text-muted">{source}</p>}
      </div>
      <p className={cn('tabular shrink-0', strong ? 'font-semibold text-text-heading' : 'text-text')}>{value}</p>
    </div>
  )
}

function Carried({ amount, what }: { amount: number; what?: string }) {
  return (
    <p className="tabular text-xs text-warning-fg">
      {formatCurrency(amount)} {what ? `of ${what} ` : ''}carried forward (not enough left this month)
    </p>
  )
}
