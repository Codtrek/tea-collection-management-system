import { formatCurrency, formatWeight } from '@/lib/format'
import type { RunTotals, SettlementCalculation, SettlementRun } from './settlement-run-types'

/*
  Display helpers for the settlement generator's figures (Settlement-Addendum). Pure — tested in
  settlement-run.test.ts. They only word figures the backend already calculated.
*/

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** '2026-07-01'…'2026-07-14' → "1–14 Jul" (across months: "28 Jun – 3 Jul"). */
export function dayRange(from: string, to: string): string {
  const [, fm, fd] = from.split('-').map(Number)
  const [, tm, td] = to.split('-').map(Number)
  if (fm === tm) return fd === td ? `${fd} ${MON[fm - 1]}` : `${fd}–${td} ${MON[fm - 1]}`
  return `${fd} ${MON[fm - 1]} – ${td} ${MON[tm - 1]}`
}

/** "Super/Normal: Rs. 185/95 (1–14 Jul), Rs. 190/98 (15–31 Jul)" */
export function ratePeriodsText(periods: SettlementRun['ratePeriods']): string {
  if (periods.length === 0) return 'Super/Normal: no grade rate covers this month'
  return `Super/Normal: ${periods
    .map((p) => `Rs. ${p.superRate}/${p.normalRate} (${dayRange(p.from, p.to)})`)
    .join(', ')}`
}

export interface TotalsLine {
  key: keyof RunTotals | 'leafKg'
  label: string
  value: string
  strong?: boolean
}

const signed = (n: number) => `${n < 0 ? '−' : '+'} ${formatCurrency(Math.abs(n))}`
const less = (n: number) => (n ? `− ${formatCurrency(n)}` : formatCurrency(0))

/** The run's totals, in order — the ONE list the Process page's totals row and the popup both show. */
export function totalsLines(t: RunTotals): TotalsLine[] {
  return [
    { key: 'leafKg', label: 'Leaf', value: `Super ${formatWeight(t.superKg)} · Normal ${formatWeight(t.normalKg)}` },
    { key: 'gross', label: 'Gross leaf value', value: formatCurrency(t.gross), strong: true },
    { key: 'adjustments', label: 'Adjustments (approved corrections)', value: signed(t.adjustments) },
    { key: 'transport', label: 'Transport', value: less(t.transport) },
    { key: 'fertilizer', label: 'Fertilizer', value: less(t.fertilizer) },
    { key: 'advances', label: 'Advances recovered', value: less(t.advances) },
    { key: 'carriedForward', label: 'Carried forward to next settlements', value: formatCurrency(t.carriedForward) },
    { key: 'net', label: 'Total net payable', value: formatCurrency(t.net), strong: true },
  ]
}

/** The transport line's source, in words. */
export function transportSource(c: SettlementCalculation): string {
  const t = c.transport
  switch (t.status) {
    case 'exempt':
      return 'Exempt — self-delivery estate'
    case 'no_deliveries':
      return 'No deliveries this month — no charge'
    case 'not_configured':
      return 'Not configured — no monthly transport charge covers this month'
    default:
      return `Fixed monthly charge ${formatCurrency(t.charge)}${t.versionMonth ? ` (version from ${t.versionMonth})` : ''}${
        t.carriedIn ? ` + ${formatCurrency(t.carriedIn)} carried in` : ''
      }`
  }
}

/** Why a row isn't in the run, in one line. */
export function excludedReasons(run: SettlementRun): { estateName: string; reason: string }[] {
  return run.rows
    .filter((r) => !r.ready)
    .map((r) => ({
      estateName: r.estateName,
      reason: r.settlementId ? r.reasons.join(' ') : 'Not prepared yet',
    }))
}
