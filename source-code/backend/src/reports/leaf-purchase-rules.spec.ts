import {
  resolvePeriod,
  toFact,
  type DeliveryInput,
} from './collection-report-rules';
import {
  buildLeafPurchaseReport,
  leafTrendRange,
  leafValueByMonth,
  settledPayments,
  valueDeliveries,
  type LeafGroupBy,
  type RateVersion,
  type SettlementInput,
} from './leaf-purchase-rules';

/** RPT-02 Leaf Purchase rules (Reports addendum §9). */

let seq = 0;
function delivery(
  o: Partial<DeliveryInput> & { lines?: [number, number] } = {},
): DeliveryInput {
  const { lines = [50, 48], ...rest } = o;
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
    gradeLines: [
      ...(lines[0] ? [{ grade: 'super', weightKg: String(lines[0]) }] : []),
      ...(lines[1] ? [{ grade: 'normal', weightKg: String(lines[1]) }] : []),
    ],
    provisional: null,
    settlementId: null,
    ...rest,
  };
}

const RATES: RateVersion[] = [
  { effectiveDate: '2026-01-01', superRate: 172, normalRate: 88 },
  { effectiveDate: '2026-04-01', superRate: 180, normalRate: 92 },
  { effectiveDate: '2026-07-01', superRate: 185, normalRate: 95 },
];

function report(
  current: DeliveryInput[],
  o: {
    month?: string;
    from?: string;
    to?: string;
    thisMonth?: boolean;
    rates?: RateVersion[];
    previous?: DeliveryInput[];
    lastYear?: DeliveryInput[];
    trend?: DeliveryInput[];
    settlements?: SettlementInput[];
    groupBy?: LeafGroupBy;
    grade?: 'super' | 'normal';
  } = {},
) {
  const today = '2026-11-15';
  const settlements = o.settlements ?? [];
  return buildLeafPurchaseReport({
    today,
    period: resolvePeriod(
      { month: o.month, from: o.from, to: o.to, thisMonth: o.thisMonth },
      today,
    ),
    groupBy: o.groupBy ?? 'estate',
    filters: { includeDemo: true, grade: o.grade },
    rates: o.rates ?? RATES,
    processedSettlementIds: new Set(
      settlements.filter((s) => s.status === 'processed').map((s) => s.id),
    ),
    settlements,
    current: current.map((d) => toFact(d)),
    previous: (o.previous ?? []).map((d) => toFact(d)),
    lastYear: (o.lastYear ?? []).map((d) => toFact(d)),
    trend: (o.trend ?? current).map((d) => toFact(d)),
    monthsWithData: [],
    options: { routes: [], estates: [] },
  });
}

const settlement = (o: Partial<SettlementInput>): SettlementInput => ({
  id: 'SET-1',
  month: '2026-10',
  status: 'processed',
  superKg: 100,
  normalKg: 100,
  superRate: 185,
  normalRate: 95,
  transportCost: 1000,
  fertilizerDeduction: 2000,
  advanceDeduction: 500,
  adjustmentAmount: 0,
  ...o,
});

describe('leaf value = kg × the grade rate in force on the delivery date', () => {
  it('values each delivery at its own date’s rate', () => {
    const r = report([
      delivery({ collectionDate: '2026-10-10', lines: [10, 20] }),
    ]);
    // 10 × 185 + 20 × 95
    expect(r.cards.leafValue.value).toBe(3750);
    const june = report(
      [delivery({ collectionDate: '2026-06-30', lines: [10, 20] })],
      { month: '2026-06' },
    );
    // 10 × 180 + 20 × 92 (the April version)
    expect(june.cards.leafValue.value).toBe(3640);
  });

  it('a rate change does not alter past months', () => {
    const june = [delivery({ collectionDate: '2026-06-15', lines: [10, 20] })];
    const before = report(june, { month: '2026-06' }).cards.leafValue.value;
    const after = report(june, {
      month: '2026-06',
      rates: [
        ...RATES,
        { effectiveDate: '2026-11-20', superRate: 999, normalRate: 999 },
      ],
    }).cards.leafValue.value;
    expect(after).toBe(before);
  });

  it('a delivery with no rate in force is counted, never valued', () => {
    const r = report(
      [delivery({ collectionDate: '2025-09-05', lines: [30, 0] })],
      { from: '2025-09-01', to: '2025-09-30' },
    );
    expect(r.cards.leafValue.value).toBe(0);
    expect(r.cards.noRate).toEqual({ deliveries: 1, kg: 30 });
    expect(r.cards.pricePerKg.value).toBeNull();
  });

  it('ungraded, provisional and not-delivered entries carry no value', () => {
    const facts = [
      delivery({ status: 'collected', gradeLines: [] }),
      delivery({
        status: 'pending_agent_confirmation',
        provisional: { reason: 'x' },
      }),
      delivery({ status: 'agent_assigned' }),
    ].map((d) => toFact(d));
    expect(valueDeliveries(facts, RATES, new Set())).toEqual([]);
  });
});

describe('Rs/kg and grades', () => {
  it('Rs/kg = value ÷ factory kg, overall and per grade', () => {
    const r = report([
      delivery({ lines: [10, 30] }),
      delivery({ lines: [20, 0] }),
    ]);
    const { value, superRsPerKg, normalRsPerKg } = r.cards.pricePerKg;
    expect(value).toBe(Math.round((r.cards.leafValue.value / 60) * 100) / 100);
    expect(superRsPerKg).toBe(185);
    expect(normalRsPerKg).toBe(95);
  });

  it('a grade filter values only that grade', () => {
    const r = report([delivery({ lines: [10, 30] })], { grade: 'normal' });
    expect(r.cards.leafValue.value).toBe(30 * 95);
    expect(r.byGrade.superRs).toBe(0);
  });
});

describe('settled vs not yet settled', () => {
  it('settled = deliveries taken by a PROCESSED settlement; settled + not yet settled = accrued', () => {
    const r = report(
      [
        delivery({ settlementId: 'SET-1', lines: [10, 0] }),
        delivery({ settlementId: 'SET-2', lines: [0, 10] }), // pending settlement → not settled yet
        delivery({ lines: [5, 5] }),
      ],
      {
        settlements: [
          settlement({ id: 'SET-1' }),
          settlement({ id: 'SET-2', status: 'pending' }),
        ],
      },
    );
    const { settledRs, unsettledRs, valueRs } = r.cards.settlement;
    expect(settledRs).toBe(1850);
    expect(settledRs + unsettledRs).toBe(valueRs);
  });

  it('payments: processed settlements of the period, with deductions and net; flags unlinked ones', () => {
    const p = settledPayments(
      [
        settlement({ id: 'SET-1' }),
        settlement({ id: 'SET-2', status: 'pending' }),
        settlement({ id: 'SET-3', month: '2026-09' }),
      ],
      { from: '2026-10-01', to: '2026-10-31' },
      new Set(),
    );
    expect(p).toEqual({
      count: 1,
      grossRs: 28000,
      transportRs: 1000,
      fertilizerRs: 2000,
      advancesRs: 500,
      adjustmentRs: 0,
      netRs: 24500,
      linked: false,
    });
  });
});

describe('periods and comparisons', () => {
  it('a month in progress is labelled and drawn as partial', () => {
    const r = report([delivery({ collectionDate: '2026-11-03' })], {
      thisMonth: true,
    });
    expect(r.period).toMatchObject({
      label: 'November 2026 so far (1–15 Nov)',
      partial: true,
    });
    expect(r.trend.at(-1)).toMatchObject({ key: '2026-11', partial: true });
  });

  it('a single month trends over the 12 months ending with it', () => {
    expect(leafTrendRange({ from: '2026-10-01', to: '2026-10-31' })).toEqual({
      from: '2025-11-01',
      to: '2026-10-31',
    });
    expect(report([delivery()]).trend).toHaveLength(12);
  });

  it('year on year is null when last year has nothing', () => {
    const r = report([delivery()], {
      previous: [delivery({ collectionDate: '2026-09-10' })],
    });
    expect(r.cards.leafValue).toMatchObject({
      lastYear: null,
      yoyPct: null,
      changePct: 0,
    });
  });
});

describe('table', () => {
  const rows = [
    delivery({ lines: [10, 30] }),
    delivery({
      lines: [20, 5],
      estateId: 2,
      estateName: 'Hilltop Estate',
      routeId: 2,
      routeName: 'Route 2',
    }),
    delivery({ collectionDate: '2026-09-20', lines: [5, 5] }),
  ];

  it.each<LeafGroupBy>(['estate', 'route', 'month'])(
    'totals equal the cards when grouped by %s',
    (by) => {
      const r = report(rows, {
        from: '2026-09-01',
        to: '2026-10-31',
        groupBy: by,
      });
      const sum = r.table.rows.reduce((s, x) => s + x.valueRs, 0);
      expect(Math.round(sum * 100) / 100).toBe(r.cards.leafValue.value);
      expect(r.table.totals.valueRs).toBe(r.cards.leafValue.value);
      expect(r.table.totals.settledRs + r.table.totals.unsettledRs).toBe(
        r.table.totals.valueRs,
      );
    },
  );

  it('the Expense report’s leaf line equals the report’s accrued value', () => {
    // the service hands the builder only the period's deliveries (loaded by date range)
    const r = report(
      rows.filter((d) => d.collectionDate.startsWith('2026-10')),
      { month: '2026-10' },
    );
    expect(
      leafValueByMonth(
        rows.map((d) => toFact(d)),
        RATES,
      ).get('2026-10'),
    ).toBe(r.cards.leafValue.value);
  });
});
