import { DEFAULT_BANK_TRANSFER_FEE, calculateMonthlyPayment, validatePaymentRates } from '../payment';

describe('validatePaymentRates', () => {
  test('accepts positive rates', () => {
    expect(validatePaymentRates(250, 180)).toEqual({ ok: true });
  });

  test('rejects non-positive or non-numeric rates', () => {
    expect(validatePaymentRates(0, 180)).toEqual({ ok: false, error: 'Rates must be greater than zero' });
    expect(validatePaymentRates(250, -1)).toEqual({ ok: false, error: 'Rates must be greater than zero' });
    expect(validatePaymentRates(Number.NaN, 180)).toEqual({ ok: false, error: 'Rates must be numbers' });
  });
});

describe('calculateMonthlyPayment', () => {
  test('computes gross revenue from graded weights and rates', () => {
    const result = calculateMonthlyPayment({
      superWeightKg: 100,
      normalWeightKg: 50,
      superRatePerKg: 250,
      normalRatePerKg: 180,
      transportCost: 0,
      fertilizerDeductions: 0,
      advanceDeductions: 0,
      bankTransferFee: 0,
    });

    expect(result.grossAmount).toBe(100 * 250 + 50 * 180);
    expect(result.netAmount).toBe(100 * 250 + 50 * 180);
  });

  test('subtracts all deduction categories from gross', () => {
    const result = calculateMonthlyPayment({
      superWeightKg: 100,
      normalWeightKg: 0,
      superRatePerKg: 200,
      normalRatePerKg: 150,
      transportCost: 1500,
      fertilizerDeductions: 2000,
      advanceDeductions: 5000,
      bankTransferFee: DEFAULT_BANK_TRANSFER_FEE,
    });

    expect(result.grossAmount).toBe(20000);
    expect(result.totalDeductions).toBe(1500 + 2000 + 5000 + DEFAULT_BANK_TRANSFER_FEE);
    expect(result.netAmount).toBe(20000 - 1500 - 2000 - 5000 - DEFAULT_BANK_TRANSFER_FEE);
  });

  test('rounds amounts to two decimals', () => {
    const result = calculateMonthlyPayment({
      superWeightKg: 33.33,
      normalWeightKg: 0,
      superRatePerKg: 100.5,
      normalRatePerKg: 100,
      transportCost: 0.111,
      fertilizerDeductions: 0,
      advanceDeductions: 0,
      bankTransferFee: 0,
    });

    expect(result.grossAmount).toBe(3349.67);
    expect(result.totalDeductions).toBe(0.11);
    expect(result.netAmount).toBe(3349.56);
  });
});
