export type TransitionResult = { ok: true } | { ok: false; error: string };

// Per-transaction bank transfer fee (Rs), deducted from each payee's net payable.
export const DEFAULT_BANK_TRANSFER_FEE = 3;

export type PaymentInput = {
  superWeightKg: number;
  normalWeightKg: number;
  superRatePerKg: number;
  normalRatePerKg: number;
  transportCost: number;
  fertilizerDeductions: number;
  advanceDeductions: number;
  bankTransferFee: number;
};

export type PaymentBreakdown = {
  grossAmount: number;
  totalDeductions: number;
  netAmount: number;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function validatePaymentRates(superRatePerKg: number, normalRatePerKg: number): TransitionResult {
  if (!Number.isFinite(superRatePerKg) || !Number.isFinite(normalRatePerKg)) {
    return { ok: false, error: 'Rates must be numbers' };
  }
  if (superRatePerKg <= 0 || normalRatePerKg <= 0) {
    return { ok: false, error: 'Rates must be greater than zero' };
  }
  return { ok: true };
}

export function calculateMonthlyPayment(input: PaymentInput): PaymentBreakdown {
  const grossAmount = round2(
    input.superWeightKg * input.superRatePerKg + input.normalWeightKg * input.normalRatePerKg,
  );
  const totalDeductions = round2(
    round2(input.transportCost) +
      round2(input.fertilizerDeductions) +
      round2(input.advanceDeductions) +
      round2(input.bankTransferFee),
  );
  return {
    grossAmount,
    totalDeductions,
    netAmount: round2(grossAmount - totalDeductions),
  };
}
