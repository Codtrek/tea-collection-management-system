/**
 * Pay adjustments (Administration-Addendum §8) — pure, tested in pay-adjustment-rules.spec.ts.
 *
 *  • a change is an increase or decrease, by % or a fixed Rs per hour, applied to all 4 hourly
 *    rates, optionally rounded to the nearest Rs 10 / 50
 *  • it starts today or later, and never in (or before) a month whose payroll is already PROCESSED
 *    for any of the employees — processed payroll never changes
 *  • nobody may end up below the statutory minimum: new day rate × standard hours per day against
 *    the category's minimum daily pay. While a minimum isn't entered, that category isn't checked
 *    and the preview says so
 *  • any decrease needs the preparer to confirm the employees' written agreement
 *  • the monthly cost change = Σ (new − old rate) × that employee's hours last month
 */
import type { PayResolution } from './pay-resolution';
import type { HourRates, HourTotals } from './payroll-gross';

export interface ChangeSpec {
  direction: 'increase' | 'decrease';
  kind: 'percent' | 'amount';
  /** % or Rs per hour, always positive */
  amount: number;
  /** 0 = to the cent; else to the nearest Rs 10 / 50 */
  rounding: 0 | 10 | 50;
}

const KEYS: (keyof HourRates)[] = [
  'dayRate',
  'dayOtRate',
  'nightRate',
  'nightOtRate',
];
const HOURS: Record<keyof HourRates, keyof HourTotals> = {
  dayRate: 'dayHours',
  dayOtRate: 'dayOtHours',
  nightRate: 'nightHours',
  nightOtRate: 'nightOtHours',
};
const r2 = (n: number) => Math.round(n * 100) / 100;

/** One rate after the change (may come out below 0 — the preview blocks that). */
export function applyChange(rate: number, c: ChangeSpec): number {
  const sign = c.direction === 'increase' ? 1 : -1;
  const raw =
    c.kind === 'percent'
      ? rate * (1 + (sign * c.amount) / 100)
      : rate + sign * c.amount;
  // a rate of Rs 0 means not paid by the hour (e.g. collection agents): a change leaves it alone
  if (rate === 0) return 0;
  return c.rounding ? Math.round(raw / c.rounding) * c.rounding : r2(raw);
}

export function applyToRates(r: HourRates, c: ChangeSpec): HourRates {
  return Object.fromEntries(
    KEYS.map((k) => [k, applyChange(r[k], c)]),
  ) as unknown as HourRates;
}

export interface PreviewEmployee {
  id: number;
  name: string;
  nic: string | null;
  category: 'factory' | 'office';
  role: string;
  /** pay in force on the day before the change starts */
  current: PayResolution | null;
  /** hours worked in the last complete month (the cost basis) */
  hours: HourTotals;
  /** months ('YYYY-MM') with a PROCESSED payroll row for this employee */
  processedMonths: string[];
}

export interface PreviewInput {
  employees: PreviewEmployee[];
  change: ChangeSpec;
  effectiveDate: string;
  today: string;
  standardHoursPerDay: number;
  minimumDailyPay: { factory: number | null; office: number | null };
}

export interface PreviewLine {
  employeeId: number;
  name: string;
  category: 'factory' | 'office';
  role: string;
  onOverride: boolean;
  old: HourRates;
  new: HourRates;
  /** day rate × standard hours */
  dayPayOld: number;
  dayPayNew: number;
  hoursBasis: number;
  monthlyChange: number;
  /** why this employee can't take the change, or null */
  blocked: string | null;
}

export interface Preview {
  lines: PreviewLine[];
  totalMonthlyChange: number;
  isDecrease: boolean;
  /** categories among these employees with no minimum entered — not checked */
  minimumNotSet: ('factory' | 'office')[];
  /** reasons the whole change can't go ahead (date, processed month, nobody selected) */
  errors: string[];
}

const ZERO: HourRates = {
  dayRate: 0,
  dayOtRate: 0,
  nightRate: 0,
  nightOtRate: 0,
};
const monthOf = (d: string) => d.slice(0, 7);
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const monthLabel = (m: string) =>
  `${MONTH_NAMES[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;

export function preview(i: PreviewInput): Preview {
  const errors: string[] = [];
  if (i.employees.length === 0) errors.push('Pick who the change is for.');
  if (!(i.change.amount > 0)) errors.push('Enter the size of the change.');
  if (i.effectiveDate < i.today) {
    errors.push('A pay change starts today or later, never in the past.');
  }
  // processed payroll never changes: the change can't start in or before a processed month
  const start = monthOf(i.effectiveDate);
  const clash = i.employees
    .map((e) => ({
      e,
      m: e.processedMonths
        .filter((m) => m >= start)
        .sort()
        .at(-1),
    }))
    .filter((x) => x.m);
  if (clash.length) {
    const latest = clash
      .map((x) => x.m!)
      .sort()
      .at(-1)!;
    errors.push(
      `Payroll for ${monthLabel(latest)} is already processed for ${clash.length === 1 ? clash[0].e.name : `${clash.length} of these employees`}, so the change can’t start in or before that month. Pick a date after ${monthLabel(latest)}.`,
    );
  }

  const lines = i.employees.map((e): PreviewLine => {
    const old = e.current?.rates ?? ZERO;
    const next = applyToRates(old, i.change);
    const dayPayOld = r2(old.dayRate * i.standardHoursPerDay);
    const dayPayNew = r2(next.dayRate * i.standardHoursPerDay);
    const minimum = i.minimumDailyPay[e.category];
    let blocked: string | null = null;
    if (!e.current) blocked = 'No pay rate in force to change.';
    else if (KEYS.some((k) => next[k] < 0))
      blocked = 'A rate would fall below Rs. 0.';
    else if (minimum !== null && next.dayRate > 0 && dayPayNew < minimum) {
      blocked = `Below the ${e.category} minimum: Rs. ${dayPayNew} a day against Rs. ${minimum}.`;
    }
    const hoursBasis = KEYS.reduce((s, k) => s + e.hours[HOURS[k]], 0);
    const monthlyChange = r2(
      KEYS.reduce((s, k) => s + (next[k] - old[k]) * e.hours[HOURS[k]], 0),
    );
    return {
      employeeId: e.id,
      name: e.name,
      category: e.category,
      role: e.role,
      onOverride: e.current?.source === 'override',
      old,
      new: next,
      dayPayOld,
      dayPayNew,
      hoursBasis: r2(hoursBasis),
      monthlyChange,
      blocked,
    };
  });

  const categories = [...new Set(i.employees.map((e) => e.category))];
  return {
    lines,
    totalMonthlyChange: r2(lines.reduce((s, l) => s + l.monthlyChange, 0)),
    isDecrease: i.change.direction === 'decrease',
    minimumNotSet: categories
      .filter((c) => i.minimumDailyPay[c] === null)
      .sort(),
    errors,
  };
}

/** Everything that stops a change being prepared or approved, in words. */
export function blockers(p: Preview, decreaseAgreed: boolean): string[] {
  const out = [...p.errors];
  const blocked = p.lines.filter((l) => l.blocked);
  if (blocked.length) {
    out.push(
      `${blocked.length} employee${blocked.length === 1 ? '' : 's'} can’t take this change: ${blocked.map((l) => `${l.name} (${l.blocked})`).join('; ')}`,
    );
  }
  if (p.isDecrease && !decreaseAgreed) {
    out.push(
      'Reducing an employee’s pay usually needs their written agreement. Confirm this has been obtained.',
    );
  }
  return out;
}

/** "+5% (rounded to Rs 10)", "− Rs 20/hour" */
export function describeChange(c: ChangeSpec): string {
  const sign = c.direction === 'increase' ? '+' : '−';
  const size = c.kind === 'percent' ? `${c.amount}%` : `Rs ${c.amount}/hour`;
  return `${sign}${size}${c.rounding ? ` (rounded to Rs ${c.rounding})` : ''}`;
}
