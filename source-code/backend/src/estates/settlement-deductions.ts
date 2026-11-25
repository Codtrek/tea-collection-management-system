/**
 * Which estate advances a settlement period deducts (Estate-Owner-Advances-Addendum §4). Pure,
 * tested in settlement-deductions.spec.ts. The deductions themselves — order, cap, carry — are
 * the settlement generator's (settlement-generator.ts).
 */
import { labelToKey } from '../reports/reports-map';
import { type EstateAdvanceFacts, planOf } from './estate-advance-balance';

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
