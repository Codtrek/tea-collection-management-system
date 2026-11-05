import {
  type AdvanceFacts,
  freeForPeriod,
  outstandingFor,
  payslipAdvanceLines,
  planMonthDeductions,
  type RecoveryFacts,
  recoveryOf,
  remainingOf,
} from './advance-balance';

const adv = (id: string, over: Partial<AdvanceFacts> = {}): AdvanceFacts => ({
  id,
  employeeId: 1,
  amount: '20000.00',
  status: 'Approved',
  dateRequested: '2026-07-08',
  ...over,
});

const rec = (
  advanceId: string,
  over: Partial<RecoveryFacts> = {},
): RecoveryFacts => ({
  advanceId,
  kind: 'payroll',
  period: 'July 2026',
  status: 'recovered',
  plannedAmount: '0',
  amount: '0',
  ...over,
});

describe('remaining balance = approved − Σ recovered (the one shared calculation)', () => {
  it('Not started → Recovering → Recovered', () => {
    const a = adv('A');
    expect(recoveryOf(a, [])).toMatchObject({
      recovery: 'Not started',
      remaining: 20000,
    });
    expect(
      recoveryOf(a, [
        rec('A', {
          status: 'reserved',
          plannedAmount: '20000',
          amount: '5000',
        }),
      ]),
    ).toMatchObject({
      recovery: 'Recovering',
      remaining: 20000,
      payrollPeriod: 'July 2026',
    });
    const partly = [rec('A', { plannedAmount: '20000', amount: '5000' })];
    expect(recoveryOf(a, partly)).toMatchObject({
      recovery: 'Recovering',
      remaining: 15000,
      recovered: 5000,
      carriedForward: 15000,
      recoveredPeriod: 'July 2026',
    });
    const done = [
      ...partly,
      rec('A', {
        period: 'August 2026',
        plannedAmount: '15000',
        amount: '15000',
      }),
    ];
    expect(recoveryOf(a, done)).toMatchObject({
      recovery: 'Recovered',
      remaining: 0,
      recoveredPeriod: 'August 2026',
    });
  });

  it('a cash repayment reduces the balance too; pending / rejected have nothing to recover', () => {
    expect(
      remainingOf(adv('A'), [
        rec('A', { kind: 'cash', period: null, amount: '4000' }),
      ]),
    ).toBe(16000);
    expect(recoveryOf(adv('P', { status: 'Pending' }), [])).toMatchObject({
      recovery: null,
      remaining: 0,
    });
  });

  it('outstanding = Σ remaining for that employee only', () => {
    const list = [
      adv('A'),
      adv('B', { amount: '5000' }),
      adv('C', { employeeId: 2 }),
    ];
    expect(outstandingFor(list, [rec('A', { amount: '2000' })], 1)).toBe(23000);
  });

  it('a month never plans money another Pending month has reserved', () => {
    const recs = [
      rec('A', { status: 'reserved', period: 'July 2026', amount: '5000' }),
    ];
    expect(freeForPeriod(adv('A'), recs, 'August 2026')).toBe(15000);
    expect(freeForPeriod(adv('A'), recs, 'July 2026')).toBe(20000);
  });
});

describe('planMonthDeductions — never below Rs. 0, capped, the rest carried forward', () => {
  const plan = (
    gross: number,
    advances = [adv('A')],
    recs: RecoveryFacts[] = [],
    cap = 50,
    other = 0,
  ) => planMonthDeductions(advances, recs, 1, 'July 2026', gross, other, cap);

  it('Rs. 0 gross deducts nothing — the whole planned amount carries forward', () => {
    expect(plan(0, [adv('A', { amount: '15000' })])).toEqual({
      lines: [{ advanceId: 'A', planned: 15000, amount: 0 }],
      total: 0,
      carried: 15000,
      room: 0,
    });
  });

  it('the cap (% of gross) limits the deduction', () => {
    expect(plan(10000)).toMatchObject({ total: 5000, carried: 15000 });
    expect(plan(10000, [adv('A')], [], 100)).toMatchObject({
      total: 10000,
      carried: 10000,
    });
  });

  it('other deductions come first — what the gross allows after them', () => {
    expect(plan(10000, [adv('A')], [], 100, 8000)).toMatchObject({
      total: 2000,
    });
    expect(plan(1000, [adv('A')], [], 100, 3000)).toMatchObject({
      total: 0,
      room: 0,
    });
  });

  it('a small balance is deducted in full when the gross allows', () => {
    expect(plan(100000, [adv('A', { amount: '3000' })])).toMatchObject({
      total: 3000,
      carried: 0,
    });
  });

  it('the oldest advance is served first; an installment caps what a month plans', () => {
    const two = [
      adv('NEW', { dateRequested: '2026-07-20', amount: '4000' }),
      adv('OLD', { amount: '4000' }),
    ];
    expect(plan(10000, two).lines).toEqual([
      { advanceId: 'OLD', planned: 4000, amount: 4000 },
      { advanceId: 'NEW', planned: 4000, amount: 1000 },
    ]);
    const withInstallment = planMonthDeductions(
      [adv('A')],
      [],
      1,
      'July 2026',
      100000,
      0,
      50,
      () => 6000,
    );
    expect(withInstallment.lines).toEqual([
      { advanceId: 'A', planned: 6000, amount: 6000 },
    ]);
  });
});

describe('payslip lines', () => {
  it('planned / deducted / carried forward / remaining after this month', () => {
    const recs = [
      rec('A', { period: 'June 2026', plannedAmount: '20000', amount: '5000' }),
      rec('A', {
        period: 'July 2026',
        status: 'reserved',
        plannedAmount: '15000',
        amount: '6000',
      }),
    ];
    expect(payslipAdvanceLines(1, 'July 2026', [adv('A')], recs)).toEqual([
      {
        advanceId: 'A',
        planned: 15000,
        deducted: 6000,
        carried: 9000,
        remainingAfter: 9000,
      },
    ]);
  });
});
