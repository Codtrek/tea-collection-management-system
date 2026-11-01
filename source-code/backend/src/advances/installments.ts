/**
 * The ONE installment model for advances: salary advances (deducted by payroll months) and
 * estate owner advances (deducted by settlements) both use it (Salary-Advances-Addendum §10,
 * Estate-Owner-Advances-Addendum §4). Only the source of a deduction differs; both are keyed by
 * a period label like 'July 2026'. Pure, tested in installments.spec.ts.
 *
 * A period plans at most ONE installment (or what's left). What a period couldn't take stays in
 * the balance, so a short period EXTENDS the schedule — it never doubles a later installment.
 *   remaining = amount − Σ recovered
 */
import { keyToLabel, labelToKey } from '../reports/reports-map';

/** The advance itself, as far as its balance goes. */
export interface BalanceFacts {
  id: string;
  amount: string | number;
}

/**
 * One repayment row. `period` set = a deduction by that period's payroll row / settlement;
 * `period` null = an early repayment (cash or bank). `reserved` = earmarked by a period that
 * isn't processed yet; `recovered` = money actually taken.
 */
export interface RepaymentFacts {
  advanceId: string;
  period: string | null;
  status: 'reserved' | 'recovered';
  amount: string | number;
  plannedAmount: string | number;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;
const sum = <T>(rows: T[], f: (r: T) => number) =>
  round2(rows.reduce((s, r) => s + f(r), 0));
const own = (a: BalanceFacts, recs: RepaymentFacts[]) =>
  recs.filter((r) => r.advanceId === a.id);

// ── plans ────────────────────────────────────────────────────────────────────────────────────

/** 'YYYY-MM' + n months */
export function addMonths(key: string, n: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** A plan typed as months → the installment (whole rupees, rounded up; the last one takes the remainder). */
export function installmentForMonths(amount: number, months: number): number {
  return Math.ceil(amount / Math.max(1, months));
}

/** A plan typed as an amount per month → how many months it takes. */
export function monthsForInstallment(
  amount: number,
  installment: number,
): number {
  return Math.max(1, Math.ceil(round2(amount / installment)));
}

/** The planned periods: Rs. 20,000 at Rs. 6,000 → 6,000 / 6,000 / 6,000 / 2,000. */
export function scheduleOf(
  amount: number,
  installment: number,
  startPeriod: string,
): { period: string; amount: number }[] {
  const out: { period: string; amount: number }[] = [];
  let left = round2(amount);
  let key = labelToKey(startPeriod);
  while (left > 0 && out.length < 600) {
    const take = round2(Math.min(installment, left));
    out.push({ period: keyToLabel(key), amount: take });
    left = round2(left - take);
    key = addMonths(key, 1);
  }
  return out;
}

/** null when the plan is valid, else what's wrong (shown to the user). */
export function planError(
  amount: number,
  installment: number,
  maxMonths: number,
): string | null {
  if (!(installment > 0)) return 'The installment must be more than Rs. 0.';
  if (installment > amount)
    return 'The installment can’t be more than the advance.';
  const months = monthsForInstallment(amount, installment);
  if (months > maxMonths) {
    return `That plan runs ${months} months — the most allowed is ${maxMonths}.`;
  }
  return null;
}

// ── balance ──────────────────────────────────────────────────────────────────────────────────

/** Σ actually recovered (processed periods + early repayments). */
export function recoveredOf(a: BalanceFacts, recs: RepaymentFacts[]): number {
  return sum(
    own(a, recs).filter((r) => r.status === 'recovered'),
    (r) => Number(r.amount),
  );
}

/** Still to recover, never below 0. */
export function remainingOf(a: BalanceFacts, recs: RepaymentFacts[]): number {
  return Math.max(0, round2(Number(a.amount) - recoveredOf(a, recs)));
}

/**
 * What `period` may plan against: the remaining balance less what OTHER unprocessed periods have
 * already reserved — one amount is never counted in two periods.
 */
export function freeForPeriod(
  a: BalanceFacts,
  recs: RepaymentFacts[],
  period: string,
): number {
  const reservedElsewhere = sum(
    own(a, recs).filter((r) => r.status === 'reserved' && r.period !== period),
    (r) => Number(r.amount),
  );
  return Math.max(0, round2(remainingOf(a, recs) - reservedElsewhere));
}

/** Σ (planned − deducted) over its periods so far — what short periods pushed later. */
export function carriedForwardOf(
  a: BalanceFacts,
  recs: RepaymentFacts[],
): number {
  return sum(
    own(a, recs).filter((r) => r.period !== null),
    (r) => Math.max(0, Number(r.plannedAmount) - Number(r.amount)),
  );
}

/** The latest processed period on record ('YYYY-MM'), or '' — a reschedule must start after it. */
export function lastProcessedKey(
  a: BalanceFacts,
  recs: RepaymentFacts[],
): string {
  return (
    own(a, recs)
      .filter((r) => r.period && r.status === 'recovered')
      .map((r) => labelToKey(r.period!))
      .sort()
      .at(-1) ?? ''
  );
}

/** What can be repaid early: the balance not already earmarked by an unprocessed period. */
export function earlyRepayable(
  a: BalanceFacts,
  recs: RepaymentFacts[],
): number {
  const reserved = sum(
    own(a, recs).filter((r) => r.period !== null && r.status === 'reserved'),
    (r) => Number(r.amount),
  );
  return round2(remainingOf(a, recs) - reserved);
}

/** null when a reschedule of `remaining` is valid from `startMonth` ('YYYY-MM'). */
export function rescheduleError(
  remaining: number,
  installment: number,
  maxMonths: number,
  startMonth: string,
  lastProcessed: string,
): string | null {
  const error = planError(remaining, installment, maxMonths);
  if (error) return error;
  if (lastProcessed && startMonth <= lastProcessed) {
    return `${keyToLabel(lastProcessed)} is already processed — start the new plan after it.`;
  }
  return null;
}

// ── schedule ─────────────────────────────────────────────────────────────────────────────────

export type ScheduleStatus = 'Deducted' | 'Reserved' | 'Planned';

export interface ScheduleMonth {
  period: string;
  planned: number;
  deducted: number;
  /** planned − deducted, left in the balance (extends the schedule) */
  carried: number;
  /** Deducted (processed) · Reserved (in an unprocessed period) · Planned (future) */
  status: ScheduleStatus;
}

export interface ScheduleProjection {
  months: ScheduleMonth[];
  /** the period the balance reaches Rs. 0 (null if it never does — no plan) */
  clearedPeriod: string | null;
  /** the next period that will deduct from it */
  nextPeriod: string | null;
}

/**
 * The detail page's schedule: what each period planned and deducted so far, then the remaining
 * balance spread forward at one installment a period from the later of the start period and the
 * period after the last one on record. Early repayments reduce the balance (and so shorten the
 * schedule); a reschedule changes only the projected periods.
 */
export function projectSchedule(
  plan: { amount: number; installment: number; startPeriod: string },
  recs: RepaymentFacts[],
): ScheduleProjection {
  const periods = recs
    .filter((r) => r.period)
    .sort((a, b) => labelToKey(a.period!).localeCompare(labelToKey(b.period!)));
  const months: ScheduleMonth[] = periods.map((r) => ({
    period: r.period!,
    planned: Number(r.plannedAmount),
    deducted: Number(r.amount),
    carried: round2(Math.max(0, Number(r.plannedAmount) - Number(r.amount))),
    status: r.status === 'recovered' ? 'Deducted' : 'Reserved',
  }));
  const taken = round2(
    recs
      .filter((r) => r.period !== null || r.status === 'recovered')
      .reduce((s, r) => s + Number(r.amount), 0),
  );
  let left = Math.max(0, round2(plan.amount - taken));
  const lastKey = periods.length
    ? labelToKey(periods[periods.length - 1].period!)
    : '';
  let key = labelToKey(plan.startPeriod);
  if (lastKey && addMonths(lastKey, 1) > key) key = addMonths(lastKey, 1);
  while (left > 0 && months.length < 600) {
    const planned = round2(Math.min(plan.installment, left));
    months.push({
      period: keyToLabel(key),
      planned,
      deducted: 0,
      carried: 0,
      status: 'Planned',
    });
    left = round2(left - planned);
    key = addMonths(key, 1);
  }
  return {
    months,
    clearedPeriod:
      months.filter((m) => m.planned > 0 || m.deducted > 0).at(-1)?.period ??
      null,
    nextPeriod:
      months.find((m) => m.status !== 'Deducted' && m.planned > 0)?.period ??
      null,
  };
}

// ── one period's deductions ──────────────────────────────────────────────────────────────────

export interface PeriodDeductionLine {
  advanceId: string;
  /** what this period meant to deduct (its installment, or what's left) */
  planned: number;
  /** what the room allowed */
  amount: number;
}

export interface PeriodDeductions {
  lines: PeriodDeductionLine[];
  total: number;
  /** planned − deducted: stays in the balance for later periods */
  carried: number;
  /** the most advance deductions could take this period */
  room: number;
}

/**
 * One period's advance deductions for one owner (employee or estate). `advances` are that owner's
 * OPEN advances, oldest first — the caller filters and orders them. Each plans at most one
 * installment (`installmentOf`, null = everything still free); together they never take more
 * than `room` (the caller's cap / what's left after other deductions), so net never goes below 0.
 */
export function planPeriodDeductions<A extends BalanceFacts>(
  advances: A[],
  recs: RepaymentFacts[],
  period: string,
  room: number,
  installmentOf: (a: A) => number | null = () => null,
): PeriodDeductions {
  const cap = Math.max(0, round2(room));
  let left = cap;
  const lines: PeriodDeductionLine[] = [];
  for (const a of advances) {
    const free = freeForPeriod(a, recs, period);
    if (free <= 0) continue;
    const installment = installmentOf(a);
    const planned = round2(
      installment === null ? free : Math.min(installment, free),
    );
    if (planned <= 0) continue;
    const amount = round2(Math.min(planned, left));
    left = round2(left - amount);
    lines.push({ advanceId: a.id, planned, amount });
  }
  const total = round2(lines.reduce((s, l) => s + l.amount, 0));
  const plannedTotal = round2(lines.reduce((s, l) => s + l.planned, 0));
  return { lines, total, carried: round2(plannedTotal - total), room: cap };
}
