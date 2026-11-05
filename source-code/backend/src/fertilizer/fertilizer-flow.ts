import { ConflictException } from '@nestjs/common';
import type {
  DbRequestStatus,
  PaymentMethod,
  PaymentStatus,
} from './fertilizer-map';

/**
 * The fertilizer request status machine (Fertilizer-Delivery-Addendum §3) — the ONLY place
 * that says which move is legal. Every status change goes through `assertTransition`.
 *
 *   Requested → Approved | Partially approved | Rejected            (Officer)
 *             → Awaiting manager approval → Approved | Partially approved | Rejected (Manager)
 *   Approved / Partially approved → Ready for dispatch → Picked up → Out for delivery
 *     → Delivered | Partially delivered | Failed
 *   Failed / Partially delivered → Returned to factory → Rescheduled (next collection day)
 *     → Picked up …   or → Needs review (Nth failure) → Rescheduled (retry) | Cancelled
 *   Pre-pickup states → Cancelled (releases the committed stock)
 */
export const TRANSITIONS: Record<DbRequestStatus, readonly DbRequestStatus[]> =
  {
    Requested: [
      'Awaiting manager approval',
      'Approved',
      'Partially approved',
      'Rejected',
      'Cancelled',
    ],
    'Awaiting manager approval': [
      'Approved',
      'Partially approved',
      'Rejected',
      'Cancelled',
    ],
    Approved: ['Ready for dispatch', 'Needs review', 'Cancelled'],
    'Partially approved': ['Ready for dispatch', 'Needs review', 'Cancelled'],
    'Ready for dispatch': ['Picked up', 'Needs review', 'Cancelled'],
    Rescheduled: ['Picked up', 'Needs review', 'Delivered', 'Cancelled'],
    'Picked up': [
      'Out for delivery',
      'Delivered',
      'Partially delivered',
      'Failed',
    ],
    'Out for delivery': ['Delivered', 'Partially delivered', 'Failed'],
    'Partially delivered': ['Returned to factory'],
    Failed: ['Returned to factory'],
    'Returned to factory': ['Rescheduled', 'Needs review'],
    // Delivered from here = an officer released an undelivered shortfall (owner refused it)
    'Needs review': ['Rescheduled', 'Delivered', 'Cancelled'],
    Delivered: [],
    Rejected: [],
    Cancelled: [],
  };

export function canTransition(
  from: DbRequestStatus,
  to: DbRequestStatus,
): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(
  from: DbRequestStatus,
  to: DbRequestStatus,
): void {
  if (!canTransition(from, to)) {
    throw new ConflictException(
      `A request that is "${from}" can't move to "${to}".`,
    );
  }
}

/** Waiting for its delivery (stock still in the factory, committed to this owner). */
export const PRE_PICKUP: readonly DbRequestStatus[] = [
  'Ready for dispatch',
  'Rescheduled',
];

/** The agent has the fertilizer. */
export const WITH_AGENT: readonly DbRequestStatus[] = [
  'Picked up',
  'Out for delivery',
];

/** May still be cancelled (nothing is with an agent). */
export const CANCELLABLE: readonly DbRequestStatus[] = [
  'Requested',
  'Awaiting manager approval',
  'Approved',
  'Partially approved',
  'Ready for dispatch',
  'Rescheduled',
  'Needs review',
];

/** Payment method may change until the request is delivered (or closed). */
export const PAYMENT_METHOD_LOCKED: readonly DbRequestStatus[] = [
  'Delivered',
  'Rejected',
  'Cancelled',
];

/** A delivery is in play — the UI shows "Attempt n of N". */
const IN_DELIVERY: readonly DbRequestStatus[] = [
  'Ready for dispatch',
  'Picked up',
  'Out for delivery',
  'Partially delivered',
  'Failed',
  'Returned to factory',
  'Rescheduled',
];

/**
 * "Attempt 2 of 3": the attempt within the current cycle (failures since the last review + 1),
 * out of the configured maximum. Null when no delivery is in play.
 */
export function attemptLabel(
  status: DbRequestStatus,
  cycleFailures: number,
  maxAttempts: number,
): string | null {
  if (!IN_DELIVERY.includes(status)) return null;
  // a failure is counted when it's recorded, so a Failed request shows the attempt that failed
  const current = status === 'Failed' ? cycleFailures : cycleFailures + 1;
  return `Attempt ${Math.max(1, Math.min(current, maxAttempts))} of ${maxAttempts}`;
}

/** The single rule for the payment badge on FERT-05/06. */
export function paymentStatus(
  method: PaymentMethod,
  sums: { amountOwedRs: number; recoveredRs: number; paidRs: number },
): PaymentStatus {
  const { amountOwedRs, recoveredRs, paidRs } = sums;
  if (amountOwedRs <= 0) return 'Not due';
  const settled = recoveredRs + paidRs;
  if (settled >= amountOwedRs - 0.005) {
    return recoveredRs > 0 && paidRs === 0 ? 'Deducted' : 'Paid';
  }
  if (method === 'deduct') return 'Pending deduction';
  return settled > 0 ? 'Part paid' : 'Unpaid';
}
