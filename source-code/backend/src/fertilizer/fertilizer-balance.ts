/**
 * THE fertilizer balance selector (Fertilizer-Delivery-Addendum §8). Every figure for "what
 * an owner still owes for fertilizer" — EST-10's Outstanding, the estate directory, a
 * request's payment panel — comes from here:
 *
 *   outstanding = Σ charges − Σ charges recovered by a processed settlement − Σ cash/bank payments
 */
export interface ChargeLike {
  totalCharge: string | number;
  settlementId: string | null;
}

export interface PaymentLike {
  amount: string | number;
}

export interface FertilizerBalance {
  chargedRs: number;
  recoveredRs: number;
  paidRs: number;
  outstandingRs: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function fertilizerOutstanding(
  charges: readonly ChargeLike[],
  payments: readonly PaymentLike[] = [],
): FertilizerBalance {
  const chargedRs = charges.reduce((s, c) => s + Number(c.totalCharge), 0);
  const recoveredRs = charges
    .filter((c) => c.settlementId)
    .reduce((s, c) => s + Number(c.totalCharge), 0);
  const paidRs = payments.reduce((s, p) => s + Number(p.amount), 0);
  return {
    chargedRs: round2(chargedRs),
    recoveredRs: round2(recoveredRs),
    paidRs: round2(paidRs),
    outstandingRs: round2(Math.max(0, chargedRs - recoveredRs - paidRs)),
  };
}
