/**
 * The ONE estate-advance balance rule (Estate-Owner-Advances-Addendum §3–4), on the shared
 * installment model (../advances/installments.ts, also used by salary advances):
 *   remaining = amount − Σ recovered, never below 0
 * Each settlement period deducts at most one installment; what it couldn't take is carried
 * forward and the schedule extends. An advance is Deducted only when its balance reaches 0.
 * Read by the advances list + detail, /estates' Outstanding column and EST-10.
 */
import {
  type BalanceFacts,
  projectSchedule,
  recoveredOf as sharedRecovered,
  remainingOf as sharedRemaining,
  type RepaymentFacts,
  type ScheduleProjection,
} from '../advances/installments';
import { keyToLabel } from '../reports/reports-map';
import type { DbAdvanceStatus } from './estate-map';

export type EstateAdvanceRecoveryStatus =
  | 'Pending deduction'
  | 'Recovering'
  | 'Deducted';

export interface EstateAdvanceFacts extends BalanceFacts {
  estateId: number;
  dateIssued: string;
  installmentAmount?: string | null;
  startPeriod?: string | null;
}

const nextMonthKey = (date: string) => {
  const [y, m] = date.slice(0, 7).split('-').map(Number);
  const d = new Date(Date.UTC(y, m, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

export function recoveredOf(a: BalanceFacts, recs: RepaymentFacts[]): number {
  return sharedRecovered(a, recs);
}

export function remainingOf(a: BalanceFacts, recs: RepaymentFacts[]): number {
  return sharedRemaining(a, recs);
}

export function recoveryStatus(
  a: BalanceFacts,
  recs: RepaymentFacts[],
): EstateAdvanceRecoveryStatus {
  if (remainingOf(a, recs) === 0) return 'Deducted';
  return recoveredOf(a, recs) > 0 ? 'Recovering' : 'Pending deduction';
}

/** The stored status the balance implies — Deducted only at Rs. 0. */
export function dbStatusFor(
  a: BalanceFacts,
  recs: RepaymentFacts[],
): DbAdvanceStatus {
  const s = recoveryStatus(a, recs);
  return s === 'Deducted'
    ? 'deducted'
    : s === 'Recovering'
      ? 'recovering'
      : 'pending_deduction';
}

/** The planned installment — a one-deduction plan (or a legacy row) takes it all at once. */
export function installmentOf(a: EstateAdvanceFacts): number {
  const i = Number(a.installmentAmount ?? 0);
  return i > 0 ? i : Number(a.amount);
}

/** The plan as the shared schedule reads it; no start period = the month after issue. */
export function planOf(a: EstateAdvanceFacts): {
  amount: number;
  installment: number;
  startPeriod: string;
} {
  return {
    amount: Number(a.amount),
    installment: installmentOf(a),
    startPeriod: a.startPeriod || keyToLabel(nextMonthKey(a.dateIssued)),
  };
}

/** Planned / Deducted / carried-forward per settlement period, then the projected periods. */
export function scheduleFor(
  a: EstateAdvanceFacts,
  recs: RepaymentFacts[],
): ScheduleProjection {
  return projectSchedule(
    planOf(a),
    recs.filter((r) => r.advanceId === a.id),
  );
}

/** Σ remaining per estate — what each owner still owes the factory in advances. */
export function estateAdvanceOutstanding(
  advances: (BalanceFacts & { estateId: number })[],
  recs: RepaymentFacts[],
): Map<number, number> {
  const out = new Map<number, number>();
  for (const a of advances) {
    const left = remainingOf(a, recs);
    if (left > 0)
      out.set(
        a.estateId,
        Math.round(((out.get(a.estateId) ?? 0) + left) * 100) / 100,
      );
  }
  return out;
}
