import {
  applyFilters,
  buildCollectionReport,
  bucketOf,
  resolvePeriod,
  toFact,
  trendBuckets,
  type ActiveEstate,
  type DeliveryInput,
  type GroupBy,
  type ReportFilters,
} from './collection-report-rules';

/** RPT-01 rules (docs/specs/Reports-Collection-Addendum.md). */

let seq = 0;
function delivery(
  o: Partial<DeliveryInput> & { lines?: [number, number] } = {},
): DeliveryInput {
  const { lines, ...rest } = o;
  return {
    id: `D-${++seq}`,
    status: 'confirmed',
    collectionDate: '2026-10-10',
    estateId: 1,
    estateName: 'Green Valley Estate',
    routeId: 1,
    routeName: 'Route 1',
    agentId: 7,
    agentName: 'R. Senanayake',
    weightKg: '100.00',
    gradeLines:
      lines === undefined
        ? [
            { grade: 'super', weightKg: '50.00' },
            { grade: 'normal', weightKg: '48.00' },
          ]
        : [
            ...(lines[0]
              ? [{ grade: 'super', weightKg: String(lines[0]) }]
              : []),
            ...(lines[1]
              ? [{ grade: 'normal', weightKg: String(lines[1]) }]
              : []),
          ],
    provisional: null,
    ...rest,
  };
}

const ESTATES: ActiveEstate[] = [
  {
    id: 1,
    name: 'Green Valley Estate',
    routeId: 1,
    routeName: 'Route 1',
    demo: false,
  },
  {
    id: 2,
    name: 'Hilltop Estate',
    routeId: 2,
    routeName: 'Route 2',
    demo: false,
  },
  {
    id: 3,
    name: 'Uda Radella Estate (demo)',
    routeId: 1,
    routeName: 'Route 1',
    demo: true,
  },
];

function report(
  rows: {
    current: DeliveryInput[];
    previous?: DeliveryInput[];
    lastYear?: DeliveryInput[];
  },
  o: {
    today?: string;
    month?: string;
    filters?: Partial<ReportFilters>;
    groupBy?: GroupBy;
    demo?: Set<string>;
  } = {},
) {
  const today = o.today ?? '2026-11-08';
  const fact = (d: DeliveryInput) => toFact(d, o.demo?.has(d.id) ?? false);
  return buildCollectionReport({
    today,
    period: resolvePeriod({ month: o.month }, today),
    groupBy: o.groupBy ?? 'estate',
    filters: { includeDemo: true, ...o.filters },
    tolerancePct: 5,
    current: rows.current.map(fact),
    previous: (rows.previous ?? []).map(fact),
    lastYear: (rows.lastYear ?? []).map(fact),
    activeEstates: ESTATES,
    monthsWithData: ['2026-10'],
  });
}

describe('which deliveries count', () => {
  it('graded → factory kg; ungraded and provisional apart; not-delivered excluded (no cancelled status exists)', () => {
    expect(
      bucketOf({
        status: 'confirmed',
        gradeLines: [{ grade: 'super', weightKg: '1' }],
      }),
    ).toBe('graded');
    expect(
      bucketOf({
        status: 'collected',
        gradeLines: [{ grade: 'super', weightKg: '1' }],
      }),
    ).toBe('graded');
    expect(bucketOf({ status: 'collected', gradeLines: [] })).toBe('ungraded');
    expect(
      bucketOf({
        status: 'pending_agent_confirmation',
        gradeLines: [],
        provisional: { reason: 'x' },
      }),
    ).toBe('provisional');
    for (const status of [
      'agent_assigned',
      'approved',
      'submitted',
      'pending_agent_confirmation',
    ])
      expect(bucketOf({ status, gradeLines: [] })).toBe('notDelivered');
  });

  it('cards and totals use the factory weight; estate weight and ungraded kg are shown separately', () => {
    const r = report({
      current: [
        delivery({ lines: [60, 40], weightKg: '110' }),
        delivery({ status: 'collected', gradeLines: [], weightKg: '569' }),
        delivery({
          status: 'pending_agent_confirmation',
          gradeLines: [],
          provisional: { reason: 'scale' },
          weightKg: '175',
        }),
        delivery({ status: 'agent_assigned', gradeLines: [], weightKg: '999' }),
      ],
    });
    expect(r.cards.factoryKg.value).toBe(100);
    expect(r.cards.deliveries).toMatchObject({
      value: 1,
      avgKg: 100,
      ungraded: 1,
      ungradedEstateKg: 569,
      provisional: 1,
    });
    expect(r.cards.weightDiff).toMatchObject({
      value: 9.1,
      estateKg: 110,
      factoryKg: 100,
    });
    expect(r.cards.weightDiff.overTolerance).toHaveLength(1);
  });

  it('uses the current grade lines — the latest applied revision (a correction rewrites them)', () => {
    const d = delivery({ lines: [50, 48] });
    expect(report({ current: [d] }).cards.factoryKg.value).toBe(98);
    d.gradeLines = [
      { grade: 'super', weightKg: '70' },
      { grade: 'normal', weightKg: '30' },
    ]; // approved correction applied
    expect(report({ current: [d] }).cards.factoryKg.value).toBe(100);
  });
});

describe('period', () => {
  it('defaults to the last complete month, not the month in progress', () => {
    expect(resolvePeriod({}, '2026-11-08')).toMatchObject({
      kind: 'month',
      from: '2026-10-01',
      to: '2026-10-31',
      label: 'October 2026',
      partial: false,
      previous: { from: '2026-09-01', to: '2026-09-30' },
      lastYear: { from: '2025-10-01', to: '2025-10-31' },
    });
  });

  it('labels the month in progress and compares it like for like', () => {
    const p = resolvePeriod({ thisMonth: true }, '2026-11-08');
    expect(p).toMatchObject({
      label: 'November 2026 so far (1–8 Nov)',
      partial: true,
      from: '2026-11-01',
      to: '2026-11-08',
    });
    expect(p.previous).toEqual({ from: '2026-10-01', to: '2026-10-08' });
    expect(resolvePeriod({ month: '2026-11' }, '2026-11-08').partial).toBe(
      true,
    );
  });

  it('a month in the future falls back to the default; a custom range is clamped to today', () => {
    expect(resolvePeriod({ month: '2027-01' }, '2026-11-08').month).toBe(
      '2026-10',
    );
    expect(
      resolvePeriod({ from: '2026-10-20', to: '2026-12-01' }, '2026-11-08'),
    ).toMatchObject({
      kind: 'custom',
      to: '2026-11-08',
      partial: true,
      label: '20 Oct – 8 Nov 2026 (so far)',
      previous: { from: '2026-09-30', to: '2026-10-19' },
    });
  });

  it('Colombo calendar: a delivery entered for 31 Oct (23:30 local) stays in October', () => {
    // collection_date is the Colombo calendar day itself; nothing converts it through UTC
    const late = delivery({ collectionDate: '2026-10-31' });
    expect(report({ current: [late] }).table.rows[0].deliveries).toBe(1);
    expect(toFact(late).date).toBe('2026-10-31');
  });
});

describe('comparisons', () => {
  it('year on year is null ("No data last year") when last year has no deliveries', () => {
    const r = report({
      current: [delivery()],
      previous: [delivery({ collectionDate: '2026-09-10' })],
    });
    expect(r.cards.factoryKg).toMatchObject({
      value: 98,
      previous: 98,
      changePct: 0,
      lastYear: null,
      yoyPct: null,
    });
  });

  it('year on year compares with the same period last year when it has data', () => {
    const r = report({
      current: [delivery()],
      lastYear: [delivery({ collectionDate: '2025-10-03', lines: [40, 9] })],
    });
    expect(r.cards.factoryKg).toMatchObject({ lastYear: 49, yoyPct: 100 });
  });

  it('Super share change is in percentage points', () => {
    const r = report({
      current: [delivery({ lines: [60, 40] })],
      previous: [delivery({ collectionDate: '2026-09-02', lines: [50, 50] })],
    });
    expect(r.cards.superShare).toEqual({
      value: 60,
      previous: 50,
      changePts: 10,
    });
  });
});

describe('table', () => {
  const rows = [
    delivery({ lines: [60, 40] }),
    delivery({
      lines: [20, 10],
      estateId: 2,
      estateName: 'Hilltop Estate',
      routeId: 2,
      routeName: 'Route 2',
    }),
    delivery({
      status: 'collected',
      gradeLines: [],
      estateId: 2,
      estateName: 'Hilltop Estate',
      routeId: 2,
      routeName: 'Route 2',
    }),
  ];

  it.each<GroupBy>(['estate', 'route', 'agent', 'day'])(
    'totals equal the cards when grouped by %s',
    (by) => {
      const r = report({ current: rows }, { groupBy: by });
      const sum = (k: 'factoryKg' | 'deliveries' | 'superKg') =>
        r.table.rows.reduce((s, x) => s + x[k], 0);
      expect(sum('factoryKg')).toBe(r.cards.factoryKg.value);
      expect(r.table.totals.factoryKg).toBe(r.cards.factoryKg.value);
      expect(sum('deliveries')).toBe(r.cards.deliveries.value);
      expect(sum('superKg')).toBe(r.gradeSplit.superKg);
    },
  );

  it('supplying estates: active estates in scope that delivered, with the ones that did not', () => {
    const r = report({ current: rows });
    expect(r.cards.supplyingEstates).toMatchObject({ value: 2, of: 3 });
    expect(r.cards.supplyingEstates.notSupplying.map((e) => e.name)).toEqual([
      'Uda Radella Estate (demo)',
    ]);
  });

  it('change vs the previous period per row', () => {
    const r = report({
      current: [delivery({ lines: [60, 40] })],
      previous: [delivery({ collectionDate: '2026-09-01', lines: [40, 40] })],
    });
    expect(r.table.rows[0]).toMatchObject({ prevFactoryKg: 80, changePct: 25 });
  });
});

describe('filters', () => {
  it('hides demo rows and demo estates when demo data is off', () => {
    const real = delivery();
    const demo = delivery({
      estateId: 3,
      estateName: 'Uda Radella Estate (demo)',
    });
    const r = report(
      { current: [real, demo] },
      { filters: { includeDemo: false }, demo: new Set([demo.id]) },
    );
    expect(r.cards.deliveries.value).toBe(1);
    expect(r.cards.supplyingEstates).toMatchObject({ value: 1, of: 2 });
  });

  it('a grade filter counts only that grade; estate weight and difference read as null', () => {
    const facts = [
      delivery({ lines: [60, 40] }),
      delivery({ lines: [0, 30] }),
    ].map((d) => toFact(d));
    expect(
      applyFilters(facts, { includeDemo: true, grade: 'super' }).map(
        (d) => d.factoryKg,
      ),
    ).toEqual([60]);
    const r = report(
      { current: [delivery({ lines: [60, 40] })] },
      { filters: { grade: 'normal' } },
    );
    expect(r.cards.factoryKg.value).toBe(40);
    expect(r.cards.weightDiff.value).toBeNull();
    expect(r.table.totals.estateKg).toBeNull();
  });

  it('route, agent and estate filters narrow every figure', () => {
    const r = report(
      {
        current: [
          delivery(),
          delivery({ routeId: 2, routeName: 'Route 2', estateId: 2 }),
        ],
      },
      { filters: { routeId: 2 } },
    );
    expect(r.cards.deliveries.value).toBe(1);
    expect(r.cards.supplyingEstates.of).toBe(1);
  });
});

describe('trend', () => {
  it('is daily for one month, with every day present', () => {
    const r = report({ current: [delivery({ collectionDate: '2026-10-02' })] });
    expect(r.trend.granularity).toBe('day');
    expect(r.trend.points).toHaveLength(31);
    expect(r.trend.points[1]).toMatchObject({
      key: '2026-10-02',
      label: '2 Oct',
      kg: 98,
      deliveries: 1,
      partial: false,
    });
  });

  it('is monthly over 2 months, and names the year when the range crosses years', () => {
    expect(
      trendBuckets({ from: '2025-09-01', to: '2026-02-28' }, 'month').map(
        (b) => b.label,
      ),
    ).toEqual([
      'Sep 2025',
      'Oct 2025',
      'Nov 2025',
      'Dec 2025',
      'Jan 2026',
      'Feb 2026',
    ]);
    expect(
      trendBuckets({ from: '2026-05-01', to: '2026-07-31' }, 'month').map(
        (b) => b.label,
      ),
    ).toEqual(['May', 'Jun', 'Jul']);
  });

  it('marks the month in progress as partial', () => {
    const today = '2026-11-08';
    const r = buildCollectionReport({
      today,
      period: resolvePeriod({ from: '2026-08-01', to: '2026-11-08' }, today),
      groupBy: 'estate',
      filters: { includeDemo: true },
      tolerancePct: 5,
      current: [toFact(delivery({ collectionDate: '2026-11-02' }))],
      previous: [],
      lastYear: [],
      activeEstates: ESTATES,
      monthsWithData: [],
    });
    expect(r.trend.granularity).toBe('month');
    expect(r.trend.points.map((p) => p.partial)).toEqual([
      false,
      false,
      false,
      true,
    ]);
    expect(r.gradeByMonth?.at(-1)).toMatchObject({
      key: '2026-11',
      superKg: 50,
      normalKg: 48,
    });
  });
});
