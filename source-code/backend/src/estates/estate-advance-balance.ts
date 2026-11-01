/**
 * The ONE estate-advance balance rule (Estate-Owner-Advances-Addendum §3):
 * remaining = amount − Σ recoveries, never below 0. The advances list, its detail page and their
 * totals read it; /estates, EST-10 and Settlements are to read it too (§4, awaiting approval).
 */

export type EstateAdvanceRecoveryStatus =
  | 'Pending deduction'
  | 'Partly deducted'
  | 'Deducted';

interface AdvanceLike {
  id: string;
  estateId: number;
  amount: string | number;
}
interface RecoveryLike {
  advanceId: string;
  amount: string | number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function recoveredOf(
  advanceId: string,
  recoveries: RecoveryLike[],
): number {
  return round2(
    recoveries
      .filter((r) => r.advanceId === advanceId)
      .reduce((s, r) => s + Number(r.amount), 0),
  );
}

export function remainingOf(
  advance: AdvanceLike,
  recoveries: RecoveryLike[],
): number {
  return Math.max(
    0,
    round2(Number(advance.amount) - recoveredOf(advance.id, recoveries)),
  );
}

export function recoveryStatus(
  advance: AdvanceLike,
  recoveries: RecoveryLike[],
): EstateAdvanceRecoveryStatus {
  const recovered = recoveredOf(advance.id, recoveries);
  if (recovered <= 0) return 'Pending deduction';
  return remainingOf(advance, recoveries) > 0 ? 'Partly deducted' : 'Deducted';
}

/** Σ remaining per estate — what each owner still owes the factory in advances. */
export function estateAdvanceOutstanding(
  advances: AdvanceLike[],
  recoveries: RecoveryLike[],
): Map<number, number> {
  const out = new Map<number, number>();
  for (const a of advances) {
    const left = remainingOf(a, recoveries);
    if (left > 0)
      out.set(a.estateId, round2((out.get(a.estateId) ?? 0) + left));
  }
  return out;
}
