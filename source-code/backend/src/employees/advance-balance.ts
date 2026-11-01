/**
 * Salary advance recovery (Salary-Advances-Addendum) — the ONE place an advance's recovery
 * status and remaining balance are worked out. The Salary Advances pages, payroll Generate /
 * Process and the employee detail page all read these. Pure, tested in advance-balance.spec.ts.
 *
 * An approved advance is recovered IN FULL by one payroll month:
 *   Not started — approved, not yet in any payroll row
 *   Recovering  — reserved by a Pending payroll row (`payrollPeriod`), deducted when it's processed
 *   Recovered   — that row was processed (`deducted`, `recoveredPeriod`)
 */
import type { SalaryAdvanceEntity } from './salary-advance.entity';

export type RecoveryStatus = 'Not started' | 'Recovering' | 'Recovered';

type AdvanceFacts = Pick<
  SalaryAdvanceEntity,
  | 'employeeId'
  | 'amount'
  | 'status'
  | 'deducted'
  | 'payrollPeriod'
  | 'recoveredPeriod'
>;

export interface AdvanceRecovery {
  /** null for a Pending or Rejected request — nothing to recover */
  recovery: RecoveryStatus | null;
  /** still to be recovered through payroll */
  remaining: number;
  /** the payroll month that deducts (or deducted) it */
  payrollPeriod: string | null;
  recoveredPeriod: string | null;
}

export function recoveryOf(a: AdvanceFacts): AdvanceRecovery {
  if (a.status !== 'Approved') {
    return {
      recovery: null,
      remaining: 0,
      payrollPeriod: null,
      recoveredPeriod: null,
    };
  }
  if (a.deducted) {
    return {
      recovery: 'Recovered',
      remaining: 0,
      payrollPeriod: a.payrollPeriod,
      recoveredPeriod: a.recoveredPeriod,
    };
  }
  return {
    recovery: a.payrollPeriod ? 'Recovering' : 'Not started',
    remaining: Number(a.amount),
    payrollPeriod: a.payrollPeriod,
    recoveredPeriod: null,
  };
}

/** Σ remaining for one employee — their outstanding advance balance. */
export function outstandingFor<T extends AdvanceFacts>(
  advances: T[],
  employeeId: number,
): number {
  return advances
    .filter((a) => a.employeeId === employeeId)
    .reduce((s, a) => s + recoveryOf(a).remaining, 0);
}

/**
 * The advances `period`'s payroll row deducts: approved, not recovered, and either unreserved or
 * already reserved by this same month. An advance reserved by ANOTHER month is never counted again.
 */
export function advancesForPeriod<T extends AdvanceFacts>(
  advances: T[],
  employeeId: number,
  period: string,
): T[] {
  return advances.filter(
    (a) =>
      a.employeeId === employeeId &&
      a.status === 'Approved' &&
      !a.deducted &&
      (!a.payrollPeriod || a.payrollPeriod === period),
  );
}

/** What processing `period`'s row recovers: only the advances that row reserved. */
export function advancesRecoveredBy<T extends AdvanceFacts>(
  advances: T[],
  employeeId: number,
  period: string,
): T[] {
  return advances.filter(
    (a) =>
      a.employeeId === employeeId &&
      a.status === 'Approved' &&
      !a.deducted &&
      a.payrollPeriod === period,
  );
}
