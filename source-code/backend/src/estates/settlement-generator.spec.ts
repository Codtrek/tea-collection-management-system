import type { TransportVersion } from '../admin/transport-rules';
import {
  generateSettlement,
  monthRatePeriods,
  periodLabel,
  runTotals,
  type GenCharge,
  type GenDelivery,
  type GenerateInput,
  type GenRateVersion,
} from './settlement-generator';

/** Transport here is a TEST value only — no real monthly charge has been decided. */
const TEST_TRANSPORT: TransportVersion = {
  id: 9,
  effectiveDate: '2026-07-01',
  cancelledAt: null,
  basis: 'fixed_month',
  rate: 1000,
  minimumCharge: 0,
  basisConfirmed: true,
  neverApplied: false,
};

const RATES: GenRateVersion[] = [
  { id: 'GR-1', effectiveDate: '2026-04-01', superRate: 180, normalRate: 92 },
  { id: 'GR-2', effectiveDate: '2026-07-01', superRate: 185, normalRate: 95 },
];

const AFTER_WINDOW = new Date('2026-08-05T04:00:00Z');

const delivery = (
  id: string,
  date: string,
  superKg: number,
  normalKg: number,
  over: Partial<GenDelivery> = {},
): GenDelivery => ({
  id,
  date,
  status: 'confirmed',
  lockedAt: new Date(`${date}T10:00:00Z`),
  settlementId: null,
  lines: [
    ...(superKg ? [{ grade: 'super' as const, weightKg: superKg }] : []),
    ...(normalKg ? [{ grade: 'normal' as const, weightKg: normalKg }] : []),
  ],
  ...over,
});

const charge = (
  id: number,
  date: string,
  amount: number,
  over: Partial<GenCharge> = {},
): GenCharge => ({
  id,
  ref: `FC-${id}`,
  date,
  item: 'Urea',
  quantityKg: amount / 90,
  ratePerKg: 90,
  amount,
  method: 'deduct',
  recovered: false,
  ...over,
});

function input(over: Partial<GenerateInput> = {}): GenerateInput {
  return {
    month: '2026-07',
    estate: {
      id: 1,
      name: 'Green Valley Estate',
      selfDelivery: false,
      payoutMethod: 'bank',
      bankAccount: '8802345671',
    },
    deliveries: [delivery('D1', '2026-07-10', 100, 50)],
    exclusions: [],
    rates: RATES,
    adjustments: [],
    transportVersions: [TEST_TRANSPORT],
    transportCarriedIn: 0,
    charges: [],
    advances: [],
    recs: [],
    capPct: 50,
    order: ['transport', 'fertilizer', 'advances'],
    firstRealMonth: '2026-03',
    now: AFTER_WINDOW,
    ...over,
  };
}

describe('settlement generator — leaf lines by rate period', () => {
  it('prices each delivery at the rate in force on its own date', () => {
    const c = generateSettlement(input());
    expect(c.leaf[0]).toMatchObject({ superRate: 185, normalRate: 95 });
    expect(c.gross).toBe(100 * 185 + 50 * 95);
  });

  it('a mid-month rate change splits the lines into two periods', () => {
    const rates = [
      ...RATES,
      {
        id: 'GR-3',
        effectiveDate: '2026-07-15',
        superRate: 190,
        normalRate: 98,
      },
    ];
    const c = generateSettlement(
      input({
        rates,
        deliveries: [
          delivery('D1', '2026-07-03', 200, 60),
          delivery('D2', '2026-07-14', 120, 50),
          delivery('D3', '2026-07-20', 80, 0),
        ],
      }),
    );
    expect(c.ratePeriods).toHaveLength(2);
    const [p1, p2] = c.ratePeriods;
    expect(p1).toMatchObject({
      from: '2026-07-01',
      to: '2026-07-14',
      superRate: 185,
      superKg: 320,
      normalKg: 110,
      deliveries: 2,
    });
    expect(p2).toMatchObject({
      from: '2026-07-15',
      to: '2026-07-31',
      superRate: 190,
      superKg: 80,
    });
    expect(periodLabel(p1.from, p1.to)).toBe('1–14 Jul');
    expect(c.gross).toBe(320 * 185 + 110 * 95 + 80 * 190);
  });

  it('three rate versions in one month give three periods', () => {
    const rates = [
      ...RATES,
      {
        id: 'GR-3',
        effectiveDate: '2026-07-11',
        superRate: 188,
        normalRate: 96,
      },
      {
        id: 'GR-4',
        effectiveDate: '2026-07-21',
        superRate: 190,
        normalRate: 98,
      },
    ];
    expect(
      monthRatePeriods(rates, '2026-07').map((p) => [p.from, p.to]),
    ).toEqual([
      ['2026-07-01', '2026-07-10'],
      ['2026-07-11', '2026-07-20'],
      ['2026-07-21', '2026-07-31'],
    ]);
    const c = generateSettlement(
      input({
        rates,
        deliveries: [
          delivery('D1', '2026-07-05', 10, 0),
          delivery('D2', '2026-07-15', 10, 0),
          delivery('D3', '2026-07-25', 10, 0),
        ],
      }),
    );
    expect(c.ratePeriods.map((p) => p.superRate)).toEqual([185, 188, 190]);
    expect(c.gross).toBe(10 * 185 + 10 * 188 + 10 * 190);
  });

  it('a calculation made earlier is unchanged by a later rate version (the snapshot)', () => {
    const before = generateSettlement(input());
    const frozen = JSON.parse(JSON.stringify(before)) as typeof before;
    // a new version later — even one back-dated into the month — is a new input, never the old snapshot
    const after = generateSettlement(
      input({
        rates: [
          ...RATES,
          {
            id: 'GR-9',
            effectiveDate: '2026-07-05',
            superRate: 250,
            normalRate: 120,
          },
        ],
      }),
    );
    expect(after.gross).not.toBe(before.gross);
    expect(frozen).toEqual(before);
    expect(frozen.leaf[0].superRate).toBe(185);
  });
});

describe('settlement generator — eligibility', () => {
  it('ungraded deliveries block the estate and are listed', () => {
    const c = generateSettlement(
      input({
        deliveries: [
          delivery('D1', '2026-07-10', 100, 0),
          delivery('D2', '2026-07-18', 0, 0, {
            status: 'pending_agent_confirmation',
            lines: [],
          }),
          delivery('D3', '2026-07-19', 0, 0, {
            status: 'agent_assigned',
            lines: [],
          }),
        ],
      }),
    );
    expect(c.ungraded.map((u) => u.id)).toEqual(['D2']);
    expect(c.blockers.join(' ')).toMatch(/not graded yet \(D2\)/);
    expect(c.leaf.map((l) => l.deliveryId)).toEqual(['D1']);
  });

  it('an excluded delivery no longer blocks, and rolls into the next month', () => {
    const d2 = delivery('D2', '2026-07-18', 0, 0, {
      status: 'collected',
      lines: [],
    });
    const exclusions = [
      { deliveryId: 'D2', month: '2026-07', reason: 'Scale broken' },
    ];
    const july = generateSettlement(
      input({
        deliveries: [delivery('D1', '2026-07-10', 100, 0), d2],
        exclusions,
      }),
    );
    expect(july.blockers).toEqual([]);
    expect(july.excluded).toEqual([
      expect.objectContaining({ id: 'D2', reason: 'Scale broken' }),
    ]);

    // graded later: August pays it, at the rate of its OWN date (July's)
    const graded = delivery('D2', '2026-07-18', 40, 0);
    const aug = generateSettlement(
      input({
        month: '2026-08',
        deliveries: [graded, delivery('D5', '2026-08-03', 10, 0)],
        exclusions,
        now: new Date('2026-09-02T04:00:00Z'),
      }),
    );
    expect(aug.leaf.find((l) => l.deliveryId === 'D2')).toMatchObject({
      rolledIn: true,
      superRate: 185,
    });
    expect(aug.ratePeriods[0]).toMatchObject({
      rolledIn: true,
      from: '2026-07-18',
    });
  });

  it('OPEN deliveries are skipped and listed, never paid', () => {
    const c = generateSettlement(
      input({
        deliveries: [
          delivery('D1', '2026-07-10', 100, 0),
          delivery('D2', '2026-07-31', 50, 0, {
            lockedAt: new Date('2026-08-05T04:20:00Z'),
          }),
        ],
      }),
    );
    expect(c.open.map((o) => o.id)).toEqual(['D2']);
    expect(c.leaf).toHaveLength(1);
    expect(c.blockers).toEqual([]);
  });

  it('already-paid deliveries are never paid again', () => {
    const c = generateSettlement(
      input({
        deliveries: [
          delivery('D1', '2026-07-10', 100, 0, {
            settlementId: 'SET-2026-07-001',
          }),
          delivery('D2', '2026-07-12', 10, 0),
        ],
      }),
    );
    expect(c.leaf.map((l) => l.deliveryId)).toEqual(['D2']);
  });

  it('a bank payout with no account is excluded, with the reason', () => {
    const c = generateSettlement(
      input({
        estate: { ...input().estate, payoutMethod: 'bank', bankAccount: null },
      }),
    );
    expect(c.excludedReason).toMatch(/no bank account/);
    const cash = generateSettlement(
      input({
        estate: { ...input().estate, payoutMethod: 'cash', bankAccount: null },
      }),
    );
    expect(cash.excludedReason).toBeNull();
  });
});

describe('settlement generator — transport (fixed per month; test values)', () => {
  it('is charged once for the month, however many deliveries', () => {
    const c = generateSettlement(
      input({
        deliveries: [
          delivery('D1', '2026-07-01', 10, 0),
          delivery('D2', '2026-07-12', 10, 0),
          delivery('D3', '2026-07-30', 10, 0),
        ],
      }),
    );
    expect(c.transport).toMatchObject({
      status: 'charged',
      charge: 1000,
      taken: 1000,
    });
  });

  it('self-delivery estates are exempt', () => {
    const c = generateSettlement(
      input({ estate: { ...input().estate, selfDelivery: true } }),
    );
    expect(c.transport).toMatchObject({ status: 'exempt', taken: 0 });
    expect(c.blockers).toEqual([]);
  });

  it('no version covering the month blocks processing — never a silent Rs. 0', () => {
    const c = generateSettlement(input({ transportVersions: [] }));
    expect(c.transport.status).toBe('not_configured');
    expect(c.blockers.join(' ')).toMatch(/Transport: not configured/);
  });

  it('carries in what the last settlement left owing', () => {
    const c = generateSettlement(input({ transportCarriedIn: 300 }));
    expect(c.transport).toMatchObject({
      due: 1300,
      taken: 1300,
      carriedOut: 0,
    });
  });
});

describe('settlement generator — fertilizer', () => {
  it('only "Deduct from tea payment" charges are deducted; cash and bank are listed for information', () => {
    const c = generateSettlement(
      input({
        charges: [
          charge(1, '2026-07-05', 900),
          charge(2, '2026-07-06', 500, { method: 'cash' }),
          charge(3, '2026-07-07', 700, { method: 'bank' }),
          charge(4, '2026-06-01', 300, { method: null }), // legacy row = deduct
        ],
      }),
    );
    expect(c.fertilizer.lines.map((l) => l.chargeId)).toEqual([4, 1]);
    expect(c.fertilizer.taken).toBe(1200);
    expect(c.fertilizer.info.map((l) => l.chargeId)).toEqual([2, 3]);
  });

  it('takes all outstanding charges up to month end, oldest first; later ones and recovered ones are left', () => {
    const c = generateSettlement(
      input({
        charges: [
          charge(1, '2026-06-29', 400),
          charge(2, '2026-05-01', 200),
          charge(3, '2026-08-01', 999), // after month end
          charge(4, '2026-04-01', 100, { recovered: true }),
        ],
      }),
    );
    expect(c.fertilizer.lines.map((l) => [l.chargeId, l.date])).toEqual([
      [2, '2026-05-01'],
      [1, '2026-06-29'],
    ]);
  });

  it('flags charges older than the first real month', () => {
    const c = generateSettlement(
      input({
        charges: [charge(1, '2025-09-01', 100), charge(2, '2026-06-29', 100)],
      }),
    );
    expect(c.fertilizer.lines.map((l) => l.checkSeed)).toEqual([true, false]);
  });

  it('what does not fit carries forward, whole charges only', () => {
    // gross 1,850; transport 1,000 → 850 left: the 500 fits, the 600 does not (and stops the step)
    const c = generateSettlement(
      input({
        deliveries: [delivery('D1', '2026-07-10', 10, 0)],
        charges: [
          charge(1, '2026-05-01', 500),
          charge(2, '2026-06-01', 600),
          charge(3, '2026-06-02', 100),
        ],
      }),
    );
    expect(c.fertilizer.lines.map((l) => l.taken)).toEqual([500, 0, 0]);
    expect(c.fertilizer.carried).toBe(700);
    expect(c.net).toBe(350);
  });
});

describe('settlement generator — advances, order, net', () => {
  const advance = {
    id: 'EADV-1',
    estateId: 1,
    amount: 50000,
    dateIssued: '2026-06-10',
    installmentAmount: '50000',
    startPeriod: 'July 2026',
  };

  it('caps the installment at the cap % of gross and carries the rest', () => {
    // gross 71,880 (Green Valley, July): cap 35,940
    const c = generateSettlement(
      input({
        deliveries: [delivery('D1', '2026-07-10', 368, 40)],
        advances: [advance],
        charges: [charge(8, '2025-09-01', 8100)],
        transportVersions: [],
      }),
    );
    expect(c.gross).toBe(71880);
    expect(c.advances).toMatchObject({
      cap: 35940,
      due: 50000,
      taken: 35940,
      carried: 14060,
    });
    expect(c.fertilizer.lines[0]).toMatchObject({
      taken: 8100,
      checkSeed: true,
    });
    expect(c.net).toBe(71880 - 8100 - 35940);
  });

  it('applies the deductions in order: adjustments, transport, fertilizer, advances', () => {
    // gross 1,850 − adjustment 50 = 1,800; transport 1,000; fertilizer 900 does NOT fit (800 left)
    const c = generateSettlement(
      input({
        deliveries: [delivery('D1', '2026-07-10', 10, 0)],
        adjustments: [{ id: 1, deliveryId: 'D0', amount: -50 }],
        charges: [charge(1, '2026-07-01', 900)],
        advances: [{ ...advance, amount: 400, installmentAmount: '400' }],
      }),
    );
    expect(c.transport.taken).toBe(1000);
    expect(c.fertilizer.taken).toBe(0);
    // advances: cap = min(800 left, 50% of 1,850) = 800 → 400 taken
    expect(c.advances.taken).toBe(400);
    expect(c.net).toBe(400);

    // order from settings is honoured
    const reordered = generateSettlement(
      input({
        deliveries: [delivery('D1', '2026-07-10', 10, 0)],
        adjustments: [{ id: 1, deliveryId: 'D0', amount: -50 }],
        charges: [charge(1, '2026-07-01', 900)],
        order: ['fertilizer', 'transport', 'advances'],
      }),
    );
    expect(reordered.fertilizer.taken).toBe(900);
    expect(reordered.transport).toMatchObject({ taken: 900, carriedOut: 100 });
  });

  it('net payable is never below 0; what is not covered is carried forward and listed', () => {
    const c = generateSettlement(
      input({
        deliveries: [delivery('D1', '2026-07-10', 2, 0)], // gross 370
        transportCarriedIn: 0,
        charges: [charge(1, '2026-07-01', 5000)],
        advances: [advance],
      }),
    );
    expect(c.net).toBe(0);
    expect(c.transport).toMatchObject({ taken: 370, carriedOut: 630 });
    expect(c.carriedForward).toBe(630 + 5000 + 50000);
  });
});

describe('runTotals — one object for the Process page and its popup', () => {
  it('sums every estate line', () => {
    const a = generateSettlement(input());
    const b = generateSettlement(
      input({ estate: { ...input().estate, id: 2, selfDelivery: true } }),
    );
    const t = runTotals([a, b]);
    expect(t).toMatchObject({
      estates: 2,
      gross: a.gross + b.gross,
      transport: 1000,
      net: a.net + b.net,
    });
  });
});
