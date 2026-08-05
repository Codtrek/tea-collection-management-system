import type { Repository } from 'typeorm';
import type { AuditLogEntity } from '../audit/audit-log.entity';
import type { CollectionRecordEntity } from '../collections/collection-record.entity';
import type { FertilizerChargeEntity } from '../fertilizer/fertilizer-charge.entity';
import type { FertilizerRequestEntity } from '../fertilizer/fertilizer-request.entity';
import type { EstateAdvanceEntity } from './estate-advance.entity';
import { EstateLifetimeService } from './estate-lifetime.service';
import type { EstateEntity } from './estate.entity';
import type { SettlementEntity } from './settlement.entity';

/** In-memory stand-in supporting multi-field `where` filtering, since the
 * service queries on more than one column at once (e.g. estateId + status). */
class FakeRepository<T extends { id: string | number }> {
  private readonly store = new Map<string | number, T>();

  seed(record: T): void {
    this.store.set(record.id, record);
  }

  find(opts?: { where?: Partial<T> }): Promise<T[]> {
    const rows = [...this.store.values()];
    if (!opts?.where) return Promise.resolve(rows);
    const entries = Object.entries(opts.where) as [keyof T, unknown][];
    return Promise.resolve(
      rows.filter((r) => entries.every(([k, v]) => r[k] === v)),
    );
  }

  findOne({ where }: { where: Partial<T> }): Promise<T | null> {
    const [key, value] = Object.entries(where)[0] as [keyof T, unknown];
    return Promise.resolve(
      [...this.store.values()].find((r) => r[key] === value) ?? null,
    );
  }
}

function makeEstate(overrides: Partial<EstateEntity> = {}): EstateEntity {
  return {
    id: 1,
    ownerId: 1,
    name: 'Green Valley Estate',
    location: 'Nuwara Eliya',
    address: 'Kandapola Rd',
    routeId: 3,
    routeName: 'Route 3',
    selfDelivery: false,
    status: 'active',
    ytdDeliveriesKg: '12480.00',
    bankName: 'Bank of Ceylon',
    bankBranch: 'Nuwara Eliya',
    bankAccount: '8802345671',
    lastUpdatedBy: null,
    lastUpdatedOn: null,
    registeredOn: '2021-03-01',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeCollection(
  overrides: Partial<CollectionRecordEntity> = {},
): CollectionRecordEntity {
  return {
    id: 'GV-2026-0714',
    estateId: 1,
    estateRef: null,
    estateName: 'Green Valley Estate',
    routeId: 3,
    routeName: 'Route 3',
    weightKg: '210.00',
    grade: 'super',
    status: 'confirmed',
    collectionDate: '2026-07-14',
    agentId: 1,
    agentName: 'R. Senanayake',
    photos: [],
    timeline: [],
    provisional: null,
    mismatch: null,
    lastUpdatedBy: null,
    lastUpdatedOn: null,
    createdAt: new Date('2026-07-14T00:00:00.000Z'),
    ...overrides,
  } as CollectionRecordEntity;
}

function makeSettlement(
  overrides: Partial<SettlementEntity> = {},
): SettlementEntity {
  return {
    id: 'SET-2026-07-001',
    estateId: 1,
    estateName: 'Green Valley Estate',
    period: 'July 2026',
    superKg: '400.00',
    normalKg: '100.00',
    superRate: '185.00',
    normalRate: '95.00',
    transportCost: '8000.00',
    fertilizerDeduction: '20000.00',
    advanceDeduction: '0.00',
    status: 'processed',
    selfDelivery: false,
    missingBank: false,
    processedBy: 'A. Bandara',
    processedOn: new Date('2026-07-15T00:00:00.000Z'),
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    ...overrides,
  } as SettlementEntity;
}

function makeAdvance(overrides: Partial<EstateAdvanceEntity> = {}): EstateAdvanceEntity {
  return {
    id: 'EADV-2026-0001',
    estateId: 1,
    estateName: 'Green Valley Estate',
    amount: '50000.00',
    reason: 'Pre-season labour',
    dateIssued: '2026-06-01',
    issuedBy: 'S. Fernando',
    status: 'pending_deduction',
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    ...overrides,
  } as EstateAdvanceEntity;
}

function makeCharge(
  overrides: Partial<FertilizerChargeEntity> = {},
): FertilizerChargeEntity {
  return {
    id: 1,
    stockMovementId: 1,
    estateId: 1,
    fertilizerRequestId: null,
    ratePerKg: '95.00',
    quantityKg: '50.00',
    totalCharge: '4750.00',
    settlementId: null,
    calculatedAt: new Date('2026-07-10T00:00:00.000Z'),
    ...overrides,
  } as FertilizerChargeEntity;
}

function makeRequest(
  overrides: Partial<FertilizerRequestEntity> = {},
): FertilizerRequestEntity {
  return {
    id: 1,
    requestedBy: null,
    estateId: 1,
    ownerId: 1,
    item: 'Urea Fertilizer',
    quantityKg: '400.00',
    justification: null,
    factoryId: null,
    origin: 'web',
    status: 'Dispatched',
    approvedQtyKg: '400.00',
    dispatchedQtyKg: '400.00',
    decidedBy: 'A. Bandara',
    decidedOn: new Date('2026-07-05T00:00:00.000Z'),
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    ...overrides,
  } as FertilizerRequestEntity;
}

function makeAudit(overrides: Partial<AuditLogEntity> = {}): AuditLogEntity {
  return {
    id: 'AUD-00001',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    userId: 1,
    userName: 'A. Bandara',
    role: 'Administrator',
    action: 'Registered estate',
    module: 'Estate Owner',
    record: 'EST-0001',
    recordHref: null,
    details: null,
    ...overrides,
  } as AuditLogEntity;
}

function build() {
  const estateRepo = new FakeRepository<EstateEntity>();
  const collectionRepo = new FakeRepository<CollectionRecordEntity>();
  const settlementRepo = new FakeRepository<SettlementEntity>();
  const advanceRepo = new FakeRepository<EstateAdvanceEntity>();
  const requestRepo = new FakeRepository<FertilizerRequestEntity>();
  const chargeRepo = new FakeRepository<FertilizerChargeEntity>();
  const auditRepo = new FakeRepository<AuditLogEntity>();

  const service = new EstateLifetimeService(
    estateRepo as unknown as Repository<EstateEntity>,
    collectionRepo as unknown as Repository<CollectionRecordEntity>,
    settlementRepo as unknown as Repository<SettlementEntity>,
    advanceRepo as unknown as Repository<EstateAdvanceEntity>,
    requestRepo as unknown as Repository<FertilizerRequestEntity>,
    chargeRepo as unknown as Repository<FertilizerChargeEntity>,
    auditRepo as unknown as Repository<AuditLogEntity>,
  );

  return { service, estateRepo, collectionRepo, settlementRepo, advanceRepo, requestRepo, chargeRepo, auditRepo };
}

describe('EstateLifetimeService — lifetime() (§3 shared selector)', () => {
  it('counts only Confirmed deliveries toward deliveredKg and grade split', async () => {
    const { service, estateRepo, collectionRepo } = build();
    estateRepo.seed(makeEstate());
    collectionRepo.seed(makeCollection({ id: 'A', status: 'confirmed', grade: 'super', weightKg: '100.00' }));
    collectionRepo.seed(makeCollection({ id: 'B', status: 'confirmed', grade: 'normal', weightKg: '50.00' }));
    collectionRepo.seed(makeCollection({ id: 'C', status: 'pending_agent_confirmation', weightKg: '999.00' }));

    const result = await service.lifetime('EST-0001');
    expect(result.lifetime.deliveredKg).toBe(150);
    expect(result.lifetime.gradeSuperPct).toBeCloseTo((100 / 150) * 100, 1);
  });

  it('counts only processed settlements toward earnedRs, as gross revenue', async () => {
    const { service, estateRepo, settlementRepo } = build();
    estateRepo.seed(makeEstate());
    settlementRepo.seed(
      makeSettlement({ id: 'A', status: 'processed', superKg: '100.00', superRate: '185.00', normalKg: '0.00', normalRate: '95.00' }),
    );
    settlementRepo.seed(makeSettlement({ id: 'B', status: 'pending', superKg: '9999.00' }));

    const result = await service.lifetime('EST-0001');
    expect(result.lifetime.earnedRs).toBe(18500);
  });

  it('outstanding = charges not yet linked to a settlement; recovered charges are excluded', async () => {
    const { service, estateRepo, chargeRepo } = build();
    estateRepo.seed(makeEstate());
    chargeRepo.seed(makeCharge({ id: 1, totalCharge: '4750.00', settlementId: null }));
    chargeRepo.seed(makeCharge({ id: 2, totalCharge: '9500.00', settlementId: 'SET-2026-06-001' }));

    const result = await service.lifetime('EST-0001');
    expect(result.outstanding.fertilizerUndeductedRs).toBe(4750);
    expect(result.outstanding.undeductedDispatchCount).toBe(1);
    expect(result.lifetime.fertilizerRs).toBe(14250); // both charges count toward lifetime taken
  });

  it('a brand-new owner with no history returns Rs. 0, never a crash or NaN', async () => {
    const { service, estateRepo } = build();
    // "Registered today" — computed from wall-clock so this isn't tied to a
    // fixed date; tenureMonths must be 0 regardless of when the suite runs.
    estateRepo.seed(makeEstate({ id: 2, registeredOn: new Date().toISOString().slice(0, 10) }));

    const result = await service.lifetime('EST-0002');
    expect(result.lifetime.deliveredKg).toBe(0);
    expect(result.lifetime.earnedRs).toBe(0);
    expect(result.outstanding.fertilizerUndeductedRs).toBe(0);
    expect(result.outstanding.lastSettlementRs).toBeNull();
    expect(result.tenureMonths).toBe(0);
  });

  it('disputes roll up mismatch-flagged Confirmed records; resolved is honestly 0 (no resolution tracking exists)', async () => {
    const { service, estateRepo, collectionRepo } = build();
    estateRepo.seed(makeEstate());
    collectionRepo.seed(
      makeCollection({ id: 'A', status: 'confirmed', mismatch: { complaintId: 'C-1', note: 'weight mismatch' } }),
    );
    collectionRepo.seed(makeCollection({ id: 'B', status: 'confirmed', mismatch: null }));

    const result = await service.lifetime('EST-0001');
    expect(result.disputes.total).toBe(1);
    expect(result.disputes.open).toBe(1);
    expect(result.disputes.resolved).toBe(0);
  });

  it('routeHistory has exactly one entry spanning the whole tenure (route reassignment does not exist)', async () => {
    const { service, estateRepo } = build();
    estateRepo.seed(makeEstate({ routeName: 'Route 3', registeredOn: '2019-03-01' }));

    const result = await service.lifetime('EST-0001');
    expect(result.routeHistory).toHaveLength(1);
    expect(result.routeHistory[0]).toMatchObject({ route: 'Route 3', from: '2019-03-01', to: null });
  });

  it('throws NotFoundException for an unknown estate id', async () => {
    const { service } = build();
    await expect(service.lifetime('EST-9999')).rejects.toThrow();
  });
});

describe('EstateLifetimeService — timeline() (§5 EST-10)', () => {
  it('always ends the feed with a synthetic Registered entry', async () => {
    const { service, estateRepo } = build();
    estateRepo.seed(makeEstate({ registeredOn: '2019-03-01' }));

    const result = await service.timeline('EST-0001', {});
    const last = result.entries[result.entries.length - 1];
    expect(last.type).toBe('Registered');
    expect(new Date(last.date).getFullYear()).toBe(2019);
  });

  it('merges Delivery/Settlement/Advance/Fertilizer entries newest-first', async () => {
    const { service, estateRepo, collectionRepo, settlementRepo, advanceRepo, chargeRepo } = build();
    estateRepo.seed(makeEstate({ registeredOn: '2019-03-01' }));
    collectionRepo.seed(makeCollection({ id: 'A', collectionDate: '2026-01-01' }));
    settlementRepo.seed(makeSettlement({ id: 'B', processedOn: new Date('2026-03-01T00:00:00.000Z') }));
    advanceRepo.seed(makeAdvance({ id: 'C', dateIssued: '2026-02-01' }));
    chargeRepo.seed(makeCharge({ id: 1, calculatedAt: new Date('2026-04-01T00:00:00.000Z') }));

    const result = await service.timeline('EST-0001', { limit: 10 });
    const types = result.entries.map((e) => e.type);
    // newest (Apr fertilizer) first, then Mar settlement, then Feb advance, then Jan delivery, then Registered last
    expect(types).toEqual(['Fertilizer', 'Settlement', 'Advance', 'Delivery', 'Registered']);
  });

  it('only includes Account entries from audit_logs that match this estate\'s formatted id', async () => {
    const { service, estateRepo, auditRepo } = build();
    estateRepo.seed(makeEstate({ id: 1, registeredOn: '2019-03-01' }));
    auditRepo.seed(makeAudit({ id: 'AUD-1', record: 'EST-0001', action: 'Updated estate details' }));
    auditRepo.seed(makeAudit({ id: 'AUD-2', record: 'EST-0002', action: 'Updated estate details' })); // different estate

    const result = await service.timeline('EST-0001', { limit: 50 });
    const accountEntries = result.entries.filter((e) => e.type === 'Account');
    expect(accountEntries).toHaveLength(1);
  });

  it('filters by type', async () => {
    const { service, estateRepo, collectionRepo, advanceRepo } = build();
    estateRepo.seed(makeEstate({ registeredOn: '2019-03-01' }));
    collectionRepo.seed(makeCollection({ id: 'A', collectionDate: '2026-01-01' }));
    advanceRepo.seed(makeAdvance({ id: 'B', dateIssued: '2026-02-01' }));

    const result = await service.timeline('EST-0001', { type: 'Delivery', limit: 50 });
    expect(result.entries.every((e) => e.type === 'Delivery')).toBe(true);
  });

  it('paginates — a long feed loads one page, not everything', async () => {
    const { service, estateRepo, collectionRepo } = build();
    estateRepo.seed(makeEstate({ registeredOn: '2019-03-01' }));
    for (let i = 0; i < 40; i++) {
      collectionRepo.seed(
        makeCollection({ id: `D-${i}`, collectionDate: `2026-01-${String((i % 28) + 1).padStart(2, '0')}` }),
      );
    }

    const page0 = await service.timeline('EST-0001', { limit: 25, page: 0 });
    expect(page0.entries).toHaveLength(25);
    expect(page0.hasMore).toBe(true);
  });
});

describe('EstateLifetimeService — per-estate paginated lists (§7)', () => {
  it('deliveries: defaults to the last 90 days when no range is given', async () => {
    const { service, estateRepo, collectionRepo } = build();
    estateRepo.seed(makeEstate());
    collectionRepo.seed(makeCollection({ id: 'recent', collectionDate: new Date().toISOString().slice(0, 10) }));
    collectionRepo.seed(makeCollection({ id: 'old', collectionDate: '2020-01-01' }));

    const result = await service.deliveries('EST-0001', {});
    expect(result.rows.map((r) => r.id)).toEqual(['recent']);
  });

  it('an explicit date range overrides the 90-day default', async () => {
    const { service, estateRepo, collectionRepo } = build();
    estateRepo.seed(makeEstate());
    collectionRepo.seed(makeCollection({ id: 'old', collectionDate: '2020-01-01' }));

    const result = await service.deliveries('EST-0001', { from: '2019-01-01', to: '2021-01-01' });
    expect(result.rows.map((r) => r.id)).toEqual(['old']);
  });

  it('payments/advances return the same Public* shapes the global list endpoints use', async () => {
    const { service, estateRepo, settlementRepo, advanceRepo } = build();
    estateRepo.seed(makeEstate());
    settlementRepo.seed(makeSettlement({ id: 'SET-1', processedOn: new Date() }));
    advanceRepo.seed(makeAdvance({ id: 'EADV-1', dateIssued: new Date().toISOString().slice(0, 10) }));

    const payments = await service.payments('EST-0001', {});
    const advances = await service.advancesFor('EST-0001', {});
    expect(payments.rows[0]).toMatchObject({ id: 'SET-1', status: 'Processed' });
    expect(advances.rows[0]).toMatchObject({ id: 'EADV-1' });
  });
});
