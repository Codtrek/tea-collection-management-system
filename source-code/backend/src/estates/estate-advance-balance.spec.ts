import type { RepaymentFacts } from '../advances/installments';
import {
  dbStatusFor,
  estateAdvanceOutstanding,
  planOf,
  recoveredOf,
  recoveryStatus,
  remainingOf,
  scheduleFor,
} from './estate-advance-balance';

const adv = (
  id: string,
  estateId: number,
  amount: number,
  more: { installmentAmount?: string; startPeriod?: string } = {},
) => ({
  id,
  estateId,
  amount: String(amount),
  dateIssued: '2026-11-05',
  ...more,
});
const settled = (
  advanceId: string,
  period: string,
  planned: number,
  amount: number,
): RepaymentFacts => ({
  advanceId,
  period,
  status: 'recovered',
  plannedAmount: String(planned),
  amount: String(amount),
});

describe('estate-advance-balance', () => {
  const a = adv('EADV-1', 1, 50000, {
    installmentAmount: '10000',
    startPeriod: 'December 2026',
  });

  it('nothing recovered yet: all remaining, Pending deduction', () => {
    expect(remainingOf(a, [])).toBe(50000);
    expect(recoveryStatus(a, [])).toBe('Pending deduction');
    expect(dbStatusFor(a, [])).toBe('pending_deduction');
  });

  it('partly recovered is Recovering — only Rs. 0 remaining is Deducted', () => {
    const part = [settled('EADV-1', 'December 2026', 10000, 10000)];
    expect(recoveredOf(a, part)).toBe(10000);
    expect(recoveryStatus(a, part)).toBe('Recovering');
    expect(dbStatusFor(a, part)).toBe('recovering');
    const all = [settled('EADV-1', 'December 2026', 50000, 50000)];
    expect(recoveryStatus(a, all)).toBe('Deducted');
    expect(dbStatusFor(a, all)).toBe('deducted');
  });

  it('a short settlement carries forward and the schedule extends', () => {
    const recs = [settled('EADV-1', 'December 2026', 10000, 4000)];
    const s = scheduleFor(a, recs);
    expect(s.months[0]).toMatchObject({
      period: 'December 2026',
      planned: 10000,
      deducted: 4000,
      carried: 6000,
      status: 'Deducted',
    });
    expect(s.months.slice(1).map((m) => m.planned)).toEqual([
      10000, 10000, 10000, 10000, 6000,
    ]);
    expect(s.clearedPeriod).toBe('May 2027');
    expect(s.nextPeriod).toBe('January 2027');
  });

  it('a legacy row with no plan is one deduction the month after issue', () => {
    expect(planOf(adv('EADV-2', 1, 30000))).toEqual({
      amount: 30000,
      installment: 30000,
      startPeriod: 'December 2026',
    });
  });

  it('outstanding sums remaining per estate and leaves out settled estates', () => {
    const out = estateAdvanceOutstanding(
      [
        a,
        adv('EADV-2', 1, 10000),
        adv('EADV-3', 2, 30000),
        adv('EADV-4', 3, 5000),
      ],
      [
        settled('EADV-1', 'December 2026', 10000, 10000),
        settled('EADV-4', 'December 2026', 5000, 5000),
      ],
    );
    expect(out.get(1)).toBe(50000);
    expect(out.get(2)).toBe(30000);
    expect(out.has(3)).toBe(false);
  });
});
