/**
 * Pay resolution (Administration-Addendum §6) — pure, tested in pay-resolution.spec.ts. Pay is the
 * 4 hourly rates. On any date an employee is paid at their own OVERRIDE in force that day,
 * otherwise their ROLE's rate in force that day. Payroll and the Expense report's wage estimate
 * price each attendance day at the rates in force on that day.
 */
import {
  grossFromHours,
  type HourRates,
  type HourTotals,
} from './payroll-gross';

export interface PayVersion extends HourRates {
  id: number;
  scope: 'role' | 'employee';
  role: string | null;
  employeeId: number | null;
  effectiveDate: string;
  reason: string;
  setBy: string;
  source: 'migration' | 'registration' | 'adjustment';
  adjustmentId: number | null;
}

export interface PayResolution {
  rates: HourRates;
  /** override = the employee's own rate; role = their role's default */
  source: 'override' | 'role';
  version: PayVersion;
}

const latestOnOrBefore = (vs: PayVersion[], date: string) =>
  vs
    .filter((v) => v.effectiveDate <= date)
    .sort(
      (a, b) => b.effectiveDate.localeCompare(a.effectiveDate) || b.id - a.id,
    )[0] ?? null;

const ratesOf = (v: PayVersion): HourRates => ({
  dayRate: v.dayRate,
  dayOtRate: v.dayOtRate,
  nightRate: v.nightRate,
  nightOtRate: v.nightOtRate,
});

/** The rates an employee is paid at on `date`, or null when neither an override nor a role rate is in force. */
export function payOn(
  versions: PayVersion[],
  employee: { id: number; role: string },
  date: string,
): PayResolution | null {
  const own = latestOnOrBefore(
    versions.filter(
      (v) => v.scope === 'employee' && v.employeeId === employee.id,
    ),
    date,
  );
  if (own) return { rates: ratesOf(own), source: 'override', version: own };
  const role = latestOnOrBefore(
    versions.filter((v) => v.scope === 'role' && v.role === employee.role),
    date,
  );
  return role ? { rates: ratesOf(role), source: 'role', version: role } : null;
}

/** The next change after `date` that would apply to this employee (override or role), or null. */
export function nextChange(
  versions: PayVersion[],
  employee: { id: number; role: string },
  date: string,
): PayVersion | null {
  return (
    versions
      .filter(
        (v) =>
          v.effectiveDate > date &&
          ((v.scope === 'employee' && v.employeeId === employee.id) ||
            (v.scope === 'role' && v.role === employee.role)),
      )
      .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate))[0] ?? null
  );
}

export interface DayHours extends HourTotals {
  date: string;
}

/**
 * Gross for a set of attendance days, each priced at the rates in force that day. Days with no rate
 * in force are counted, never priced (`unpricedDays`).
 */
export function grossByDay(
  days: DayHours[],
  versions: PayVersion[],
  employee: { id: number; role: string },
): { gross: number; unpricedDays: number } {
  let gross = 0;
  let unpricedDays = 0;
  for (const d of days) {
    const pay = payOn(versions, employee, d.date);
    if (!pay) {
      unpricedDays += 1;
      continue;
    }
    gross += grossFromHours(d, pay.rates);
  }
  return { gross: Math.round(gross * 100) / 100, unpricedDays };
}

/** A `pay_rates` row (decimals arrive as strings) → the rules' shape. */
export function toPayVersion(r: {
  id: number;
  scope: 'role' | 'employee';
  role: string | null;
  employeeId: number | null;
  effectiveDate: string;
  dayRate: string | number;
  dayOtRate: string | number;
  nightRate: string | number;
  nightOtRate: string | number;
  reason: string;
  setBy: string;
  source: 'migration' | 'registration' | 'adjustment';
  adjustmentId: number | null;
}): PayVersion {
  return {
    id: r.id,
    scope: r.scope,
    role: r.role,
    employeeId: r.employeeId,
    effectiveDate: r.effectiveDate,
    dayRate: Number(r.dayRate),
    dayOtRate: Number(r.dayOtRate),
    nightRate: Number(r.nightRate),
    nightOtRate: Number(r.nightOtRate),
    reason: r.reason,
    setBy: r.setBy,
    source: r.source,
    adjustmentId: r.adjustmentId,
  };
}
