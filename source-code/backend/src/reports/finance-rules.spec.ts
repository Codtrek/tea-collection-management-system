import {
  resolvePeriod,
  toFact,
  type DeliveryInput,
} from './collection-report-rules';
import {
  buildExpenseReport,
  estimateWages,
  expenseLines,
  type ExpenseGroupBy,
  type FinanceInputs,
} from './finance-rules';
import {
  buildLeafPurchaseReport,
  leafTrendRange,
  valueDeliveries,
  type RateVersion,
  type SettlementInput,
} from './leaf-purchase-rules';

/** RPT-03 — expense vs recovery vs loan (Finance-Reports-Addendum). */

const TODAY = '2026-11-15';
const RATES: RateVersion[] = [
  { effectiveDate: '2026-01-01', superRate: 172, normalRate: 88 },
  { effectiveDate: '2026-07-01', superRate: 185, normalRate: 95 },
];

let seq = 0;
function delivery(
  date: string,
  superKg: number,
  normalKg: number,
): DeliveryInput {
  return {
    id: `D-${++seq}`,
    status: 'confirmed',
    collectionDate: date,
    estateId: 1,
    estateName: 'Green Valley Estate',
    routeId: 1,
    routeName: 'Route 1',
    agentId: 7,
    agentName: 'R. Senanayake',
    weightKg: String(superKg + normalKg),
    gradeLines: [
      { grade: 'super', weightKg: String(superKg) },
      { grade: 'normal', weightKg: String(normalKg) },
    ],
    provisional: null,
    settlementId: null,
  };
}

const settlement = (o: Partial<SettlementInput>): SettlementInput => ({
  id: 'SET-1',
  month: '2026-10',
  status: 'processed',
  superKg: 100,
  normalKg: 100,
  superRate: 185,
  normalRate: 95,
  transportCost: 1200,
  fertilizerDeduction: 3400,
  advanceDeduction: 5000,
  adjustmentAmount: 0,
  ...o,
});

const RATE = { dayRate: 500, dayOtRate: 750, nightRate: 600, nightOtRate: 900 };
const day = (employeeId: number, date: string, dayHours = 8) => ({
  employeeId,
  date,
  dayHours,
  dayOtHours: 0,
  nightHours: 0,
  nightOtHours: 0,
});

const OCT_DELIVERIES = [
  delivery('2026-10-03', 10, 20), // 1850 + 1900 = 3750
  delivery('2026-10-20', 40, 0), // 7400
];

function inputs(o: Partial<FinanceInputs> = {}): FinanceInputs {
  return {
    leaf: valueDeliveries(
      OCT_DELIVERIES.map((d) => toFact(d)),
      RATES,
      new Set(),
    ),
    payroll: [],
    attendance: [],
    employees: [
      { id: 1, ...RATE },
      { id: 2, ...RATE },
    ],
    stockIns: [],
    manual: [],
    settlements: [],
    directRecoveries: [],
    loans: [],
    ...o,
  };
}

function report(
  i: FinanceInputs,
  o: {
    month?: string;
    thisMonth?: boolean;
    from?: string;
    to?: string;
    groupBy?: ExpenseGroupBy;
    category?: string;
  } = {},
) {
  const period = resolvePeriod(o, TODAY);
  return buildExpenseReport({
    today: TODAY,
    period,
    trendRange: leafTrendRange(period),
    groupBy: o.groupBy ?? 'category',
    category: o.category,
    inputs: i,
    stockLost: [],
    categories: [],
  });
}

describe('what counts as an expense', () => {
  it('the default period is the last complete month', () => {
    const r = report(inputs());
    expect(r.period).toMatchObject({
      kind: 'month',
      month: '2026-10',
      label: 'October 2026',
      partial: false,
    });
  });

  it('settlement deductions are recoveries, never expenses', () => {
    const r = report(
      inputs({
        settlements: [settlement({})],
        directRecoveries: [
          {
            kind: 'cash',
            status: 'recovered',
            paidOn: '2026-10-12',
            amount: 2500,
          },
          // a settlement-kind recovery IS the settlement's advance deduction — not counted twice
          {
            kind: 'settlement',
            status: 'recovered',
            paidOn: '2026-10-31',
            amount: 5000,
          },
        ],
      }),
    );
    expect(r.byCategory.map((c) => c.category)).toEqual([
      'Green leaf purchases',
    ]);
    expect(r.cards.total.value).toBe(11150);
    expect(r.cards.recovered).toEqual({
      settlements: 1,
      transportRs: 1200,
      fertilizerRs: 3400,
      advancesRs: 7500,
      totalRs: 12100,
    });
    expect(r.netLeafCostRs).toBe(11150 - 1200);
  });

  it('advances issued are loans (cash out), never expenses', () => {
    const r = report(
      inputs({
        loans: [
          {
            kind: 'estate',
            id: 'EA-1',
            name: 'Hilltop',
            date: '2026-10-05',
            amount: 40000,
          },
          {
            kind: 'salary',
            id: 'SA-1',
            name: 'K. Perera',
            date: '2026-10-09',
            amount: 20000,
          },
        ],
      }),
    );
    expect(r.cards.total.value).toBe(11150);
    expect(r.loans).toEqual({
      totalRs: 60000,
      estateRs: 40000,
      salaryRs: 20000,
      count: 2,
    });
  });

  it('fertilizer stock purchases = quantity × unit cost; a stock-in without a cost is flagged, not guessed', () => {
    const r = report(
      inputs({
        stockIns: [
          {
            id: 1,
            batchId: 4,
            item: 'Urea',
            date: '2026-10-02',
            quantityKg: 500,
            unitCost: 160,
            supplier: 'CIC',
          },
          {
            id: 2,
            batchId: 5,
            item: 'TSP',
            date: '2026-10-02',
            quantityKg: 200,
            unitCost: null,
            supplier: null,
          },
        ],
      }),
    );
    expect(r.byCategory.find((c) => c.kind === 'stock')).toMatchObject({
      category: 'Fertilizer stock purchases',
      amount: 80000,
    });
    expect(r.stock).toEqual({ uncosted: 1, uncostedKg: 200 });
    expect(r.empty.hints).toContain(
      '1 fertilizer stock-in has no cost recorded, so it adds nothing.',
    );
  });

  it('daily entries count under their own category, by expense date', () => {
    const r = report(
      inputs({
        leaf: [],
        manual: [
          {
            id: 'EXP-1',
            date: '2026-10-08',
            category: 'Electricity',
            description: 'CEB',
            amount: 52000,
            paidVia: 'bank',
            enteredBy: 'S. Fernando',
          },
          {
            id: 'EXP-2',
            date: '2026-11-02',
            category: 'Electricity',
            description: 'CEB',
            amount: 9000,
            paidVia: 'bank',
            enteredBy: 'S. Fernando',
          },
        ],
      }),
    );
    expect(r.byCategory).toEqual([
      { category: 'Electricity', kind: 'operating', amount: 52000, pct: 100 },
    ]);
  });
});

describe('wages', () => {
  it('only PROCESSED payroll is wages; a pending run is not', () => {
    const r = report(
      inputs({
        leaf: [],
        payroll: [
          {
            employeeId: 1,
            month: '2026-10',
            gross: 80000,
            status: 'Processed',
          },
          { employeeId: 2, month: '2026-10', gross: 60000, status: 'Pending' },
        ],
      }),
    );
    expect(r.cards.total.value).toBe(80000);
    expect(r.table.rows[0]).toMatchObject({
      name: 'Wages',
      records: 1,
      source: 'Payroll',
    });
  });

  it('estimated wages (attendance × rates) are kept apart from the processed total', () => {
    const i = inputs({
      payroll: [
        { employeeId: 1, month: '2026-10', gross: 80000, status: 'Processed' },
      ],
      attendance: [
        day(1, '2026-10-01'), // processed month — not estimated
        day(2, '2026-10-01'),
        day(2, '2026-10-02', 10),
      ],
    });
    const r = report(i);
    expect(r.wagesEstimate).toEqual({
      amountRs: 18 * 500,
      months: [{ month: '2026-10', amountRs: 9000, employees: 1, days: 2 }],
    });
    expect(r.cards.total.value).toBe(11150 + 80000);
    expect(r.byCategory.find((c) => c.kind === 'wages')?.amount).toBe(80000);
    expect(
      estimateWages(i, { from: '2026-09-01', to: '2026-09-30' }).amountRs,
    ).toBe(0);
  });
});

describe('shared with the Leaf Purchase report', () => {
  it('leaf purchases equal the Leaf Purchase report for the same period', () => {
    const deliveries = [
      ...OCT_DELIVERIES,
      delivery('2026-06-30', 10, 20), // previous rate version
      delivery('2026-09-14', 5, 5),
    ];
    const facts = deliveries.map((d) => toFact(d));
    for (const q of [
      { month: '2026-10' },
      { from: '2026-06-01', to: '2026-10-31' },
    ]) {
      const period = resolvePeriod(q, TODAY);
      const leafReport = buildLeafPurchaseReport({
        today: TODAY,
        period,
        groupBy: 'estate',
        filters: { includeDemo: true },
        rates: RATES,
        processedSettlementIds: new Set(),
        settlements: [],
        current: facts.filter(
          (d) => d.date >= period.from && d.date <= period.to,
        ),
        previous: [],
        lastYear: [],
        trend: facts,
        monthsWithData: [],
        options: { routes: [], estates: [] },
      });
      const expense = report(
        inputs({ leaf: valueDeliveries(facts, RATES, new Set()) }),
        q,
      );
      expect(expense.cards.leafShare.amount).toBe(
        leafReport.cards.leafValue.value,
      );
    }
  });
});

describe('cards, table and trend', () => {
  const i = inputs({
    payroll: [
      { employeeId: 1, month: '2026-10', gross: 80000, status: 'Processed' },
      { employeeId: 1, month: '2026-09', gross: 70000, status: 'Processed' },
    ],
    manual: [
      {
        id: 'EXP-1',
        date: '2026-10-08',
        category: 'Electricity',
        description: 'CEB',
        amount: 52000,
        paidVia: 'bank',
        enteredBy: 'S. Fernando',
      },
      {
        id: 'EXP-2',
        date: '2026-10-09',
        category: 'Firewood / dryer fuel',
        description: 'Firewood',
        amount: 30000,
        paidVia: 'cash',
        enteredBy: 'S. Fernando',
      },
    ],
  });

  it.each<ExpenseGroupBy>(['category', 'month', 'entry'])(
    'table totals equal the cards when grouped by %s',
    (by) => {
      const r = report(i, { groupBy: by });
      const sum = r.table.rows.reduce((s, x) => s + x.amount, 0);
      expect(Math.round(sum * 100) / 100).toBe(r.cards.total.value);
      expect(r.table.totals.amount).toBe(r.cards.total.value);
    },
  );

  it('largest category, leaf share and the change vs the previous month', () => {
    const r = report(i);
    expect(r.cards.total.value).toBe(11150 + 80000 + 52000 + 30000);
    expect(r.cards.largest).toMatchObject({ category: 'Wages', amount: 80000 });
    expect(r.cards.leafShare.pct).toBe(
      Math.round((11150 / 173150) * 1000) / 10,
    );
    expect(r.cards.total.previous).toBe(70000);
    expect(r.cards.total.lastYear).toBeNull();
    expect(r.cards.total.yoyPct).toBeNull();
  });

  it('entry rows link to the record they come from', () => {
    const rows = report(i, { groupBy: 'entry' }).table.rows;
    expect(rows.map((r) => [r.source, r.href])).toEqual(
      expect.arrayContaining([
        ['Leaf', '/reports/leaf-purchases?month=2026-10'],
        ['Payroll', '/employees/payroll?month=2026-10'],
        ['Manual', '/reports/expenses/EXP-1'],
      ]),
    );
  });

  it('a category filter narrows every figure', () => {
    const r = report(i, { category: 'Electricity' });
    expect(r.cards.total.value).toBe(52000);
    expect(r.table.rows).toHaveLength(1);
    expect(r.filters.category).toBe('Electricity');
  });

  it('the trend is 12 months, stacked by kind, the month in progress flagged partial', () => {
    const r = report(i, { thisMonth: true });
    expect(r.trend).toHaveLength(12);
    expect(r.trend.at(-1)).toMatchObject({ key: '2026-11', partial: true });
    expect(r.trend.find((t) => t.key === '2026-10')).toMatchObject({
      leaf: 11150,
      wages: 80000,
      operating: 82000,
      stock: 0,
      total: 173150,
      partial: false,
    });
    // the year is shown once the range crosses years
    expect(r.trend[0].label).toMatch(/2025/);
  });
});

describe('empty state', () => {
  it('says WHY a period is empty', () => {
    const r = report(inputs({ leaf: [] }), { month: '2026-09' });
    expect(r.cards.total.value).toBe(0);
    expect(r.empty.reason).toBe(
      'No processed payroll, no deliveries graded, no fertilizer stock bought with a recorded cost and no manual entries in September 2026.',
    );
  });

  it('names graded deliveries that have no rate in force, and the wage estimate', () => {
    const r = report(
      inputs({
        leaf: valueDeliveries(
          [toFact(delivery('2025-12-03', 5, 5))],
          RATES,
          new Set(),
        ),
        attendance: [day(2, '2025-12-03')],
      }),
      { month: '2025-12' },
    );
    expect(r.empty.reason).toBe(
      'No processed payroll, 1 graded delivery has no grade rate in force, no fertilizer stock bought with a recorded cost and no manual entries in December 2025.',
    );
    expect(r.empty.hints[0]).toMatch(
      /^Attendance × pay rates comes to about Rs 4,000/,
    );
  });

  it('expenseLines never returns a line worth nothing', () => {
    const lines = expenseLines(
      inputs({
        stockIns: [
          {
            id: 1,
            batchId: 1,
            item: 'Urea',
            date: '2026-10-02',
            quantityKg: 5,
            unitCost: null,
            supplier: null,
          },
        ],
      }),
      { from: '2026-10-01', to: '2026-10-31' },
    );
    expect(lines.map((l) => l.kind)).toEqual(['leaf']);
  });
});
