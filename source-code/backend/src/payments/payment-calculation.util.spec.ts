import {
  DEFAULT_BANK_TRANSFER_FEE,
  calculateMonthlyPayment,
  validatePaymentRates,
} from './payment-calculation.util';

describe('validatePaymentRates', () => {
  it('accepts positive finite rates', () => {
    expect(validatePaymentRates(100, 50)).toEqual({ ok: true });
  });

  it('rejects non-positive rates', () => {
    expect(validatePaymentRates(0, 50)).toEqual({
      ok: false,
      error: 'Rates must be greater than zero',
    });
    expect(validatePaymentRates(100, -5)).toEqual({
      ok: false,
      error: 'Rates must be greater than zero',
    });
  });

  it('rejects non-finite rates', () => {
    expect(validatePaymentRates(NaN, 50)).toEqual({
      ok: false,
      error: 'Rates must be numbers',
    });
  });
});

describe('calculateMonthlyPayment', () => {
  it('computes gross, deductions, and net amounts', () => {
    const breakdown = calculateMonthlyPayment({
      superWeightKg: 100,
      normalWeightKg: 50,
      superRatePerKg: 200,
      normalRatePerKg: 150,
      transportCost: 500,
      fertilizerDeductions: 0,
      advanceDeductions: 0,
      bankTransferFee: DEFAULT_BANK_TRANSFER_FEE,
    });

    expect(breakdown).toEqual({
      grossAmount: 27500,
      totalDeductions: 503,
      netAmount: 26997,
    });
  });

  it('rounds to 2 decimal places', () => {
    const breakdown = calculateMonthlyPayment({
      superWeightKg: 33.33,
      normalWeightKg: 0,
      superRatePerKg: 100.5,
      normalRatePerKg: 1,
      transportCost: 0.111,
      fertilizerDeductions: 0,
      advanceDeductions: 0,
      bankTransferFee: 0,
    });

    expect(breakdown).toEqual({
      grossAmount: 3349.67,
      totalDeductions: 0.11,
      netAmount: 3349.56,
    });
  });
});
