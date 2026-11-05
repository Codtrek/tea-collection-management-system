import type { PermissionLevel } from '../admin/admin-map';

/**
 * Who may do what on the holiday calendar (Attendance-Leave-Addendum §4.1) — the matrix, row for
 * row, as one pure function. Two data-driven keys:
 *   • `holidayCalendar` — view (Officer) · edit (Manager) · approve (Administrator)
 *   • `holidayStatutory` — Poya / public holidays, type settings, the Google import (Administrator)
 * HolidayService asks `decide()` before every write; the portal only mirrors it to hide buttons.
 */
export type HolidayAction =
  | 'view'
  /** add / edit / delete a Poya or public holiday, import from Google */
  | 'statutory'
  /** the Paid / Work allowed defaults per type, "week starts on" */
  | 'types'
  | 'weeklyRule'
  /** a holiday for Factory workers or Office staff only */
  | 'categoryHoliday'
  | 'restDay'
  /** a closure for all employees */
  | 'factoryClosure'
  /** a same-day closure for all employees — takes effect now, reviewed after */
  | 'emergencyClosure'
  /** change or cancel a dated closure / category holiday */
  | 'changeHoliday'
  | 'approve';

export interface HolidayLevels {
  calendar: PermissionLevel;
  statutory: PermissionLevel;
}

/** Facts about the holiday being changed (`changeHoliday` only). */
export interface ChangeContext {
  /** created by the person asking */
  own: boolean;
  /** every date is after today */
  future: boolean;
  /** a Processed payroll row covers an employee it applies to, in its month */
  payrollProcessed: boolean;
  appliesTo: 'all' | 'factory' | 'office';
}

/** direct = do it now · request = store it for the Administrator · review = do it now, Administrator reviews after */
export type Outcome =
  | { kind: 'direct' }
  | { kind: 'request' }
  | { kind: 'review' }
  | { kind: 'deny'; message: string };

const RANK: Record<PermissionLevel, number> = {
  none: 0,
  view: 1,
  edit: 2,
  approve: 3,
};
const atLeast = (have: PermissionLevel, need: PermissionLevel) =>
  RANK[have] >= RANK[need];

const deny = (message: string): Outcome => ({ kind: 'deny', message });
const DIRECT: Outcome = { kind: 'direct' };

export function decide(
  action: HolidayAction,
  levels: HolidayLevels,
  ctx?: ChangeContext,
): Outcome {
  const { calendar, statutory } = levels;
  const admin = atLeast(calendar, 'approve');
  const manager = atLeast(calendar, 'edit');
  switch (action) {
    case 'view':
      return atLeast(calendar, 'view')
        ? DIRECT
        : deny('Your role may not see the holiday calendar.');
    case 'statutory':
      return atLeast(statutory, 'edit')
        ? DIRECT
        : deny('Only the Administrator changes Poya and public holidays.');
    case 'types':
      return atLeast(statutory, 'edit')
        ? DIRECT
        : deny('Only the Administrator changes the holiday type settings.');
    case 'weeklyRule':
      if (admin) return DIRECT;
      return manager
        ? { kind: 'request' }
        : deny('Your role may not change the weekly holiday.');
    case 'categoryHoliday':
    case 'restDay':
      return manager
        ? DIRECT
        : deny('Your role may not change the holiday calendar.');
    case 'factoryClosure':
      if (admin) return DIRECT;
      return manager
        ? { kind: 'request' }
        : deny('Your role may not declare a factory closure.');
    case 'emergencyClosure':
      if (admin) return DIRECT;
      return manager
        ? { kind: 'review' }
        : deny('Your role may not declare a factory closure.');
    case 'approve':
      return admin
        ? DIRECT
        : deny('Only the Administrator approves holiday changes.');
    case 'changeHoliday': {
      if (admin) return DIRECT;
      if (!manager)
        return deny('Your role may not change the holiday calendar.');
      if (!ctx) return deny('Unknown holiday.');
      if (ctx.appliesTo === 'all') {
        return deny('Only the Administrator changes a factory-wide closure.');
      }
      if (!ctx.own) return deny('You can only change holidays you created.');
      if (!ctx.future) return deny('Only future holidays can be changed.');
      if (ctx.payrollProcessed) {
        return deny('Payroll for that month is already processed.');
      }
      return DIRECT;
    }
  }
}

/** Throws-free check for "may this person do it at all" (direct, request or review). */
export const allowed = (o: Outcome) => o.kind !== 'deny';
