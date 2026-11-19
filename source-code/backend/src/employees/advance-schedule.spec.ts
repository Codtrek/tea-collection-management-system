import type { RecoveryFacts } from './advance-balance';
import {
  installmentForMonths,
  monthsForInstallment,
  normalizeNic,
  planError,
  projectSchedule,
  scheduleOf,
} from './advance-schedule';

const rec = (
  period: string,
  planned: number,
  amount: number,
  status: 'reserved' | 'recovered' = 'recovered',
): RecoveryFacts => ({
  advanceId: 'A',
  kind: 'payroll',
  period,
  status,
  plannedAmount: String(planned),
  amount: String(amount),
});

describe('installment schedule', () => {
  it('the last installment takes the remainder — Rs. 20,000 at Rs. 6,000 = 6,000 / 6,000 / 6,000 / 2,000', () => {
    expect(scheduleOf(20000, 6000, 'December 2026')).toEqual([
      { period: 'December 2026', amount: 6000 },
      { period: 'January 2027', amount: 6000 },
      { period: 'February 2027', amount: 6000 },
      { period: 'March 2027', amount: 2000 },
    ]);
  });

  it('an amount per month fills in the months, and months fill in the amount', () => {
    expect(monthsForInstallment(20000, 5000)).toBe(4);
    expect(monthsForInstallment(20000, 6000)).toBe(4);
    expect(installmentForMonths(20000, 6)).toBe(3334);
    expect(scheduleOf(20000, 3334, 'January 2027').at(-1)).toEqual({
      period: 'June 2027',
      amount: 3330,
    });
  });

  it('validation: installment ≤ advance, months ≤ the maximum', () => {
    expect(planError(20000, 5000, 6)).toBeNull();
    expect(planError(20000, 25000, 6)).toMatch(/more than the advance/);
    expect(planError(20000, 3000, 6)).toMatch(/7 months.*most allowed is 6/);
    expect(planError(20000, 0, 6)).toMatch(/more than Rs. 0/);
  });
});

describe('projected schedule', () => {
  const plan = {
    amount: 20000,
    installment: 5000,
    startPeriod: 'December 2026',
  };

  it('before any payroll: the plan as requested, cleared in the last month', () => {
    const p = projectSchedule(plan, []);
    expect(p.months.map((m) => [m.period, m.planned])).toEqual([
      ['December 2026', 5000],
      ['January 2027', 5000],
      ['February 2027', 5000],
      ['March 2027', 5000],
    ]);
    expect(p).toMatchObject({
      clearedPeriod: 'March 2027',
      nextPeriod: 'December 2026',
    });
  });

  it('a partial month EXTENDS the schedule (the shortfall is not doubled up later)', () => {
    const p = projectSchedule(plan, [rec('December 2026', 5000, 2000)]);
    expect(
      p.months.map((m) => [m.period, m.planned, m.deducted, m.status]),
    ).toEqual([
      ['December 2026', 5000, 2000, 'Deducted'],
      ['January 2027', 5000, 0, 'Planned'],
      ['February 2027', 5000, 0, 'Planned'],
      ['March 2027', 5000, 0, 'Planned'],
      ['April 2027', 3000, 0, 'Planned'],
    ]);
    expect(p.months[0].carried).toBe(3000);
    expect(p.clearedPeriod).toBe('April 2027');
  });

  it('a reschedule changes only the months still to come — processed months stay as they were', () => {
    const recs = [
      rec('December 2026', 5000, 5000),
      rec('January 2027', 5000, 5000),
    ];
    const p = projectSchedule(
      { ...plan, installment: 2500, startPeriod: 'March 2027' },
      recs,
    );
    expect(p.months.slice(0, 2).map((m) => [m.period, m.deducted])).toEqual([
      ['December 2026', 5000],
      ['January 2027', 5000],
    ]);
    expect(p.months.slice(2).map((m) => [m.period, m.planned])).toEqual([
      ['March 2027', 2500],
      ['April 2027', 2500],
      ['May 2027', 2500],
      ['June 2027', 2500],
    ]);
  });

  it('an early cash repayment shortens the schedule', () => {
    const cash: RecoveryFacts = {
      advanceId: 'A',
      kind: 'cash',
      period: null,
      status: 'recovered',
      plannedAmount: '0',
      amount: '8000',
    };
    const p = projectSchedule(plan, [rec('December 2026', 5000, 5000), cash]);
    expect(
      p.months
        .filter((m) => m.status === 'Planned')
        .map((m) => [m.period, m.planned]),
    ).toEqual([
      ['January 2027', 5000],
      ['February 2027', 2000],
    ]);
    expect(p.clearedPeriod).toBe('February 2027');
  });

  it('a reserved (Pending) month shows as Reserved and is the next deduction', () => {
    const p = projectSchedule(plan, [
      rec('December 2026', 5000, 5000, 'reserved'),
    ]);
    expect(p.months[0].status).toBe('Reserved');
    expect(p.nextPeriod).toBe('December 2026');
  });
});

describe('NIC normalisation (no self-approval)', () => {
  it('converts the old 9-digit + V/X format to the 12-digit one', () => {
    expect(normalizeNic('853202937V')).toBe('198532002937');
    expect(normalizeNic(' 853202937x ')).toBe('198532002937');
    expect(normalizeNic('198532002937')).toBe('198532002937');
    expect(normalizeNic('853202937V')).toBe(normalizeNic('198532002937'));
  });

  it('anything else is unknown, so the identity check can say it could not run', () => {
    expect(normalizeNic(null)).toBeNull();
    expect(normalizeNic('')).toBeNull();
    expect(normalizeNic('12345')).toBeNull();
  });
});
