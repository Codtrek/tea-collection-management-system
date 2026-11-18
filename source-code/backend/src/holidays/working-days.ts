/**
 * The ONE working-day rule (Attendance-Leave-Addendum §Holidays): what kind of day a date is for
 * one employee — a working day, the weekly holiday (or half day), their own rest day, or a dated
 * Poya / public holiday / declared closure. Attendance, leave and payroll all ask this.
 * Pure, tested in working-days.spec.ts. Dates are 'YYYY-MM-DD' factory calendar days.
 *
 * Weekly rules and rest days carry an `effectiveFrom`: a change applies from that date on and
 * never rewrites past weeks.
 */

export type EmployeeCategory = 'factory' | 'office';
export type HolidayKind = 'poya' | 'public' | 'closure';
export type DayType =
  | 'working'
  | 'half'
  | 'weekly'
  | 'rest'
  | 'poya'
  | 'public'
  | 'closure';

export interface HolidayFacts {
  date: string;
  name: string;
  type: HolidayKind;
  paid: boolean;
  workAllowed: boolean;
  appliesTo: 'all' | EmployeeCategory;
}

export interface WeeklyRuleFacts {
  category: EmployeeCategory;
  /** 0 = Sunday … 6 = Saturday */
  weekdays: number[];
  halfDayWeekday: number | null;
  effectiveFrom: string;
}

export interface RestDayFacts {
  employeeId: number;
  /** null = back to the category's weekly holiday */
  weekday: number | null;
  effectiveFrom: string;
}

export interface TypeDefaults {
  label: string;
  paid: boolean;
  workAllowed: boolean;
}

export interface CalendarFacts {
  holidays: HolidayFacts[];
  weekly: WeeklyRuleFacts[];
  restDays: RestDayFacts[];
  types: Record<'poya' | 'public' | 'weekly' | 'closure', TypeDefaults>;
}

export interface DayInfo {
  date: string;
  type: DayType;
  /** 'Vesak Poya', 'Weekly holiday', 'Rest day' … null on a working day */
  label: string | null;
  /** a day the employee is expected at work (a half day counts) */
  working: boolean;
  /** how much of a working day it is: 1, 0.5 (half day) or 0 */
  weight: number;
  /** a non-working day is paid (daily-paid workers) */
  paid: boolean;
  /** someone may still work it — recorded as "Worked on holiday" */
  workAllowed: boolean;
}

export const DEFAULT_TYPES: CalendarFacts['types'] = {
  poya: { label: 'Poya day', paid: true, workAllowed: true },
  public: { label: 'Public holiday', paid: true, workAllowed: true },
  weekly: { label: 'Weekly holiday', paid: false, workAllowed: true },
  closure: { label: 'Factory closure', paid: false, workAllowed: false },
};

const PRIORITY: HolidayKind[] = ['closure', 'public', 'poya'];

export function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Every date of 'YYYY-MM', in order. */
export function datesOfMonth(month: string): string[] {
  const [y, m] = month.split('-').map(Number);
  const n = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from(
    { length: n },
    (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`,
  );
}

/** Every date from `from` to `to`, inclusive. */
export function datesBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const [y, m, d] = from.split('-').map(Number);
  const cur = new Date(Date.UTC(y, m - 1, d));
  while (out.length < 3700) {
    const iso = cur.toISOString().slice(0, 10);
    if (iso > to) break;
    out.push(iso);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

/** The rule in force on `date`: the latest one whose effectiveFrom is on or before it. */
function inForce<T extends { effectiveFrom: string }>(
  rows: T[],
  date: string,
): T | undefined {
  return rows
    .filter((r) => r.effectiveFrom <= date)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
}

export function dayInfo(
  date: string,
  employee: { id: number; category: EmployeeCategory },
  facts: CalendarFacts,
): DayInfo {
  // 1. a dated holiday that applies to this employee's category
  const dated = facts.holidays
    .filter(
      (h) =>
        h.date === date &&
        (h.appliesTo === 'all' || h.appliesTo === employee.category),
    )
    .sort((a, b) => PRIORITY.indexOf(a.type) - PRIORITY.indexOf(b.type))[0];
  if (dated) {
    return {
      date,
      type: dated.type,
      label: dated.name,
      working: false,
      weight: 0,
      paid: dated.paid,
      workAllowed: dated.workAllowed,
    };
  }
  const weekly = facts.types.weekly;
  const wd = weekdayOf(date);
  // 2. the employee's own rest day overrides the category's weekly holiday
  const rest = inForce(
    facts.restDays.filter((r) => r.employeeId === employee.id),
    date,
  );
  if (rest && rest.weekday !== null) {
    return wd === rest.weekday
      ? {
          date,
          type: 'rest',
          label: 'Rest day',
          working: false,
          weight: 0,
          paid: weekly.paid,
          workAllowed: weekly.workAllowed,
        }
      : working(date);
  }
  // 3. the category's weekly holiday / half day in force that week
  const rule = inForce(
    facts.weekly.filter((r) => r.category === employee.category),
    date,
  );
  if (rule?.weekdays.includes(wd)) {
    return {
      date,
      type: 'weekly',
      label: weekly.label,
      working: false,
      weight: 0,
      paid: weekly.paid,
      workAllowed: weekly.workAllowed,
    };
  }
  if (rule && rule.halfDayWeekday === wd) {
    return {
      date,
      type: 'half',
      label: 'Half day',
      working: true,
      weight: 0.5,
      paid: true,
      workAllowed: true,
    };
  }
  return working(date);
}

function working(date: string): DayInfo {
  return {
    date,
    type: 'working',
    label: null,
    working: true,
    weight: 1,
    paid: true,
    workAllowed: true,
  };
}

/** Working days in a range for one employee — a half day counts 0.5; holidays and rest days 0. */
export function workingDaysIn(
  from: string,
  to: string,
  employee: { id: number; category: EmployeeCategory },
  facts: CalendarFacts,
): number {
  return datesBetween(from, to).reduce(
    (s, d) => s + dayInfo(d, employee, facts).weight,
    0,
  );
}
