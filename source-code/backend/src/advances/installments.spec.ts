import {
  planMonthDeductions,
  remainingOf as salaryRemaining,
} from '../employees/advance-balance';
import type { AdvanceFacts, RecoveryFacts } from '../employees/advance-balance';
import {
  carriedForwardOf,
  earlyRepayable,
  lastProcessedKey,
  planPeriodDeductions,
  projectSchedule,
  remainingOf,
  rescheduleError,
  type RepaymentFacts,
} from './installments';

// The same advance as a salary advance (payroll months) and an estate advance (settlements).
const salary: AdvanceFacts = {
  id: 'A1',
  employeeId: 7,
  amount: '50000',
  status: 'Approved',
  dateRequested: '2026-10-01',
};
const estate = {
  id: 'A1',
  estateId: 7,
  amount: '50000',
  dateIssued: '2026-10-01',
};

const salaryRecs: RecoveryFacts[] = [
  {
    advanceId: 'A1',
    kind: 'payroll',
    period: 'November 2026',
    status: 'recovered',
    amount: '6000',
    plannedAmount: '10000',
  },
  {
    advanceId: 'A1',
    kind: 'cash',
    period: null,
    status: 'recovered',
    amount: '4000',
    plannedAmount: '0',
  },
];
// an estate settlement row / a bank repayment — same facts, different source
const estateRecs: RepaymentFacts[] = [
  {
    advanceId: 'A1',
    period: 'November 2026',
    status: 'recovered',
    amount: '6000',
    plannedAmount: '10000',
  },
  {
    advanceId: 'A1',
    period: null,
    status: 'recovered',
    amount: '4000',
    plannedAmount: '0',
  },
];

describe('shared installments — salary and estate advances agree', () => {
  it('same remaining balance and carry-forward', () => {
    expect(salaryRemaining(salary, salaryRecs)).toBe(40000);
    expect(remainingOf(estate, estateRecs)).toBe(40000);
    expect(carriedForwardOf(estate, estateRecs)).toBe(4000);
  });

  it('same projected schedule (the short month extends it, the repayment shortens it)', () => {
    const plan = {
      amount: 50000,
      installment: 10000,
      startPeriod: 'November 2026',
    };
    const a = projectSchedule(plan, salaryRecs);
    const b = projectSchedule(plan, estateRecs);
    expect(b).toEqual(a);
    expect(
      a.months.map((m) => [m.period, m.planned, m.deducted, m.status]),
    ).toEqual([
      ['November 2026', 10000, 6000, 'Deducted'],
      ['December 2026', 10000, 0, 'Planned'],
      ['January 2027', 10000, 0, 'Planned'],
      ['February 2027', 10000, 0, 'Planned'],
      ['March 2027', 10000, 0, 'Planned'],
    ]);
    expect(a.clearedPeriod).toBe('March 2027');
    expect(a.nextPeriod).toBe('December 2026');
  });

  it('same period deductions for the same room', () => {
    // salary: room = min(50% of 30,000, 30,000 − 2,000) = 15,000
    const s = planMonthDeductions(
      [salary],
      salaryRecs,
      7,
      'December 2026',
      30000,
      2000,
      50,
      () => 10000,
    );
    const e = planPeriodDeductions(
      [estate],
      estateRecs,
      'December 2026',
      15000,
      () => 10000,
    );
    expect(e).toEqual(s);
    expect(e.total).toBe(10000);
  });

  it('carries forward what a short period can’t take, never more than the room', () => {
    const e = planPeriodDeductions(
      [estate],
      estateRecs,
      'December 2026',
      2500,
      () => 10000,
    );
    expect(e.lines).toEqual([
      { advanceId: 'A1', planned: 10000, amount: 2500 },
    ]);
    expect(e.carried).toBe(7500);
    expect(
      planPeriodDeductions([estate], estateRecs, 'December 2026', -100).total,
    ).toBe(0);
  });
});

describe('reschedule and early repayment rules', () => {
  it('a reschedule must start after the last processed period and fit the max months', () => {
    expect(lastProcessedKey(estate, estateRecs)).toBe('2026-11');
    expect(rescheduleError(40000, 10000, 6, '2026-11', '2026-11')).toBe(
      'November 2026 is already processed — start the new plan after it.',
    );
    expect(rescheduleError(40000, 5000, 6, '2026-12', '2026-11')).toBe(
      'That plan runs 8 months — the most allowed is 6.',
    );
    expect(rescheduleError(40000, 10000, 6, '2026-12', '2026-11')).toBeNull();
  });

  it('early repayment is limited to what no unprocessed period has reserved', () => {
    const reserved: RepaymentFacts[] = [
      ...estateRecs,
      {
        advanceId: 'A1',
        period: 'December 2026',
        status: 'reserved',
        amount: '10000',
        plannedAmount: '10000',
      },
    ];
    expect(earlyRepayable(estate, reserved)).toBe(30000);
  });
});
