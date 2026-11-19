import {
  attendanceMeasures,
  type AttendanceDay,
  coverHelp,
  factNotes,
  fertilizerFirstAttempt,
  kgMeasure,
  routeCompletion,
  trendOf,
  weightAccuracy,
} from './performance-rules';

const day = (
  date: string,
  status: AttendanceDay['status'],
  working = true,
): AttendanceDay => ({ date, working, weight: working ? 1 : 0, status });

describe('attendance', () => {
  it('approved leave and holidays never lower the rate', () => {
    const days = [
      ...['01', '02', '05', '06', '07', '08'].map((d) =>
        day(`2026-10-${d}`, 'Present'),
      ),
      day('2026-10-09', 'Leave'), // leave: out of the denominator
      day('2026-10-21', null, false), // a holiday: not a working day
      day('2026-10-04', null, false), // Sunday: weekly holiday
    ];
    const m = attendanceMeasures(days);
    expect(m.attendance).toMatchObject({
      value: 100,
      num: 6,
      den: 6,
      status: 'ok',
    });
    expect(m.leave.value).toBe(1);
    expect(m.absences.value).toBe(0);
  });

  it('a half day counts 0.5; an unplanned absence counts and lowers it; unmarked days are left out', () => {
    const m = attendanceMeasures([
      ...['01', '02', '05', '06'].map((d) => day(`2026-10-${d}`, 'Present')),
      day('2026-10-07', 'Half-day'),
      day('2026-10-08', 'Absent'),
      day('2026-10-09', null),
    ]);
    expect(m.attendance).toMatchObject({ num: 4.5, den: 6, value: 75 });
    expect(m.attendance.extra?.unmarked).toBe(1);
    expect(m.absences.value).toBe(1);
  });

  it('fewer than 5 working days: Not enough data', () => {
    const m = attendanceMeasures([
      day('2026-10-01', 'Present'),
      day('2026-10-02', 'Absent'),
    ]);
    expect(m.attendance).toMatchObject({ status: 'not_enough', value: null });
  });
});

describe('minimum data', () => {
  it('route completion needs 5 route days', () => {
    const stops = [
      { date: '2026-10-05', routeId: 3, estateName: 'A', visited: true },
    ];
    expect(routeCompletion(stops, 4)).toMatchObject({
      status: 'not_enough',
      value: null,
    });
    expect(routeCompletion(stops, 5)).toMatchObject({
      status: 'ok',
      value: 100,
    });
  });

  it('weight accuracy and fertilizer need 5 deliveries', () => {
    const d = {
      id: 'x',
      date: '2026-10-05',
      estateName: 'A',
      estateKg: 100,
      factoryKg: 100,
    };
    expect(weightAccuracy([d, d, d, d], 5).status).toBe('not_enough');
    expect(
      fertilizerFirstAttempt([{ outcome: 'delivered', failReason: null }])
        .status,
    ).toBe('not_enough');
  });
});

describe('weight tolerance', () => {
  const at = (factoryKg: number) => ({
    id: String(factoryKg),
    date: '2026-10-05',
    estateName: 'A',
    estateKg: 100,
    factoryKg,
  });

  it('counts only deliveries MORE than the tolerance apart (5% is inside at 5%)', () => {
    const m = weightAccuracy([at(100), at(97), at(95), at(94.9), at(105.1)], 5);
    expect(m).toMatchObject({
      num: 2,
      den: 5,
      value: 40,
      extra: { tolerancePct: 5 },
    });
  });

  it('the tolerance is a setting', () => {
    const list = [at(100), at(97), at(95), at(94.9), at(105.1)];
    expect(weightAccuracy(list, 3).num).toBe(3);
  });
});

it('fertilizer: owner-side failures are shown apart from the rest', () => {
  const m = fertilizerFirstAttempt([
    { outcome: 'delivered', failReason: null },
    { outcome: 'partial', failReason: null },
    { outcome: 'delivered', failReason: null },
    { outcome: 'failed', failReason: 'owner_not_available' },
    { outcome: 'failed', failReason: 'road_not_passable' },
  ]);
  expect(m).toMatchObject({
    value: 60,
    num: 3,
    den: 5,
    extra: {
      ownerSide: 1,
      otherFailures: 1,
      owner_not_available: 1,
      road_not_passable: 1,
    },
  });
});

it('kg is judged against the route history passed in (actual ÷ expected)', () => {
  const days = [1, 2, 3, 4, 5].map((i) => ({
    date: `2026-10-0${i}`,
    routeId: 3,
    kg: 110,
    routeAverage: 100,
  }));
  expect(kgMeasure(days, 550)).toMatchObject({
    value: 550,
    extra: { vsRouteAverage: 110 },
  });
});

describe('comparisons', () => {
  it('trend is against the person’s own previous figure; within 2 points is "same"', () => {
    const now = routeCompletion(
      Array.from({ length: 10 }, (_, i) => ({
        date: '2026-10-05',
        routeId: 3,
        estateName: String(i),
        visited: i < 9,
      })),
      10,
    );
    const before = { ...now, value: 80 };
    expect(trendOf(now, before)).toMatchObject({ trend: 'up', previous: 80 });
    expect(trendOf(now, { ...now, value: 89 }).trend).toBe('same');
  });

  it('cover help is information only — never marked up or down', () => {
    const m = coverHelp(['ACTIVE', 'DECLINED', 'EXPIRED', 'PENDING']);
    expect(m).toMatchObject({ status: 'info', num: 1, den: 3 });
    expect(trendOf(m, { ...m, value: 0 }).trend).toBeNull();
  });
});

it('notes are facts with counts, no judgement words', () => {
  const m = attendanceMeasures([
    ...['01', '02', '05', '06', '07', '08'].map((d) =>
      day(`2026-10-${d}`, 'Present'),
    ),
    day('2026-10-09', 'Absent'),
    day('2026-10-12', 'Absent'),
    day('2026-10-13', 'Absent'),
  ]);
  const notes = factNotes(
    { absences: m.absences },
    { absences: 1 },
    'October 2026',
    'agent',
  );
  expect(notes).toEqual([
    '3 unplanned absences in October 2026 (agent average 1).',
  ]);
  expect(notes.join(' ')).not.toMatch(
    /good|poor|bad|excellent|top|worst|best/i,
  );
});
