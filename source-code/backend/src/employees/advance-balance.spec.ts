import {
  advancesForPeriod,
  advancesRecoveredBy,
  outstandingFor,
  recoveryOf,
} from './advance-balance';
import type { SalaryAdvanceEntity } from './salary-advance.entity';

const adv = (over: Partial<SalaryAdvanceEntity>) =>
  ({
    employeeId: 1,
    amount: '20000.00',
    status: 'Approved',
    deducted: false,
    payrollPeriod: null,
    recoveredPeriod: null,
    ...over,
  }) as SalaryAdvanceEntity;

describe('advance recovery + remaining balance (the one shared calculation)', () => {
  it('Not started → Recovering → Recovered, with the remaining balance', () => {
    expect(recoveryOf(adv({}))).toEqual({
      recovery: 'Not started',
      remaining: 20000,
      payrollPeriod: null,
      recoveredPeriod: null,
    });
    expect(recoveryOf(adv({ payrollPeriod: 'July 2026' }))).toMatchObject({
      recovery: 'Recovering',
      remaining: 20000,
    });
    expect(
      recoveryOf(
        adv({
          deducted: true,
          payrollPeriod: 'July 2026',
          recoveredPeriod: 'July 2026',
        }),
      ),
    ).toMatchObject({
      recovery: 'Recovered',
      remaining: 0,
      recoveredPeriod: 'July 2026',
    });
  });

  it('a pending or rejected request has nothing to recover', () => {
    expect(recoveryOf(adv({ status: 'Pending' }))).toMatchObject({
      recovery: null,
      remaining: 0,
    });
    expect(recoveryOf(adv({ status: 'Rejected' })).remaining).toBe(0);
  });

  it('outstanding = Σ remaining for that employee only', () => {
    const list = [
      adv({}),
      adv({ amount: '5000', payrollPeriod: 'July 2026' }),
      adv({ amount: '9000', deducted: true }),
      adv({ amount: '7000', status: 'Pending' }),
      adv({ employeeId: 2 }),
    ];
    expect(outstandingFor(list, 1)).toBe(25000);
  });

  it('a month counts unreserved advances and its own, never another month’s', () => {
    const free = adv({});
    const mine = adv({ payrollPeriod: 'July 2026' });
    const other = adv({ payrollPeriod: 'June 2026' });
    expect(advancesForPeriod([free, mine, other], 1, 'July 2026')).toEqual([
      free,
      mine,
    ]);
    // processing recovers only what the row reserved
    expect(advancesRecoveredBy([free, mine, other], 1, 'July 2026')).toEqual([
      mine,
    ]);
  });
});
