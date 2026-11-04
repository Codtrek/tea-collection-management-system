/**
 * Attendance rules (Attendance-Leave-Addendum Phase 1) — pure, tested in attendance-rules.spec.ts.
 * AttendanceService applies them; nothing here reads the database.
 *
 *  • no future dates (factory calendar day)
 *  • an Officer (`attendance: edit`) marks today and up to `editWindowDays` back; older days need
 *    `attendance: approve` (the Factory Manager) and a reason — audited
 *  • a month whose payroll row is Processed is locked for that employee
 *  • a non-working day (weekly / rest / Poya / public / closure) can't be Absent or Leave;
 *    working it is "Worked on holiday" (flagged for payroll) — refused where work isn't allowed
 *  • Half-day needs AM / PM; Short leave needs the time out and back
 *  • a day filled by approved leave is locked (Phase 2)
 */
import type { DayInfo } from '../holidays/working-days';
import type { DbAttendanceStatus } from './employee-map';

export type AttendanceCode = 'P' | 'A' | 'L' | 'H' | 'S' | 'W';
export type PermissionLevel = 'none' | 'view' | 'edit' | 'approve';

export interface AttendanceInput {
  status: DbAttendanceStatus;
  half?: 'AM' | 'PM' | null;
  shortOut?: string | null;
  shortBack?: string | null;
}

export interface ResolvedAttendance {
  status: DbAttendanceStatus;
  half: 'AM' | 'PM' | null;
  shortOut: string | null;
  shortBack: string | null;
  holidayWorked: boolean;
  /** hours stored for payroll: Present / Worked on holiday / Short leave 8, Half-day 4, else 0 */
  dayHours: number;
}

const HOURS: Record<DbAttendanceStatus, number> = {
  Present: 8,
  'Short leave': 8,
  'Half-day': 4,
  Absent: 0,
  Leave: 0,
};

/** Whole days from `date` back to `today` (0 = today). */
export function daysBack(date: string, today: string): number {
  const t = (d: string) =>
    Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
  return Math.round((t(today) - t(date)) / 86_400_000);
}

/** Who may mark `date`: null when allowed (reason supplied where needed), else why not. */
export function editWindowError(
  date: string,
  today: string,
  windowDays: number,
  level: PermissionLevel,
  reason: string | null | undefined,
): string | null {
  if (date > today) return 'Attendance can’t be marked for a future date.';
  if (level !== 'edit' && level !== 'approve') {
    return 'Your role may not mark attendance.';
  }
  const back = daysBack(date, today);
  if (back <= windowDays) return null;
  if (level !== 'approve') {
    return `Only the Factory Manager can mark days more than ${windowDays} day${windowDays === 1 ? '' : 's'} back.`;
  }
  if (!reason?.trim()) {
    return `${date} is more than ${windowDays} days back — a reason is required.`;
  }
  return null;
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** One employee's mark for a day, checked against what kind of day it is for them. */
export function resolveAttendance(
  input: AttendanceInput,
  day: DayInfo,
): { ok: ResolvedAttendance } | { error: string } {
  const half = input.status === 'Half-day' ? (input.half ?? null) : null;
  if (input.status === 'Half-day' && half !== 'AM' && half !== 'PM') {
    return { error: 'Choose AM or PM for a half day.' };
  }
  let shortOut: string | null = null;
  let shortBack: string | null = null;
  if (input.status === 'Short leave') {
    shortOut = input.shortOut?.slice(0, 5) ?? null;
    shortBack = input.shortBack?.slice(0, 5) ?? null;
    if (
      !shortOut ||
      !shortBack ||
      !TIME.test(shortOut) ||
      !TIME.test(shortBack)
    ) {
      return {
        error: 'Short leave needs the time out and the time back (HH:MM).',
      };
    }
    if (shortBack <= shortOut) {
      return { error: 'The time back must be after the time out.' };
    }
  }
  let holidayWorked = false;
  if (!day.working) {
    const what = day.label ?? 'a non-working day';
    if (input.status === 'Absent' || input.status === 'Leave') {
      return {
        error: `${day.date} is ${what} — it can’t be marked ${input.status}.`,
      };
    }
    if (!day.workAllowed) {
      return { error: `${day.date} is ${what} — no work is allowed that day.` };
    }
    holidayWorked = true;
  }
  return {
    ok: {
      status: input.status,
      half,
      shortOut,
      shortBack,
      holidayWorked,
      dayHours: HOURS[input.status],
    },
  };
}

/** The grid's letter for a record. */
export function codeOf(
  r: { status: DbAttendanceStatus; holidayWorked: boolean },
  day?: Pick<DayInfo, 'working'>,
): AttendanceCode {
  // a present-type mark on a non-working day is always "Worked on holiday"
  const worked = r.status !== 'Absent' && r.status !== 'Leave';
  if (r.holidayWorked || (day && !day.working && worked)) return 'W';
  switch (r.status) {
    case 'Present':
      return 'P';
    case 'Absent':
      return 'A';
    case 'Leave':
      return 'L';
    case 'Half-day':
      return 'H';
    case 'Short leave':
      return 'S';
  }
}

export interface MonthTotals {
  present: number;
  absent: number;
  leave: number;
  half: number;
  short: number;
  /** worked on a non-working day */
  holidayWorked: number;
  /** working days up to today (a half day counts 0.5) */
  workingDays: number;
  /** present days ÷ working days, % (a half-day mark counts 0.5) */
  pct: number | null;
  /** working days up to today with no mark */
  unmarked: number;
}

/** Month totals from the employee's cells (only days up to today count). */
export function monthTotals(
  cells: { code: AttendanceCode | null; day: DayInfo; future: boolean }[],
): MonthTotals {
  const t: MonthTotals = {
    present: 0,
    absent: 0,
    leave: 0,
    half: 0,
    short: 0,
    holidayWorked: 0,
    workingDays: 0,
    pct: null,
    unmarked: 0,
  };
  let presentDays = 0;
  for (const c of cells) {
    if (c.future) continue;
    if (c.day.working) {
      t.workingDays += c.day.weight;
      if (!c.code) t.unmarked += 1;
    }
    switch (c.code) {
      case 'P':
        t.present += 1;
        presentDays += c.day.weight;
        break;
      case 'S':
        t.short += 1;
        presentDays += c.day.weight;
        break;
      case 'H':
        t.half += 1;
        presentDays += Math.min(0.5, c.day.weight);
        break;
      case 'A':
        t.absent += 1;
        break;
      case 'L':
        t.leave += 1;
        break;
      case 'W':
        t.holidayWorked += 1;
        break;
    }
  }
  t.pct =
    t.workingDays > 0
      ? Math.round((presentDays / t.workingDays) * 1000) / 10
      : null;
  return t;
}
