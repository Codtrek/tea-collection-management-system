/**
 * Advance repayment plans (Salary-Advances-Addendum §10) — the installment schedule, its
 * validation, the month-by-month projection shown on the detail page, and NIC normalisation for
 * the no-self-approval check. Pure, tested in advance-schedule.spec.ts.
 *
 * A month plans at most ONE installment (or what's left). What the gross couldn't take stays in
 * the balance, so a short month EXTENDS the schedule — it never doubles a later installment.
 */
import { keyToLabel, labelToKey } from '../reports/reports-map';
import type { RecoveryFacts } from './advance-balance';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** 'YYYY-MM' + n months */
export function addMonths(key: string, n: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** A plan typed as months → the installment (whole rupees, rounded up; the last one takes the remainder). */
export function installmentForMonths(amount: number, months: number): number {
  return Math.ceil(amount / Math.max(1, months));
}

/** A plan typed as an amount per month → how many months it takes. */
export function monthsForInstallment(
  amount: number,
  installment: number,
): number {
  return Math.max(1, Math.ceil(round2(amount / installment)));
}

/** The planned months: Rs. 20,000 at Rs. 6,000 → 6,000 / 6,000 / 6,000 / 2,000. */
export function scheduleOf(
  amount: number,
  installment: number,
  startPeriod: string,
): { period: string; amount: number }[] {
  const out: { period: string; amount: number }[] = [];
  let left = round2(amount);
  let key = labelToKey(startPeriod);
  while (left > 0 && out.length < 600) {
    const take = round2(Math.min(installment, left));
    out.push({ period: keyToLabel(key), amount: take });
    left = round2(left - take);
    key = addMonths(key, 1);
  }
  return out;
}

/** null when the plan is valid, else what's wrong (shown to the user). */
export function planError(
  amount: number,
  installment: number,
  maxMonths: number,
): string | null {
  if (!(installment > 0)) return 'The installment must be more than Rs. 0.';
  if (installment > amount)
    return 'The installment can’t be more than the advance.';
  const months = monthsForInstallment(amount, installment);
  if (months > maxMonths) {
    return `That plan runs ${months} months — the most allowed is ${maxMonths}.`;
  }
  return null;
}

export type ScheduleStatus = 'Deducted' | 'Reserved' | 'Planned';

export interface ScheduleMonth {
  period: string;
  planned: number;
  deducted: number;
  /** planned − deducted, left in the balance (extends the schedule) */
  carried: number;
  /** Deducted (processed) · Reserved (in a Pending payroll row) · Planned (future) */
  status: ScheduleStatus;
}

export interface ScheduleProjection {
  months: ScheduleMonth[];
  /** the month the balance reaches Rs. 0 (null if it never does — no plan) */
  clearedPeriod: string | null;
  /** the next month that will deduct from it */
  nextPeriod: string | null;
}

/**
 * The detail page's schedule: what each payroll month planned and deducted so far, then the
 * remaining balance spread forward at one installment a month from the later of the start
 * month and the month after the last one on record. Cash repayments reduce the balance (and so
 * shorten the schedule); a reschedule changes only the projected months.
 */
export function projectSchedule(
  plan: { amount: number; installment: number; startPeriod: string },
  recs: RecoveryFacts[],
): ScheduleProjection {
  const payroll = recs
    .filter((r) => r.kind === 'payroll' && r.period)
    .sort((a, b) => labelToKey(a.period!).localeCompare(labelToKey(b.period!)));
  const months: ScheduleMonth[] = payroll.map((r) => ({
    period: r.period!,
    planned: Number(r.plannedAmount),
    deducted: Number(r.amount),
    carried: round2(Math.max(0, Number(r.plannedAmount) - Number(r.amount))),
    status: r.status === 'recovered' ? 'Deducted' : 'Reserved',
  }));
  const taken = round2(
    recs
      .filter((r) => r.kind === 'payroll' || r.status === 'recovered')
      .reduce((s, r) => s + Number(r.amount), 0),
  );
  let left = Math.max(0, round2(plan.amount - taken));
  const lastKey = payroll.length
    ? labelToKey(payroll[payroll.length - 1].period!)
    : '';
  let key = labelToKey(plan.startPeriod);
  if (lastKey && addMonths(lastKey, 1) > key) key = addMonths(lastKey, 1);
  while (left > 0 && months.length < 600) {
    const planned = round2(Math.min(plan.installment, left));
    months.push({
      period: keyToLabel(key),
      planned,
      deducted: 0,
      carried: 0,
      status: 'Planned',
    });
    left = round2(left - planned);
    key = addMonths(key, 1);
  }
  return {
    months,
    clearedPeriod:
      months.filter((m) => m.planned > 0 || m.deducted > 0).at(-1)?.period ??
      null,
    nextPeriod:
      months.find((m) => m.status !== 'Deducted' && m.planned > 0)?.period ??
      null,
  };
}

/**
 * Sri Lankan NIC → the 12-digit form, so an old '853202937V' and a new '198532002937' match:
 * old = YY DDD SSS C + V/X → 19YY DDD 0SSS C. null when it's neither format.
 */
export function normalizeNic(nic: string | null | undefined): string | null {
  const v = (nic ?? '').trim().toUpperCase();
  if (/^\d{12}$/.test(v)) return v;
  const old = /^(\d{2})(\d{3})(\d{3})(\d)[VX]$/.exec(v);
  return old ? `19${old[1]}${old[2]}0${old[3]}${old[4]}` : null;
}

export interface SelfApprovalCheck {
  blocked: boolean;
  /** why Approve is disabled — shown beside the button */
  reason: string | null;
  /** false when a NIC was missing on either side, so only the requester rule could run */
  identityChecked: boolean;
}

/**
 * Nobody approves their own advance: blocked when the approver requested it, or when the
 * approver's NIC (portal login) is the employee's NIC (HR record) — compared in the 12-digit form.
 */
export function selfApprovalCheck(
  requestedByUserId: number | null,
  employeeNic: string | null,
  approver: { sub?: number; nic?: string | null },
): SelfApprovalCheck {
  const requester =
    approver.sub !== undefined && requestedByUserId === approver.sub;
  const a = normalizeNic(approver.nic);
  const e = normalizeNic(employeeNic);
  if (requester) {
    return {
      blocked: true,
      reason: 'You requested this advance — someone else must approve it.',
      identityChecked: !!(a && e),
    };
  }
  if (!a || !e) return { blocked: false, reason: null, identityChecked: false };
  return a === e
    ? {
        blocked: true,
        reason: 'This advance is for you — someone else must approve it.',
        identityChecked: true,
      }
    : { blocked: false, reason: null, identityChecked: true };
}
