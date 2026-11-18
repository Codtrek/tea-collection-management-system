/**
 * Settlement deductions for estate owner advances (Estate-Owner-Advances-Addendum §4). Pure,
 * tested in settlement-deductions.spec.ts.
 *
 * planSettlementDeductions — what a settlement GENERATOR (not built yet) is to deduct: each step
 *   in the configured order (default transport → fertilizer → advances) takes what it's due, up to
 *   what's left; advances additionally never take more than the cap % of gross. Whatever couldn't
 *   be taken is carried forward. Net payable is never below Rs. 0.
 *
 * allocateStoredAdvanceDeduction — what Process does TODAY, while every settlement's
 *   advance_deduction is a stored figure: split what the owner actually had taken across their
 *   open advances (due installments first, oldest first; any excess pays down the oldest
 *   balances). What it doesn't cover is carried forward. Settlement amounts never change.
 */
import {
  freeForPeriod,
  planPeriodDeductions,
  type PeriodDeductionLine,
  remainingOf,
  type RepaymentFacts,
  round2,
} from '../advances/installments';
import { labelToKey } from '../reports/reports-map';
import {
  type EstateAdvanceFacts,
  installmentOf,
  planOf,
} from './estate-advance-balance';
import type { SettlementDeductionStep } from './estate-advance-settings.service';

/** Advances due in `period` — started on or before it — oldest first. */
export function dueAdvances<A extends EstateAdvanceFacts>(
  open: A[],
  period: string,
): A[] {
  const key = labelToKey(period);
  return open
    .filter((a) => labelToKey(planOf(a).startPeriod) <= key)
    .sort(
      (a, b) =>
        a.dateIssued.localeCompare(b.dateIssued) || a.id.localeCompare(b.id),
    );
}

export interface SettlementDeductionInput {
  period: string;
  gross: number;
  /** signed corrections to earlier deliveries — added to gross before anything is deducted */
  adjustment: number;
  transport: number;
  /** fertilizer charges the owner chose to deduct from tea payment */
  fertilizer: number;
  /** the estate's open advances (any order) and their repayment rows */
  advances: EstateAdvanceFacts[];
  recs: RepaymentFacts[];
  capPct: number;
  order: SettlementDeductionStep[];
}

export interface SettlementDeductionPlan {
  taken: Record<SettlementDeductionStep, number>;
  /** due − taken per step: stays owed for a later settlement */
  carried: Record<SettlementDeductionStep, number>;
  advanceLines: PeriodDeductionLine[];
  net: number;
}

export function planSettlementDeductions(
  i: SettlementDeductionInput,
): SettlementDeductionPlan {
  let room = Math.max(0, round2(i.gross + i.adjustment));
  const taken = { transport: 0, fertilizer: 0, advances: 0 };
  const carried = { transport: 0, fertilizer: 0, advances: 0 };
  let advanceLines: PeriodDeductionLine[] = [];
  for (const step of i.order) {
    if (step === 'advances') {
      const cap = Math.min(room, (i.gross * i.capPct) / 100);
      const plan = planPeriodDeductions(
        dueAdvances(i.advances, i.period),
        i.recs,
        i.period,
        cap,
        installmentOf,
      );
      advanceLines = plan.lines;
      taken.advances = plan.total;
      carried.advances = plan.carried;
    } else {
      const due = Math.max(0, round2(i[step]));
      taken[step] = round2(Math.min(due, room));
      carried[step] = round2(due - taken[step]);
    }
    room = round2(room - taken[step]);
  }
  return {
    taken,
    carried,
    advanceLines,
    net: Math.max(
      0,
      round2(
        i.gross +
          i.adjustment -
          taken.transport -
          taken.fertilizer -
          taken.advances,
      ),
    ),
  };
}

export interface StoredAllocation {
  lines: PeriodDeductionLine[];
  /** of the stored figure, what no open balance could take (reported, never invented) */
  unallocated: number;
}

export function allocateStoredAdvanceDeduction(
  stored: number,
  open: EstateAdvanceFacts[],
  recs: RepaymentFacts[],
  period: string,
): StoredAllocation {
  let left = Math.max(0, round2(stored));
  const lines = new Map<string, PeriodDeductionLine>();
  // 1. each due advance's installment for this period, oldest first
  for (const a of dueAdvances(open, period)) {
    const planned = round2(
      Math.min(installmentOf(a), freeForPeriod(a, recs, period)),
    );
    if (planned <= 0) continue;
    const amount = round2(Math.min(planned, left));
    left = round2(left - amount);
    lines.set(a.id, { advanceId: a.id, planned, amount });
  }
  // 2. any excess was still taken from the owner — it pays down the oldest balances
  const oldestFirst = [...open].sort(
    (a, b) =>
      a.dateIssued.localeCompare(b.dateIssued) || a.id.localeCompare(b.id),
  );
  for (const a of oldestFirst) {
    if (left <= 0) break;
    const line = lines.get(a.id) ?? { advanceId: a.id, planned: 0, amount: 0 };
    const room = round2(remainingOf(a, recs) - line.amount);
    if (room <= 0) continue;
    const extra = round2(Math.min(room, left));
    line.amount = round2(line.amount + extra);
    left = round2(left - extra);
    lines.set(a.id, line);
  }
  return { lines: [...lines.values()], unallocated: left };
}
