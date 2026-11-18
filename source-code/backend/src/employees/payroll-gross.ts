/**
 * Gross pay = hours × the employee's rates. The ONE formula: payroll generation (EMP-12) uses it
 * to snapshot a run, and the Expense report uses it to estimate wages for a month whose payroll
 * isn't processed yet (Finance-Reports-Addendum §4), so the estimate can never drift from payroll.
 */
export interface HourTotals {
  dayHours: number;
  dayOtHours: number;
  nightHours: number;
  nightOtHours: number;
}

export interface HourRates {
  dayRate: number;
  dayOtRate: number;
  nightRate: number;
  nightOtRate: number;
}

type HourRow = Record<keyof HourTotals, string | number>;

/** Adds attendance rows' hours (DB decimals arrive as strings). */
export function sumHours(rows: HourRow[]): HourTotals {
  return rows.reduce<HourTotals>(
    (sum, a) => ({
      dayHours: sum.dayHours + Number(a.dayHours),
      dayOtHours: sum.dayOtHours + Number(a.dayOtHours),
      nightHours: sum.nightHours + Number(a.nightHours),
      nightOtHours: sum.nightOtHours + Number(a.nightOtHours),
    }),
    { dayHours: 0, dayOtHours: 0, nightHours: 0, nightOtHours: 0 },
  );
}

export function grossFromHours(t: HourTotals, r: HourRates): number {
  return (
    t.dayHours * r.dayRate +
    t.dayOtHours * r.dayOtRate +
    t.nightHours * r.nightRate +
    t.nightOtHours * r.nightOtRate
  );
}
