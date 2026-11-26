import { ConflictException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { GradeRateEntity } from '../admin/grade-rate.entity';
import type { TransportVersion } from '../admin/transport-rules';
import { transportStatus } from '../admin/transport-rules';
import type { AuditService } from '../audit/audit.service';
import { CollectionRecordEntity } from '../collections/collection-record.entity';
import type { DeliveryGradeLineEntity } from '../collections/delivery-grade-line.entity';
import { SettlementAdjustmentEntity } from '../collections/settlement-adjustment.entity';
import { FakeManager, FakeRepo } from '../collections/testing/fake-repo';
import { FertilizerBatchEntity } from '../fertilizer/fertilizer-batch.entity';
import { FertilizerChargeEntity } from '../fertilizer/fertilizer-charge.entity';
import { FertilizerRequestEntity } from '../fertilizer/fertilizer-request.entity';
import { StockMovementEntity } from '../fertilizer/stock-movement.entity';
import { EstateAdvanceRecoveryEntity } from './estate-advance-recovery.entity';
import {
  DEFAULT_ESTATE_ADVANCE_SETTINGS,
  type EstateAdvanceSettingsService,
} from './estate-advance-settings.service';
import { EstateAdvanceEntity } from './estate-advance.entity';
import { EstateOwnerEntity } from './estate-owner.entity';
import { EstateEntity } from './estate.entity';
import { SettlementDeliveryExclusionEntity } from './settlement-delivery-exclusion.entity';
import type { SettlementCalculation } from './settlement-generator';
import { SettlementGeneratorService } from './settlement-generator.service';
import { SettlementEntity } from './settlement.entity';
import type { TransportStatusService } from './transport-status.service';

const officer = { name: 'S. Fernando', role: 'Officer' as const };
const manager = { name: 'R. Jayasuriya', role: 'Manager' as const };

/** After July's grading windows have closed. */
const NOW = new Date('2026-08-05T04:00:00Z');

/** Transport here is a TEST value only — no real monthly charge has been decided. */
const TEST_TRANSPORT: TransportVersion = {
  id: 1,
  effectiveDate: '2026-07-01',
  cancelledAt: null,
  basis: 'fixed_month',
  rate: 1500,
  minimumCharge: 0,
  basisConfirmed: true,
  neverApplied: false,
};

const lines = (superKg: number, normalKg: number) =>
  [
    ...(superKg ? [{ grade: 'super', weightKg: String(superKg) }] : []),
    ...(normalKg ? [{ grade: 'normal', weightKg: String(normalKg) }] : []),
  ] as DeliveryGradeLineEntity[];

function delivery(
  id: string,
  estateId: number,
  date: string,
  superKg: number,
  normalKg: number,
  over: Partial<CollectionRecordEntity> = {},
): CollectionRecordEntity {
  return {
    id,
    estateId,
    collectionDate: date,
    status: 'confirmed',
    lockedAt: new Date(`${date}T10:00:00Z`),
    settlementId: null,
    gradeLines: lines(superKg, normalKg),
    ...over,
  } as CollectionRecordEntity;
}

const estate = (
  id: number,
  name: string,
  over: Partial<EstateEntity> = {},
): EstateEntity =>
  ({
    id,
    ownerId: id,
    name,
    routeName: 'Route 1',
    selfDelivery: false,
    status: 'active',
    paymentMethod: 'bank',
    bankAccount: `88000${id}`,
    ...over,
  }) as EstateEntity;

function build() {
  const em = new FakeManager();
  const repo = <T extends object>(
    target: unknown,
    idKey: string | null = 'id',
  ) => {
    const r = new FakeRepo<T>(idKey as keyof T);
    (r as unknown as { target: unknown }).target = target;
    em.register(target, r as unknown as FakeRepo<object>);
    return r;
  };
  const r = {
    settlements: repo<SettlementEntity>(SettlementEntity, null),
    estates: repo<EstateEntity>(EstateEntity),
    owners: repo<EstateOwnerEntity>(EstateOwnerEntity),
    deliveries: repo<CollectionRecordEntity>(CollectionRecordEntity, null),
    exclusions: repo<SettlementDeliveryExclusionEntity>(
      SettlementDeliveryExclusionEntity,
    ),
    adjustments: repo<SettlementAdjustmentEntity>(SettlementAdjustmentEntity),
    charges: repo<FertilizerChargeEntity>(FertilizerChargeEntity),
    requests: repo<FertilizerRequestEntity>(FertilizerRequestEntity),
    movements: repo<StockMovementEntity>(StockMovementEntity),
    batches: repo<FertilizerBatchEntity>(FertilizerBatchEntity),
    advances: repo<EstateAdvanceEntity>(EstateAdvanceEntity, null),
    recoveries: repo<EstateAdvanceRecoveryEntity>(EstateAdvanceRecoveryEntity),
    rates: repo<GradeRateEntity>(GradeRateEntity, null),
  };
  let versions: TransportVersion[] = [TEST_TRANSPORT];
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const transport = {
    versions: () => Promise.resolve(versions),
    statusFrom: (v: TransportVersion[], m: string) => transportStatus(v, m),
  };
  const asRepo = <T extends object>(x: FakeRepo<T>) =>
    x as unknown as Repository<T>;
  const service = new SettlementGeneratorService(
    asRepo(r.settlements),
    asRepo(r.estates),
    asRepo(r.owners),
    asRepo(r.deliveries),
    asRepo(r.exclusions),
    asRepo(r.adjustments),
    asRepo(r.charges),
    asRepo(r.requests),
    asRepo(r.movements),
    asRepo(r.batches),
    asRepo(r.advances),
    asRepo(r.recoveries),
    asRepo(r.rates),
    transport as unknown as TransportStatusService,
    {
      get: () => Promise.resolve(DEFAULT_ESTATE_ADVANCE_SETTINGS),
    } as unknown as EstateAdvanceSettingsService,
    audit as unknown as AuditService,
  );

  // July 2026, as on the local database: one rate version, Rs. 185 / 95 from 1 July
  r.rates.seed(
    {
      id: 'GR-2',
      effectiveDate: '2026-04-01',
      superRate: '180',
      normalRate: '92',
      cancelledAt: null,
    } as GradeRateEntity,
    {
      id: 'GR-3',
      effectiveDate: '2026-07-01',
      superRate: '185',
      normalRate: '95',
      cancelledAt: null,
    } as GradeRateEntity,
  );
  r.estates.seed(
    estate(1, 'Green Valley Estate'),
    estate(2, 'Hilltop Estate'),
    estate(3, 'Mount Rest Estate', { selfDelivery: true }),
    estate(4, 'Demo Estate', { bankAccount: null }),
  );
  r.owners.seed(
    { id: 1, name: 'Owner GV' } as EstateOwnerEntity,
    { id: 2, name: 'Owner HT' } as EstateOwnerEntity,
    { id: 3, name: 'Owner MR' } as EstateOwnerEntity,
    { id: 4, name: 'Owner D' } as EstateOwnerEntity,
  );
  r.deliveries.seed(
    delivery('GV-0710', 1, '2026-07-10', 200, 40),
    delivery('GV-0714', 1, '2026-07-14', 168, 0),
    delivery('GV-0718', 1, '2026-07-18', 0, 0, {
      status: 'pending_agent_confirmation',
      gradeLines: [],
    }),
    delivery('HT-0716', 2, '2026-07-16', 0, 145),
    delivery('MR-0708', 3, '2026-07-08', 0, 164),
    delivery('D-0702', 4, '2026-07-02', 10, 10),
  );
  r.advances.seed({
    id: 'EADV-GV',
    estateId: 1,
    estateName: 'Green Valley Estate',
    amount: '50000',
    installmentAmount: '50000',
    installmentMonths: 1,
    startPeriod: 'July 2026',
    dateIssued: '2026-06-10',
    status: 'pending_deduction',
  } as EstateAdvanceEntity);
  r.charges.seed(
    {
      estateId: 1,
      totalCharge: '8100',
      quantityKg: '90',
      ratePerKg: '90',
      paymentMethod: null,
      settlementId: null,
      calculatedAt: new Date('2025-09-01T04:00:00Z'),
      fertilizerRequestId: null,
      stockMovementId: null,
    } as FertilizerChargeEntity,
    {
      estateId: 3,
      totalCharge: '10800',
      quantityKg: '120',
      ratePerKg: '90',
      paymentMethod: 'deduct',
      settlementId: null,
      calculatedAt: new Date('2026-06-29T04:00:00Z'),
      fertilizerRequestId: null,
      stockMovementId: null,
    } as FertilizerChargeEntity,
  );
  // the seeded July snapshot: legacy, never touched
  r.settlements.seed({
    id: 'SET-2026-07-001',
    estateId: 1,
    estateName: 'Green Valley Estate',
    period: 'July 2026',
    status: 'legacy',
    legacyReason: 'Seeded snapshot',
    calculation: null,
  } as SettlementEntity);

  return {
    service,
    r,
    audit,
    setVersions: (v: TransportVersion[]) => (versions = v),
  };
}

const calcOf = (s: SettlementEntity) => s.calculation as SettlementCalculation;

describe('SettlementGeneratorService — prepare', () => {
  it('builds one draft per estate with payable deliveries, next to (not over) the legacy row', async () => {
    const { service, r } = build();
    const run = await service.prepare(officer, '2026-07', NOW);
    expect(run.rows.map((x) => [x.estateName, x.settlementId])).toEqual([
      ['Demo Estate', 'SET-2026-07-002'],
      ['Green Valley Estate', 'SET-2026-07-003'],
      ['Hilltop Estate', 'SET-2026-07-004'],
      ['Mount Rest Estate', 'SET-2026-07-005'],
    ]);
    const legacy = r.settlements.rows.find((s) => s.id === 'SET-2026-07-001')!;
    expect(legacy.status).toBe('legacy');
    expect(run.legacy).toHaveLength(1);
    expect(run.prepared).toBe(4);

    const gv = r.settlements.rows.find((s) => s.id === 'SET-2026-07-003')!;
    expect(Number(gv.grossAmount)).toBe(71880);
    expect(calcOf(gv).advances).toMatchObject({
      cap: 35940,
      taken: 35940,
      carried: 14060,
    });
  });

  it('recalculates drafts instead of duplicating them', async () => {
    const { service, r } = build();
    await service.prepare(officer, '2026-07', NOW);
    await service.prepare(officer, '2026-07', NOW);
    expect(r.settlements.rows).toHaveLength(5);
  });

  it('reports why each estate can or cannot be processed', async () => {
    const { service } = build();
    const run = await service.prepare(officer, '2026-07', NOW);
    const why = Object.fromEntries(
      run.rows.map((x) => [x.estateName, x.reasons]),
    );
    expect(why['Green Valley Estate'][0]).toMatch(/not graded yet \(GV-0718\)/);
    expect(why['Demo Estate']).toEqual([
      'Bank payout, but no bank account number is on file.',
    ]);
    expect(why['Hilltop Estate']).toEqual([]);
    expect(why['Mount Rest Estate']).toEqual([]);
    // the popup and the page read the same totals: the ready rows
    expect(run.totals).toMatchObject({
      estates: 2,
      gross: 13775 + 15580,
      transport: 1500,
      fertilizer: 10800,
      advances: 0,
    });
  });
});

describe('SettlementGeneratorService — process', () => {
  it('freezes the ready drafts, links deliveries, recovers fertilizer and writes recoveries', async () => {
    const { service, r } = build();
    await service.prepare(officer, '2026-07', NOW);
    await service.exclude(
      manager,
      'GV-0718',
      '2026-07',
      'Scale fault at intake',
    );
    const run = await service.run('2026-07', NOW);
    const done = await service.process(officer, '2026-07', run.totals.net, NOW);

    expect(done.processed.sort()).toEqual([
      'SET-2026-07-003',
      'SET-2026-07-004',
      'SET-2026-07-005',
    ]);
    const gv = r.settlements.rows.find((s) => s.id === 'SET-2026-07-003')!;
    expect(gv.status).toBe('processed');
    expect(
      r.deliveries.rows.find((d) => d.id === 'GV-0710')!.settlementId,
    ).toBe('SET-2026-07-003');
    expect(
      r.deliveries.rows.find((d) => d.id === 'GV-0718')!.settlementId,
    ).toBeNull();
    // the advance: capped at 50% of gross, the rest carried
    expect(r.recoveries.rows).toEqual([
      expect.objectContaining({
        advanceId: 'EADV-GV',
        settlementId: 'SET-2026-07-003',
        plannedAmount: '50000',
        amount: '35940',
        status: 'recovered',
      }),
    ]);
    expect(r.advances.rows[0].status).toBe('recovering');
    // fertilizer: each charge recovered once, by the settlement that took it
    expect(r.charges.rows.map((c) => c.settlementId)).toEqual([
      'SET-2026-07-003',
      'SET-2026-07-005',
    ]);
    expect(calcOf(gv).fertilizer.lines[0]).toMatchObject({
      checkSeed: true,
      taken: 8100,
    });
    // the bank-less estate stays a draft, with its reason
    const demo = r.settlements.rows.find((s) => s.id === 'SET-2026-07-002')!;
    expect(demo.status).toBe('pending');
    expect(demo.excludedReason).toMatch(/no bank account/);
    // Mount Rest: exempt from transport
    const mr = r.settlements.rows.find((s) => s.id === 'SET-2026-07-005')!;
    expect(mr.transportStatus).toBe('exempt');
    expect(Number(mr.transportCost)).toBe(0);
  });

  it('a later rate change never alters a processed settlement', async () => {
    const { service, r } = build();
    await service.prepare(officer, '2026-07', NOW);
    await service.process(officer, '2026-07', undefined, NOW);
    const ht = r.settlements.rows.find(
      (s) => s.estateId === 2 && s.status === 'processed',
    )!;
    const frozen = JSON.stringify(ht.calculation);
    r.rates.seed({
      id: 'GR-9',
      effectiveDate: '2026-07-01',
      superRate: '300',
      normalRate: '150',
      cancelledAt: null,
    } as GradeRateEntity);
    await service.prepare(officer, '2026-07', NOW);
    expect(JSON.stringify(ht.calculation)).toBe(frozen);
    expect(Number(ht.grossAmount)).toBe(13775);
  });

  it('no transport version for the month blocks every estate that pays transport', async () => {
    const { service, r, setVersions } = build();
    setVersions([]);
    const run = await service.prepare(officer, '2026-07', NOW);
    expect(run.transport.configured).toBe(false);
    expect(
      run.rows.find((x) => x.estateName === 'Hilltop Estate')!.reasons[0],
    ).toMatch(/Transport: not configured/);
    // self-delivery estates are exempt, so Mount Rest alone goes
    const done = await service.process(officer, '2026-07', undefined, NOW);
    expect(done.processed).toEqual(['SET-2026-07-005']);
    expect(
      r.deliveries.rows.find((d) => d.id === 'HT-0716')!.settlementId,
    ).toBeNull();
  });

  it('refuses when the figures moved since the officer reviewed them', async () => {
    const { service, r } = build();
    await service.prepare(officer, '2026-07', NOW);
    await expect(service.process(officer, '2026-07', 1, NOW)).rejects.toThrow(
      /figures changed/,
    );
    expect(r.settlements.rows.every((s) => s.status !== 'processed')).toBe(
      true,
    );
  });

  // who may prepare / process / exclude is the route's permission (write-permissions.spec.ts)
  it('nothing prepared = nothing to process', async () => {
    const { service } = build();
    await expect(
      service.process(officer, '2026-07', undefined, NOW),
    ).rejects.toThrow(ConflictException);
  });
});

describe('SettlementGeneratorService — ungraded, excluded and OPEN deliveries roll on', () => {
  it('excluding a delivery needs a reason', async () => {
    const { service } = build();
    await expect(
      service.exclude(manager, 'GV-0718', '2026-07', ' '),
    ).rejects.toThrow(/reason/);
  });

  it('an excluded delivery is paid next month, at the rate of its own date', async () => {
    const { service, r } = build();
    await service.prepare(officer, '2026-07', NOW);
    await service.exclude(
      manager,
      'GV-0718',
      '2026-07',
      'Scale fault at intake',
    );
    await service.process(officer, '2026-07', undefined, NOW);

    // graded in August
    const late = r.deliveries.rows.find((d) => d.id === 'GV-0718')!;
    late.status = 'confirmed';
    late.gradeLines = lines(40, 0);
    late.lockedAt = new Date('2026-08-03T10:00:00Z');
    r.deliveries.seed(delivery('GV-0805', 1, '2026-08-05', 10, 0));
    const aug = await service.prepare(
      officer,
      '2026-08',
      new Date('2026-09-03T04:00:00Z'),
    );
    const gv = aug.rows.find((x) => x.estateName === 'Green Valley Estate')!;
    expect(
      gv.calc.leaf.map((l) => [l.deliveryId, l.rolledIn, l.superRate]),
    ).toEqual([
      ['GV-0718', true, 185],
      ['GV-0805', false, 185],
    ]);
  });

  it('an OPEN delivery at processing is left out and rolls on by itself', async () => {
    const { service, r } = build();
    r.deliveries.seed(
      delivery('HT-0731', 2, '2026-07-31', 0, 20, {
        lockedAt: new Date('2026-08-05T04:20:00Z'),
      }),
    );
    await service.prepare(officer, '2026-07', NOW);
    await service.process(officer, '2026-07', undefined, NOW);
    expect(
      r.deliveries.rows.find((d) => d.id === 'HT-0731')!.settlementId,
    ).toBeNull();
    expect(r.exclusions.rows).toEqual([
      expect.objectContaining({
        deliveryId: 'HT-0731',
        month: '2026-07',
        auto: true,
      }),
    ]);
  });
});
