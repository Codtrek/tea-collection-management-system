import { ForbiddenException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { AuditService } from '../audit/audit.service';
import type { CollectionSettingsService } from '../collections/collection-settings.service';
import type { DispatchAccessService } from '../dispatch/dispatch-access.service';
import type { RouteScheduleService } from '../dispatch/route-schedule.service';
import type { HolidayService } from '../holidays/holiday.service';
import { DEFAULT_TYPES } from '../holidays/working-days';
import { PerformanceService, periodOf } from './performance.service';

const NOW = new Date('2026-11-05T06:00:00Z');
const repo = <T extends object>(rows: T[]) =>
  ({
    find: () => Promise.resolve(rows),
    findOne: (o: { where: Partial<T> }) =>
      Promise.resolve(
        rows.find((r) =>
          Object.entries(o.where).every(
            ([k, v]) => (r as Record<string, unknown>)[k] === v,
          ),
        ) ?? null,
      ),
  }) as unknown as Repository<never>;

const rec = (
  id: string,
  routeId: number,
  date: string,
  status: string,
  agentId: number | null,
  kg: number,
  graded?: number,
) => ({
  id,
  routeId,
  collectionDate: date,
  status,
  agentId,
  weightKg: String(kg),
  estateName: `Estate ${id}`,
  gradeLines:
    graded === undefined ? [] : [{ grade: 'normal', weightKg: String(graded) }],
});

/*
  October 2026 for agent 1 (EMP-0007, factory worker):
    • route 3 runs Mon–Sat; 20 Oct is cancelled (a holiday) — its stop must not count
    • a cover of route 4 on Wed 7 Oct (route 4's own agent is agent 2)
    • route 3's history (Jul–Sep): 100 kg a day; route 4's: 300 kg a day (5 days each)
*/
function setup(role = 'Manager', historyDays = 5) {
  const records = [
    // route 3 stops on his days: 5 visited + 1 missed
    rec('A', 3, '2026-10-05', 'confirmed', 1, 110, 107), // 2.7% — inside 5%
    rec('B', 3, '2026-10-06', 'collected', 1, 110, 104), // 5.5% — outside
    rec('C', 3, '2026-10-08', 'collected', 1, 110, 104.5), // exactly 5% — inside
    rec('D', 3, '2026-10-09', 'confirmed', 1, 110, 110),
    rec('E', 3, '2026-10-12', 'confirmed', 1, 110, 110),
    rec('F', 3, '2026-10-13', 'agent_assigned', 1, 90), // missed
    rec('X', 3, '2026-10-20', 'agent_assigned', 1, 90), // cancelled day: excluded
    // the cover day on route 4
    rec('G', 4, '2026-10-07', 'collected', 1, 300),
    // route history (another agent): 5 collection days each in Jul–Sep
    ...['07-06', '07-13', '08-03', '08-10', '09-07']
      .slice(0, historyDays)
      .map((d, i) => rec(`H3${i}`, 3, `2026-${d}`, 'confirmed', 2, 100)),
    ...['07-01', '07-08', '08-05', '08-12', '09-02']
      .slice(0, historyDays)
      .map((d, i) => rec(`H4${i}`, 4, `2026-${d}`, 'confirmed', 2, 300)),
  ];
  const assignments = [
    {
      id: 1,
      routeId: 3,
      agentId: 1,
      type: 'PERMANENT',
      status: 'ACTIVE',
      validFrom: '2026-01-01',
      validTo: null,
    },
    {
      id: 2,
      routeId: 4,
      agentId: 2,
      type: 'PERMANENT',
      status: 'ACTIVE',
      validFrom: '2026-01-01',
      validTo: null,
    },
    {
      id: 3,
      routeId: 4,
      agentId: 1,
      type: 'COVER',
      status: 'ACTIVE',
      validFrom: '2026-10-07',
      validTo: '2026-10-07',
    },
    {
      id: 4,
      routeId: 4,
      agentId: 1,
      type: 'COVER',
      status: 'DECLINED',
      validFrom: '2026-10-14',
      validTo: '2026-10-14',
    },
  ];
  const schedules = new Map([
    [
      3,
      {
        weekdays: [1, 2, 3, 4, 5, 6],
        overrides: [{ date: '2026-10-20', kind: 'CANCEL' }],
      },
    ],
    [4, { weekdays: [3], overrides: [] }],
  ]);
  const attendance = [
    // every October working day present up to the 13th, except leave on the 14th
    ...['01', '02', '03', '05', '06', '07', '08', '09', '10', '12', '13'].map(
      (d) => ({
        employeeId: 7,
        date: `2026-10-${d}`,
        status: 'Present',
      }),
    ),
    { employeeId: 7, date: '2026-10-14', status: 'Leave' },
    { employeeId: 7, date: '2026-10-21', status: 'Present' }, // worked the holiday: not counted
  ];
  const deliveries = [
    ...[1, 2, 3].map((i) => ({
      attemptNo: 1,
      pickupAgentId: 1,
      outcome: 'delivered',
      failReason: null,
      scheduledDate: `2026-10-0${i + 4}`,
      cancelledAt: null,
    })),
    {
      attemptNo: 1,
      pickupAgentId: 1,
      outcome: 'failed',
      failReason: 'owner_not_available',
      scheduledDate: '2026-10-09',
      cancelledAt: null,
    },
    {
      attemptNo: 1,
      pickupAgentId: 1,
      outcome: 'failed',
      failReason: 'road_not_passable',
      scheduledDate: '2026-10-10',
      cancelledAt: null,
    },
    {
      attemptNo: 2,
      pickupAgentId: 1,
      outcome: 'delivered',
      failReason: null,
      scheduledDate: '2026-10-12',
      cancelledAt: null,
    },
  ];
  const facts = {
    holidays: [
      {
        date: '2026-10-21',
        name: 'Test holiday',
        type: 'public',
        paid: true,
        workAllowed: true,
        appliesTo: 'all',
      },
    ],
    weekly: [
      {
        category: 'factory',
        weekdays: [0],
        halfDayWeekday: null,
        effectiveFrom: '2000-01-01',
      },
    ],
    restDays: [],
    types: DEFAULT_TYPES,
  };
  const access = {
    require: jest.fn((r: string) =>
      r === 'Officer'
        ? Promise.reject(
            new ForbiddenException('Your role may not see performance.'),
          )
        : Promise.resolve(),
    ),
  };
  const saved: {
    id?: number;
    employeeId: number;
    note: string;
    author: string;
    createdAt: Date;
  }[] = [];
  const notes = {
    find: () => Promise.resolve(saved),
    create: (x: (typeof saved)[number]) => ({ ...x }),
    save: (x: (typeof saved)[number]) => {
      x.id = saved.length + 1;
      saved.push(x);
      return Promise.resolve(x);
    },
  };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const service = new PerformanceService(
    repo([
      {
        id: 7,
        name: 'R. Senanayake',
        role: 'Tea Collecting Agent',
        category: 'factory',
        status: 'Active',
      },
      {
        id: 8,
        name: 'W. Gunaratne',
        role: 'Tea Collecting Agent',
        category: 'factory',
        status: 'Active',
      },
      {
        id: 2,
        name: 'N. Silva',
        role: 'Machine Operator',
        category: 'factory',
        status: 'Active',
      },
    ]),
    repo([
      { id: 1, hrEmployeeId: 7 },
      { id: 2, hrEmployeeId: 8 },
    ]),
    repo(attendance),
    repo(records),
    repo(deliveries),
    repo(assignments),
    repo([]),
    { facts: jest.fn().mockResolvedValue(facts) } as unknown as HolidayService,
    {
      allSchedules: jest.fn().mockResolvedValue(schedules),
    } as unknown as RouteScheduleService,
    {
      get: jest.fn().mockResolvedValue({ mismatchTolerancePct: 5 }),
    } as unknown as CollectionSettingsService,
    access as unknown as DispatchAccessService,
    notes as unknown as Repository<never>,
    repo([{ id: 50, name: 'Hill Top Estate' }]),
    audit as unknown as AuditService,
  );
  return { service, role, audit, saved };
}

const agentRow = async (s = setup()) => {
  const t = await s.service.team(
    '2026-10',
    1,
    'agents',
    { role: 'Manager' },
    NOW,
  );
  return { t, row: t.rows.find((r) => r.employeeId === 'EMP-0007')! };
};

describe('PerformanceService', () => {
  it('approved leave and holidays don’t lower attendance', async () => {
    const { row } = await agentRow();
    // 11 working days marked present; the leave day and the holiday are left out
    expect(row.measures.attendance).toMatchObject({
      value: 100,
      num: 11,
      den: 11,
    });
    expect(row.measures.attendance?.extra).toMatchObject({ leaveDays: 1 });
  });

  it('route completion includes the cover day and leaves out the cancelled day', async () => {
    const { row } = await agentRow();
    expect(row.measures.routeCompletion).toMatchObject({
      num: 6,
      den: 7, // A–F on route 3 + G on the route 4 cover; X (20 Oct, cancelled) excluded
      value: 85.7,
      extra: { missed: 1 },
    });
  });

  it('kg per route day is compared with each route’s OWN history (the cover day with route 4’s)', async () => {
    const { row } = await agentRow();
    // actual 5×110 + 0 (missed day) + 300 = 850; expected 6×100 + 300 = 900
    expect(row.measures.kg).toMatchObject({
      value: 850,
      num: 850,
      den: 900,
      extra: { vsRouteAverage: 94.4 },
    });
  });

  it('weight accuracy uses the tolerance setting (5%): only B is outside', async () => {
    const { row, t } = await agentRow();
    expect(row.measures.weightAccuracy).toMatchObject({
      num: 1,
      den: 5,
      value: 20,
    });
    expect(t.tolerancePct).toBe(5);
  });

  it('fertilizer first attempts: owner-side failures apart; later attempts ignored', async () => {
    const { row } = await agentRow();
    expect(row.measures.fertilizer).toMatchObject({
      num: 3,
      den: 5,
      extra: { ownerSide: 1, otherFailures: 1 },
    });
  });

  it('a route with fewer than 5 days of history is no baseline: "Not enough data"', async () => {
    const { row } = await agentRow(setup('Manager', 1));
    expect(row.measures.kg).toMatchObject({
      status: 'not_enough',
      value: 850, // the total is still shown
      extra: { vsRouteAverage: null },
    });
  });

  it('cover help is information only', async () => {
    const { row } = await agentRow();
    expect(row.measures.coverHelp).toMatchObject({
      status: 'info',
      num: 1,
      den: 2,
      trend: null,
    });
  });

  it('too little data shows "Not enough data", never a percentage', async () => {
    const { t } = await agentRow();
    const other = t.rows.find((r) => r.employeeId === 'EMP-0008')!;
    expect(other.measures.routeCompletion).toMatchObject({
      status: 'not_enough',
      value: null,
    });
    expect(other.measures.weightAccuracy).toMatchObject({
      status: 'not_enough',
      value: null,
    });
  });

  it('no overall score, rank or combined figure exists anywhere in the answer', async () => {
    const { t } = await agentRow();
    expect(JSON.stringify(t)).not.toMatch(/score|rank|overall|top performer/i);
    expect(t.comingSoon.map((c) => c.key)).toEqual([
      'transportTime',
      'punctuality',
    ]);
  });

  it('other staff: attendance only, averaged within their own role', async () => {
    const { service } = setup();
    const t = await service.team(
      '2026-10',
      1,
      'staff',
      { role: 'Manager' },
      NOW,
    );
    expect(t.rows.map((r) => r.employeeId)).toEqual(['EMP-0002']);
    expect(Object.keys(t.rows[0].measures)).toEqual([
      'attendance',
      'absences',
      'leave',
    ]);
    expect(Object.keys(t.averages)).toEqual(['Machine Operator']);
  });

  describe('the employee tab', () => {
    it('shows the same measures month by month (last 6 complete months)', async () => {
      const { service } = setup();
      const emp = await service.employee(7, 6, { role: 'Manager' }, NOW);
      expect(emp.months.map((m) => m.month)).toEqual([
        '2026-05',
        '2026-06',
        '2026-07',
        '2026-08',
        '2026-09',
        '2026-10',
      ]);
      const oct = emp.months.at(-1)!;
      // the same numbers the team table shows
      const { row } = await agentRow();
      expect(oct.measures.routeCompletion).toEqual(
        row.measures.routeCompletion,
      );
      expect(oct.measures.kg).toEqual(row.measures.kg);
    });

    it('drill-downs list exactly the records behind the counts', async () => {
      const { service } = setup();
      const missed = await service.drill(
        7,
        'routeCompletion',
        '2026-10',
        { role: 'Manager' },
        NOW,
      );
      expect(missed.rows).toEqual([
        {
          date: '2026-10-13',
          title: 'Estate F',
          detail: 'Route 3 · reason not recorded',
          tag: null,
        },
      ]);
      const weight = await service.drill(
        7,
        'weightAccuracy',
        '2026-10',
        { role: 'Manager' },
        NOW,
      );
      expect(weight.rows.map((r) => r.title)).toEqual(['Estate B (B)']);
      expect(weight.rows[0].detail).toMatch(
        /Estate 110 kg · factory 104 kg · 5.5% apart \(tolerance 5%\)/,
      );
      const fert = await service.drill(
        7,
        'fertilizer',
        '2026-10',
        { role: 'Manager' },
        NOW,
      );
      expect(fert.rows.map((r) => [r.detail, r.tag])).toEqual([
        ['Owner not available', 'Owner-side'],
        ['Road not passable', null],
      ]);
      const leave = await service.drill(
        7,
        'leave',
        '2026-10',
        { role: 'Manager' },
        NOW,
      );
      expect(leave.rows.map((r) => r.date)).toEqual(['2026-10-14']);
    });

    it('notes: Manager and Administrator write them (audited); an Officer can’t', async () => {
      const { service, audit, saved } = setup();
      await service.addNote(
        7,
        '  Talked about the Route 3 Tuesday stops.  ',
        { role: 'Manager', name: 'R. Jayasuriya', sub: 3 },
        NOW,
      );
      expect(saved[0]).toMatchObject({
        employeeId: 7,
        note: 'Talked about the Route 3 Tuesday stops.',
        author: 'R. Jayasuriya',
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'R. Jayasuriya' }),
        expect.objectContaining({
          action: 'Added a performance note',
          module: 'Performance',
        }),
      );
      await expect(
        service.addNote(7, 'x', { role: 'Officer', name: 'S. Fernando' }, NOW),
      ).rejects.toThrow(ForbiddenException);
      expect(
        (await service.employee(7, 6, { role: 'Manager' }, NOW)).notes,
      ).toHaveLength(1);
    });
  });

  it('the permission is enforced on the server', async () => {
    const { service } = setup();
    await expect(
      service.team('2026-10', 1, 'agents', { role: 'Officer' }, NOW),
    ).rejects.toThrow(ForbiddenException);
  });

  it('a period never runs past today; "last 3 months" spans three whole months', () => {
    expect(periodOf('2026-11', 1, '2026-11-05')).toMatchObject({
      from: '2026-11-01',
      to: '2026-11-05',
    });
    expect(periodOf('2026-10', 3, '2026-11-05')).toEqual({
      from: '2026-08-01',
      to: '2026-10-31',
      label: 'August – October 2026',
    });
  });
});
