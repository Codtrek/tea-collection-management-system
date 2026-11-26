import {
  DEFAULT_ESTATE_ADVANCE_SETTINGS,
  type EstateAdvanceSettingsService,
} from './estate-advance-settings.service';
import { ConflictException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { CollectionRecordEntity } from '../collections/collection-record.entity';
import type { SettlementAdjustmentEntity } from '../collections/settlement-adjustment.entity';
import type { UsersService } from '../users/users.service';
import type { EstateAdvanceEntity } from './estate-advance.entity';
import type { EstateDocumentEntity } from './estate-document.entity';
import type { EstateOwnerEntity } from './estate-owner.entity';
import type { EstateEntity } from './estate.entity';
import { type Actor, EstatesService } from './estates.service';
import type { TransportStatusService } from './transport-status.service';
import type { TransportVersion } from '../admin/transport-rules';
import { IssueAdvanceDto } from './dto/issue-advance.dto';
import type { RouteEntity } from './route.entity';
import type { SettlementEntity } from './settlement.entity';
import type { EstateAdvanceRecoveryEntity } from './estate-advance-recovery.entity';

/** Minimal in-memory stand-in for the TypeORM Repository surface the service uses. */
class FakeRepository<T extends { id: string | number }> {
  private readonly store = new Map<string | number, T>();

  seed(record: T): void {
    this.store.set(record.id, record);
  }

  find(opts?: { where?: Partial<T> }): Promise<T[]> {
    const where = opts?.where;
    return Promise.resolve(
      [...this.store.values()].filter(
        (r) =>
          !where ||
          (Object.entries(where) as [keyof T, unknown][]).every(
            ([k, v]) => r[k] === v,
          ),
      ),
    );
  }

  findOne({ where }: { where: Partial<T> }): Promise<T | null> {
    const [key, value] = Object.entries(where)[0] as [keyof T, unknown];
    return Promise.resolve(
      [...this.store.values()].find((r) => r[key] === value) ?? null,
    );
  }

  create(partial: Partial<T>): T {
    return partial as T;
  }

  save(record: T): Promise<T> {
    // a SERIAL id, like the DB, for rows created without one
    if (record.id === undefined) {
      (record as { id: number }).id = this.store.size + 1000;
    }
    this.store.set(record.id, record);
    return Promise.resolve(record);
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
    paymentMethod: 'bank',
    lastUpdatedBy: null,
    lastUpdatedOn: null,
    lat: null,
    lng: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeOwner(
  overrides: Partial<EstateOwnerEntity> = {},
): EstateOwnerEntity {
  return {
    id: 1,
    userId: 1,
    name: 'K. Perera',
    nic: '197845678123',
    contact: '0772345678',
    email: 'kperera@gmail.com',
    ...overrides,
  };
}

describe('EstatesService', () => {
  let estateRepo: FakeRepository<EstateEntity>;
  let ownerRepo: FakeRepository<EstateOwnerEntity>;
  let documentRepo: FakeRepository<EstateDocumentEntity>;
  let advanceRepo: FakeRepository<EstateAdvanceEntity>;
  let settlementRepo: FakeRepository<SettlementEntity>;
  let routeRepo: FakeRepository<RouteEntity>;
  let collectionRepo: FakeRepository<CollectionRecordEntity>;
  let adjustmentRepo: FakeRepository<SettlementAdjustmentEntity>;
  let recoveryRepo: FakeRepository<EstateAdvanceRecoveryEntity>;
  let service: EstatesService;

  const admin: Actor = { name: 'A. Bandara', role: 'Administrator' };
  const officer: Actor = { name: 'S. Fernando', role: 'Officer' };
  // one monthly transport charge covering every month unless a test changes it
  const monthly = (o: Partial<TransportVersion> = {}): TransportVersion => ({
    id: 1,
    effectiveDate: '2019-01-01',
    basis: 'fixed_month',
    rate: 5000,
    minimumCharge: 0,
    basisConfirmed: true,
    neverApplied: false,
    cancelledAt: null,
    ...o,
  });
  let transportVersions: TransportVersion[];

  beforeEach(() => {
    transportVersions = [monthly()];
    estateRepo = new FakeRepository();
    ownerRepo = new FakeRepository();
    documentRepo = new FakeRepository();
    advanceRepo = new FakeRepository();
    settlementRepo = new FakeRepository();
    routeRepo = new FakeRepository();
    collectionRepo = new FakeRepository();
    adjustmentRepo = new FakeRepository();
    recoveryRepo = new FakeRepository();
    ownerRepo.seed(makeOwner());
    routeRepo.seed({ id: 3, factoryId: 1, name: 'Route 3' });

    service = new EstatesService(
      estateRepo as unknown as Repository<EstateEntity>,
      ownerRepo as unknown as Repository<EstateOwnerEntity>,
      documentRepo as unknown as Repository<EstateDocumentEntity>,
      advanceRepo as unknown as Repository<EstateAdvanceEntity>,
      settlementRepo as unknown as Repository<SettlementEntity>,
      routeRepo as unknown as Repository<RouteEntity>,
      collectionRepo as unknown as Repository<CollectionRecordEntity>,
      adjustmentRepo as unknown as Repository<SettlementAdjustmentEntity>,
      recoveryRepo as unknown as Repository<EstateAdvanceRecoveryEntity>,
      {} as UsersService,
      {
        record: jest.fn().mockResolvedValue(undefined),
      } as unknown as import('../audit/audit.service').AuditService,
      {
        get: () => Promise.resolve(DEFAULT_ESTATE_ADVANCE_SETTINGS),
      } as unknown as EstateAdvanceSettingsService,
      // transport configured, so these tests exercise the rest of processing; the
      // not-configured block has its own test below
      {
        versions: () => Promise.resolve(transportVersions),
      } as unknown as TransportStatusService,
    );
  });

  describe('register/deactivate — Administrator only', () => {
    it('allows Administrator to deactivate', async () => {
      estateRepo.seed(makeEstate());
      const result = await service.deactivate('EST-0001', admin);
      expect(result.status).toBe('Inactive');
      expect(result.lastUpdatedBy).toBe(admin.name);
    });
  });

  describe('update — Manager read-only', () => {
    it('allows Officer to edit, and route stays untouched', async () => {
      estateRepo.seed(makeEstate());
      const result = await service.update(
        'EST-0001',
        {
          ownerName: 'K. Perera',
          nic: '197845678123',
          contact: '0772345678',
          estateName: 'Green Valley Estate',
          address: 'New address',
          location: 'Nuwara Eliya',
          selfDelivery: true,
          bank: 'Bank of Ceylon',
          branch: 'Nuwara Eliya',
          account: '8802345671',
        },
        officer,
      );
      expect(result.address).toBe('New address');
      expect(result.selfDelivery).toBe(true);
      expect(result.route).toBe('Route 3');
      expect(result.lastUpdatedBy).toBe(officer.name);
    });
  });

  describe('issueAdvance — Manager read-only', () => {
    it('allows Officer and stamps issuedBy', async () => {
      estateRepo.seed(makeEstate());
      const dto: IssueAdvanceDto = {
        estateId: 'EST-0001',
        amount: 25000,
        reason: 'Fertilizer application labour',
      };
      const result = await service.issueAdvance(dto, officer);
      expect(result.amount).toBe(25000);
      expect(result.issuedBy).toBe(officer.name);
      expect(result.status).toBe('Pending deduction');
      expect(result.estateId).toBe('EST-0001');
      const [saved] = await advanceRepo.find();
      // default plan: one deduction
      expect([saved.installmentAmount, saved.installmentMonths]).toEqual([
        '25000',
        1,
      ]);
    });

    it('refuses an inactive estate', async () => {
      estateRepo.seed(makeEstate({ status: 'inactive' }));
      await expect(
        service.issueAdvance(
          { estateId: 'EST-0001', amount: 25000, reason: 'x' },
          officer,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('stores an installment plan and validates it against the max months', async () => {
      estateRepo.seed(makeEstate());
      await service.issueAdvance(
        {
          estateId: 'EST-0001',
          amount: 50000,
          reason: 'x',
          installmentAmount: 10000,
          startMonth: '2099-12',
        },
        officer,
      );
      const [saved] = await advanceRepo.find();
      expect([
        saved.installmentAmount,
        saved.installmentMonths,
        saved.startPeriod,
      ]).toEqual(['10000', 5, 'December 2099']);
      await expect(
        service.issueAdvance(
          {
            estateId: 'EST-0001',
            amount: 50000,
            reason: 'x',
            installmentAmount: 5000,
          },
          officer,
        ),
      ).rejects.toThrow('That plan runs 10 months — the most allowed is 6.');
      await expect(
        service.issueAdvance(
          {
            estateId: 'EST-0001',
            amount: 50000,
            reason: 'x',
            installmentAmount: 60000,
          },
          officer,
        ),
      ).rejects.toThrow('The installment can’t be more than the advance.');
    });
  });

  describe('not found', () => {
    it('rejects an unknown estate id', async () => {
      await expect(service.findById('EST-9999')).rejects.toThrow();
    });

    it('rejects a malformed estate id', async () => {
      await expect(service.findById('nope')).rejects.toThrow();
    });
  });
});
