/**
 * Daily expense entry rules (Finance-Reports-Addendum §7) — pure, tested in
 * expense-entry-rules.spec.ts. ReportsService applies them; nothing here reads the database.
 *
 *  • no future dates (factory calendar day, Asia/Colombo)
 *  • `expenses: edit` (the Officer) logs entries, and may change their OWN entry for
 *    `editWindowDays` after logging it
 *  • after that — or for anyone else's entry — only `expenses: approve` (the Factory Manager), with
 *    a reason
 *  • `expenses: view` (the Administrator) reads only; categories are an Administration setting
 *  • every create / change is audited (before → after)
 *  • a month-close lock would go here; there is no month close in the system yet
 */
import { daysBack } from '../employees/attendance-rules';
import type { PermissionLevel } from '../admin/admin-map';

export function createError(
  level: PermissionLevel,
  date: string,
  today: string,
): string | null {
  if (level !== 'edit' && level !== 'approve') {
    return 'Your role may not log daily expenses.';
  }
  if (date > today) return 'An expense can’t be dated in the future.';
  return null;
}

export interface EditContext {
  level: PermissionLevel;
  /** the actor logged this entry */
  isCreator: boolean;
  /** the factory day the entry was logged */
  loggedOn: string;
  today: string;
  windowDays: number;
}

export interface EditAccess {
  /** may change the entry at all */
  allowed: boolean;
  /** the change needs a reason (Manager outside the creator's window) */
  needsReason: boolean;
  /** why not, or what the reason is for — shown on the form */
  note: string | null;
}

/** Who may change an entry, and whether they must say why. */
export function editAccess(c: EditContext): EditAccess {
  const inWindow = daysBack(c.loggedOn, c.today) <= c.windowDays;
  const days = `${c.windowDays} day${c.windowDays === 1 ? '' : 's'}`;
  if (c.level === 'edit' && c.isCreator && inWindow) {
    return { allowed: true, needsReason: false, note: null };
  }
  if (c.level === 'approve') {
    if (c.isCreator && inWindow) {
      return { allowed: true, needsReason: false, note: null };
    }
    return {
      allowed: true,
      needsReason: true,
      note: inWindow
        ? 'You didn’t log this entry: give a reason for the change.'
        : `Logged more than ${days} ago: give a reason for the change.`,
    };
  }
  if (c.level === 'edit') {
    return {
      allowed: false,
      needsReason: false,
      note: c.isCreator
        ? `Entries can be changed by the person who logged them for ${days}. After that, only the Factory Manager can change it, with a reason.`
        : 'Only the person who logged this entry (within its first days) or the Factory Manager can change it.',
    };
  }
  return {
    allowed: false,
    needsReason: false,
    note: 'Your role can view expenses but not change them.',
  };
}

/** null when the change may go ahead, else why not. */
export function editError(
  c: EditContext,
  newDate: string | undefined,
  reason: string | null | undefined,
): string | null {
  const a = editAccess(c);
  if (!a.allowed) return a.note;
  if (newDate !== undefined && newDate > c.today) {
    return 'An expense can’t be dated in the future.';
  }
  if (a.needsReason && !reason?.trim()) return a.note;
  return null;
}

/** "Amount: Rs. 5,000 → Rs. 5,200 · Category: Electricity → Water" — the audit diff. */
export function changeSummary(
  before: Record<string, string | number | null>,
  after: Record<string, string | number | null>,
  labels: Record<string, string>,
): string {
  return Object.keys(labels)
    .filter(
      (k) => after[k] !== undefined && String(after[k]) !== String(before[k]),
    )
    .map((k) => `${labels[k]}: ${before[k] ?? '—'} → ${after[k] ?? '—'}`)
    .join(' · ');
}
