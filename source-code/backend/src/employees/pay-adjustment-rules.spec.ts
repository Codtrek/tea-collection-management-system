import {
  applyChange,
  blockers,
  preview,
  type ChangeSpec,
  type PreviewEmployee,
} from './pay-adjustment-rules';

/** Pay adjustments (Administration-Addendum §8). */

const up5: ChangeSpec = {
  direction: 'increase',
  kind: 'percent',
  amount: 5,
  rounding: 0,
};
const RATES = {
  dayRate: 400,
  dayOtRate: 600,
  nightRate: 480,
  nightOtRate: 720,
};
const emp = (o: Partial<PreviewEmployee> = {}): PreviewEmployee => ({
  id: 2,
  name: 'N. Silva',
  nic: '199523456789',
  category: 'factory',
  role: 'Machine Operator',
  current: { rates: RATES, source: 'role', version: {} as never },
  hours: { dayHours: 160, dayOtHours: 10, nightHours: 0, nightOtHours: 0 },
  processedMonths: [],
  ...o,
});
const base = {
  change: up5,
  effectiveDate: '2026-12-01',
  today: '2026-11-15',
  standardHoursPerDay: 8,
  minimumDailyPay: { factory: null, office: null },
};

describe('the change', () => {
  it('% or Rs per hour, with optional rounding', () => {
    expect(applyChange(400, up5)).toBe(420);
    expect(applyChange(483, { ...up5, rounding: 10 })).toBe(510);
    expect(
      applyChange(400, {
        direction: 'decrease',
        kind: 'amount',
        amount: 25,
        rounding: 0,
      }),
    ).toBe(375);
    // Rs 0 = not paid by the hour (collection agents): never given an hourly rate by a change
    expect(applyChange(0, up5)).toBe(0);
    expect(
      applyChange(0, {
        direction: 'increase',
        kind: 'amount',
        amount: 20,
        rounding: 0,
      }),
    ).toBe(0);
  });
});

describe('preview', () => {
  it('one line per employee: old → new, and the monthly cost change from last month’s hours', () => {
    const p = preview({
      ...base,
      employees: [
        emp(),
        emp({
          id: 6,
          name: 'D. Wijesinghe',
          hours: {
            dayHours: 80,
            dayOtHours: 0,
            nightHours: 0,
            nightOtHours: 0,
          },
        }),
      ],
    });
    expect(p.lines[0]).toMatchObject({
      old: RATES,
      new: { dayRate: 420, dayOtRate: 630, nightRate: 504, nightOtRate: 756 },
      dayPayOld: 3200,
      dayPayNew: 3360,
      monthlyChange: 160 * 20 + 10 * 30,
    });
    expect(p.totalMonthlyChange).toBe(3500 + 80 * 20);
    expect(p.minimumNotSet).toEqual(['factory']);
    expect(blockers(p, false)).toEqual([]);
  });

  it('never inside or before a month whose payroll is processed', () => {
    const p = preview({
      ...base,
      effectiveDate: '2026-11-20',
      employees: [emp({ processedMonths: ['2026-10', '2026-11'] })],
    });
    expect(p.errors[0]).toMatch(
      /Payroll for November 2026 is already processed for N\. Silva/,
    );
    expect(
      preview({ ...base, employees: [emp({ processedMonths: ['2026-11'] })] })
        .errors,
    ).toEqual([]);
  });

  it('never in the past', () => {
    expect(
      preview({ ...base, effectiveDate: '2026-11-14', employees: [emp()] })
        .errors,
    ).toEqual(['A pay change starts today or later, never in the past.']);
  });

  it('the minimum floor blocks anyone left below it; unset minimums aren’t checked', () => {
    const down = {
      ...base,
      change: {
        direction: 'decrease',
        kind: 'percent',
        amount: 10,
        rounding: 0,
      } as ChangeSpec,
    };
    const p = preview({
      ...down,
      minimumDailyPay: { factory: 3000, office: null },
      employees: [emp()],
    });
    // 360 × 8 = 2880 < 3000
    expect(p.lines[0].blocked).toBe(
      'Below the factory minimum: Rs. 2880 a day against Rs. 3000.',
    );
    expect(p.minimumNotSet).toEqual([]);
    expect(blockers(p, true)[0]).toMatch(
      /^1 employee can’t take this change: N\. Silva/,
    );
  });

  it('a decrease needs the written-agreement confirmation', () => {
    const p = preview({
      ...base,
      change: {
        direction: 'decrease',
        kind: 'amount',
        amount: 10,
        rounding: 0,
      },
      employees: [emp()],
    });
    expect(blockers(p, false)).toEqual([
      'Reducing an employee’s pay usually needs their written agreement. Confirm this has been obtained.',
    ]);
    expect(blockers(p, true)).toEqual([]);
  });

  it('someone with no rate in force is blocked, not given one', () => {
    const p = preview({ ...base, employees: [emp({ current: null })] });
    expect(p.lines[0].blocked).toBe('No pay rate in force to change.');
  });
});
