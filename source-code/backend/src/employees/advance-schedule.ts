/**
 * Advance repayment plans (Salary-Advances-Addendum §10) — the installment schedule, its
 * validation and the month-by-month projection now live in the shared ../advances/installments.ts
 * (also used by estate owner advances); re-exported here so salary callers are unchanged. NIC
 * normalisation for the no-self-approval check stays here. Pure, tested in advance-schedule.spec.ts.
 */
export {
  addMonths,
  installmentForMonths,
  monthsForInstallment,
  planError,
  projectSchedule,
  scheduleOf,
  type ScheduleMonth,
  type ScheduleProjection,
  type ScheduleStatus,
} from '../advances/installments';

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
