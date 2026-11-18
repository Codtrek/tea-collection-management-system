import {
  grossByDay,
  nextChange,
  payOn,
  type PayVersion,
} from './pay-resolution';

/** Pay resolution — override beats role, by date (Administration-Addendum §6). */

let id = 0;
const v = (o: Partial<PayVersion>): PayVersion => ({
  id: ++id,
  scope: 'role',
  role: 'Machine Operator',
  employeeId: null,
  effectiveDate: '2019-01-01',
  dayRate: 400,
  dayOtRate: 600,
  nightRate: 480,
  nightOtRate: 720,
  reason: 'r',
  setBy: 's',
  source: 'migration',
  adjustmentId: null,
  ...o,
});
const kamal = { id: 2, role: 'Machine Operator' };

describe('pay on a date', () => {
  const versions = [
    v({}),
    v({ effectiveDate: '2026-11-01', dayRate: 420 }),
    v({
      scope: 'employee',
      role: null,
      employeeId: 2,
      effectiveDate: '2026-12-01',
      dayRate: 450,
    }),
  ];

  it('the role rate in force, until the employee has an override in force', () => {
    expect(payOn(versions, kamal, '2026-10-31')).toMatchObject({
      source: 'role',
      rates: { dayRate: 400 },
    });
    expect(payOn(versions, kamal, '2026-11-15')).toMatchObject({
      source: 'role',
      rates: { dayRate: 420 },
    });
    expect(payOn(versions, kamal, '2026-12-01')).toMatchObject({
      source: 'override',
      rates: { dayRate: 450 },
    });
  });

  it('a later role change doesn’t touch someone on an override', () => {
    const later = [
      ...versions,
      v({ effectiveDate: '2027-01-01', dayRate: 500 }),
    ];
    expect(payOn(later, kamal, '2027-02-01')?.rates.dayRate).toBe(450);
    expect(
      payOn(later, { id: 6, role: 'Machine Operator' }, '2027-02-01')?.rates
        .dayRate,
    ).toBe(500);
  });

  it('no rate in force → null; the next change is the earliest one after the date', () => {
    expect(payOn(versions, { id: 9, role: 'Driver' }, '2026-11-01')).toBeNull();
    expect(nextChange(versions, kamal, '2026-11-15')?.dayRate).toBe(450);
  });
});

describe('gross by day', () => {
  it('prices each day at the rates in force that day (a past month never changes after a new version)', () => {
    const days = [
      {
        date: '2026-10-31',
        dayHours: 8,
        dayOtHours: 0,
        nightHours: 0,
        nightOtHours: 0,
      },
      {
        date: '2026-11-02',
        dayHours: 8,
        dayOtHours: 2,
        nightHours: 0,
        nightOtHours: 0,
      },
    ];
    const versions = [v({}), v({ effectiveDate: '2026-11-01', dayRate: 420 })];
    // 8×400 + (8×420 + 2×600)
    expect(grossByDay(days, versions, kamal)).toEqual({
      gross: 3200 + 3360 + 1200,
      unpricedDays: 0,
    });
    const octOnly = grossByDay(days.slice(0, 1), versions, kamal).gross;
    expect(
      grossByDay(
        days.slice(0, 1),
        [...versions, v({ effectiveDate: '2026-12-01', dayRate: 999 })],
        kamal,
      ).gross,
    ).toBe(octOnly);
  });

  it('days with no rate are counted, never priced', () => {
    expect(
      grossByDay(
        [
          {
            date: '2018-06-01',
            dayHours: 8,
            dayOtHours: 0,
            nightHours: 0,
            nightOtHours: 0,
          },
        ],
        [v({})],
        kamal,
      ),
    ).toEqual({
      gross: 0,
      unpricedDays: 1,
    });
  });
});
