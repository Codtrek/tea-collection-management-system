/**
 * Salary advance recovery (Salary-Advances-Addendum) — the ONE place an advance's recovery
 * status, remaining balance and each month's deduction are worked out. The Salary Advances
 * pages, payroll Generate / Process, the payslip and the employee page all read these.
 * Pure, tested in advance-balance.spec.ts.
 *
 * Every month's deduction is an `advance_recoveries` row: RESERVED by that month's payroll row at
 * Generate (so the same money is never counted in two months), RECOVERED when it is processed.
 *   remaining = approved amount − Σ recovered
 * A month deducts the smallest of: its planned installment, what's still free of the balance,
 * and what the gross allows (the cap % of gross, after other deductions). The rest is carried
 * forward — net payable never goes below Rs. 0.
 */
import { labelToKey } from '../reports/reports-map';
import type { AdvanceRecoveryEntity } from './advance-recovery.entity';
import type { SalaryAdvanceEntity } from './salary-advance.entity';

export type RecoveryStatus = 'Not started' | 'Recovering' | 'Recovered';

export type AdvanceFacts = Pick<
  SalaryAdvanceEntity,
  'id' | 'employeeId' | 'amount' | 'status' | 'dateRequested'
>;

export type RecoveryFacts = Pick<
  AdvanceRecoveryEntity,
  'advanceId' | 'kind' | 'period' | 'status' | 'amount' | 'plannedAmount'
>;

const round2 = (n: number) => Math.round(n * 100) / 100;
const sum = (rows: RecoveryFacts[], f: (r: RecoveryFacts) => number) =>
  round2(rows.reduce((s, r) => s + f(r), 0));

const recoveriesOf = (a: AdvanceFacts, recs: RecoveryFacts[]) =>
  recs.filter((r) => r.advanceId === a.id);

/** Σ actually recovered (processed payroll months + cash repayments). */
export function recoveredOf(a: AdvanceFacts, recs: RecoveryFacts[]): number {
  return sum(
    recoveriesOf(a, recs).filter((r) => r.status === 'recovered'),
    (r) => Number(r.amount),
  );
}

/** Still to recover — 0 for a Pending or Rejected request. */
export function remainingOf(a: AdvanceFacts, recs: RecoveryFacts[]): number {
  if (a.status !== 'Approved') return 0;
  return Math.max(0, round2(Number(a.amount) - recoveredOf(a, recs)));
}

/**
 * What `period` may plan against: the remaining balance less what OTHER Pending months have
 * already reserved — the Part B rule that one amount is never counted in two months.
 */
export function freeForPeriod(
  a: AdvanceFacts,
  recs: RecoveryFacts[],
  period: string,
): number {
  const reservedElsewhere = sum(
    recoveriesOf(a, recs).filter(
      (r) => r.status === 'reserved' && r.period !== period,
    ),
    (r) => Number(r.amount),
  );
  return Math.max(0, round2(remainingOf(a, recs) - reservedElsewhere));
}

export interface AdvanceRecovery {
  /** null for a Pending or Rejected request — nothing to recover */
  recovery: RecoveryStatus | null;
  remaining: number;
  recovered: number;
  /** Σ (planned − deducted) over its payroll months so far */
  carriedForward: number;
  /** the Pending payroll month that will deduct from it next, if one is reserved */
  payrollPeriod: string | null;
  /** the latest month it was (partly) recovered in */
  recoveredPeriod: string | null;
}

export function recoveryOf(
  a: AdvanceFacts,
  recs: RecoveryFacts[],
): AdvanceRecovery {
  const own = recoveriesOf(a, recs);
  const recovered = recoveredOf(a, recs);
  const remaining = remainingOf(a, recs);
  const reserved = own.find(
    (r) =>
      r.kind === 'payroll' && r.status === 'reserved' && Number(r.amount) > 0,
  );
  const lastRecovered = own
    .filter((r) => r.kind === 'payroll' && r.status === 'recovered' && r.period)
    .map((r) => r.period!)
    .sort(byPeriod)
    .at(-1);
  const carriedForward = sum(
    own.filter((r) => r.kind === 'payroll'),
    (r) => Math.max(0, Number(r.plannedAmount) - Number(r.amount)),
  );
  if (a.status !== 'Approved') {
    return {
      recovery: null,
      remaining: 0,
      recovered: 0,
      carriedForward: 0,
      payrollPeriod: null,
      recoveredPeriod: null,
    };
  }
  return {
    recovery:
      remaining === 0
        ? 'Recovered'
        : recovered > 0 || reserved
          ? 'Recovering'
          : 'Not started',
    remaining,
    recovered,
    carriedForward,
    payrollPeriod: reserved?.period ?? null,
    recoveredPeriod: lastRecovered ?? null,
  };
}

/** Σ remaining for one employee — their outstanding advance balance. */
export function outstandingFor(
  advances: AdvanceFacts[],
  recs: RecoveryFacts[],
  employeeId: number,
): number {
  return round2(
    advances
      .filter((a) => a.employeeId === employeeId)
      .reduce((s, a) => s + remainingOf(a, recs), 0),
  );
}

export interface MonthDeductionLine {
  advanceId: string;
  /** what this month meant to deduct (its installment, or what's left) */
  planned: number;
  /** what the gross allowed */
  amount: number;
}

export interface MonthDeductions {
  lines: MonthDeductionLine[];
  total: number;
  /** planned − deducted: stays in the balance for later months */
  carried: number;
  /** the most advance deductions could take this month */
  room: number;
}

/**
 * One payroll month's advance deductions for one employee. Oldest advance first. Each advance
 * plans at most one installment (`installmentOf`, default: everything still free); together
 * they never take more than `capPct`% of gross, nor more than the gross left after other
 * deductions — so net payable is never below Rs. 0.
 */
export function planMonthDeductions(
  advances: AdvanceFacts[],
  recs: RecoveryFacts[],
  employeeId: number,
  period: string,
  gross: number,
  otherDeductions: number,
  capPct: number,
  installmentOf: (a: AdvanceFacts) => number | null = () => null,
): MonthDeductions {
  const room = Math.max(
    0,
    round2(Math.min((gross * capPct) / 100, gross - otherDeductions)),
  );
  let left = room;
  const lines: MonthDeductionLine[] = [];
  const own = advances
    .filter((a) => a.employeeId === employeeId && a.status === 'Approved')
    .sort(
      (a, b) =>
        a.dateRequested.localeCompare(b.dateRequested) ||
        a.id.localeCompare(b.id),
    );
  for (const a of own) {
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
  return { lines, total, carried: round2(plannedTotal - total), room };
}

const byPeriod = (a: string, b: string) =>
  labelToKey(a).localeCompare(labelToKey(b));

export interface PayslipAdvanceLine {
  advanceId: string;
  /** what this month meant to deduct */
  planned: number;
  /** what it deducted */
  deducted: number;
  /** planned − deducted, left in the balance for later months */
  carried: number;
  /** the balance after this month (earlier months, cash repayments and this one taken off) */
  remainingAfter: number;
}

/** A payroll month's advance lines for its payslip — from that month's recovery rows. */
export function payslipAdvanceLines(
  employeeId: number,
  period: string,
  advances: AdvanceFacts[],
  recs: RecoveryFacts[],
): PayslipAdvanceLine[] {
  const key = labelToKey(period);
  return advances
    .filter((a) => a.employeeId === employeeId && a.status === 'Approved')
    .flatMap((a) => {
      const own = recoveriesOf(a, recs);
      const line = own.find((r) => r.kind === 'payroll' && r.period === period);
      if (!line) return [];
      const takenUpToNow = sum(
        own.filter((r) =>
          r.kind === 'cash'
            ? r.status === 'recovered'
            : !!r.period && labelToKey(r.period) <= key,
        ),
        (r) => Number(r.amount),
      );
      const planned = Number(line.plannedAmount);
      const deducted = Number(line.amount);
      return [
        {
          advanceId: a.id,
          planned,
          deducted,
          carried: round2(Math.max(0, planned - deducted)),
          remainingAfter: Math.max(0, round2(Number(a.amount) - takenUpToNow)),
        },
      ];
    });
}
