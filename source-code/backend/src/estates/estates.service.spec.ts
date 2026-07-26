import { ConflictException, ForbiddenException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { UsersService } from '../users/users.service';
import type { EstateAdvanceEntity } from './estate-advance.entity';
import type { EstateDocumentEntity } from './estate-document.entity';
import type { EstateOwnerEntity } from './estate-owner.entity';
import type { EstateEntity } from './estate.entity';
import { type Actor, EstatesService } from './estates.service';
import { IssueAdvanceDto } from './dto/issue-advance.dto';
import type { RouteEntity } from './route.entity';
import type { SettlementEntity } from './settlement.entity';

/** Minimal in-memory stand-in for the TypeORM Repository surface the service uses. */
class FakeRepository<T extends { id: string | number }> {
  private readonly store = new Map<string | number, T>();

  seed(record: T): void {
    this.store.set(record.id, record);
  }

  find(): Promise<T[]> {
    return Promise.resolve([...this.store.values()]);
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
    lastUpdatedBy: null,
    lastUpdatedOn: null,
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

function makeSettlement(
  overrides: Partial<SettlementEntity> = {},
): SettlementEntity {
  return {
    id: 'SET-2026-07-001',
    estateId: 1,
    estateName: 'Green Valley Estate',
    period: 'July 2026',
    superKg: '408.00',
    normalKg: '175.00',
    superRate: '185.00',
    normalRate: '95.00',
    transportCost: '8400.00',
    fertilizerDeduction: '22800.00',
    advanceDeduction: '50000.00',
    status: 'pending',
    selfDelivery: false,
    missingBank: false,
    processedBy: null,
    processedOn: null,
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeAdvance(
  overrides: Partial<EstateAdvanceEntity> = {},
): EstateAdvanceEntity {
  return {
    id: 'EADV-2026-0031',
    estateId: 1,
    estateName: 'Green Valley Estate',
    amount: '50000.00',
    reason: 'Pre-season plucking labour costs',
    dateIssued: '2026-07-05',
    issuedBy: 'S. Fernando',
    status: 'pending_deduction',
    createdAt: new Date('2026-07-05T00:00:00.000Z'),
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
  let service: EstatesService;

  const admin: Actor = { name: 'A. Bandara', role: 'Administrator' };
  const officer: Actor = { name: 'S. Fernando', role: 'Officer' };
  const manager: Actor = { name: 'R. Jayasuriya', role: 'Manager' };

  beforeEach(() => {
    estateRepo = new FakeRepository();
    ownerRepo = new FakeRepository();
    documentRepo = new FakeRepository();
    advanceRepo = new FakeRepository();
    settlementRepo = new FakeRepository();
    routeRepo = new FakeRepository();
    ownerRepo.seed(makeOwner());
    routeRepo.seed({ id: 3, factoryId: 1, name: 'Route 3' });

    service = new EstatesService(
      estateRepo as unknown as Repository<EstateEntity>,
      ownerRepo as unknown as Repository<EstateOwnerEntity>,
      documentRepo as unknown as Repository<EstateDocumentEntity>,
      advanceRepo as unknown as Repository<EstateAdvanceEntity>,
      settlementRepo as unknown as Repository<SettlementEntity>,
      routeRepo as unknown as Repository<RouteEntity>,
      {} as UsersService,
    );
  });

  describe('register/deactivate — Administrator only', () => {
    it('rejects Officer on deactivate', async () => {
      estateRepo.seed(makeEstate());
      await expect(service.deactivate('EST-0001', officer)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rejects Manager on deactivate', async () => {
      estateRepo.seed(makeEstate());
      await expect(service.deactivate('EST-0001', manager)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('allows Administrator to deactivate', async () => {
      estateRepo.seed(makeEstate());
      const result = await service.deactivate('EST-0001', admin);
      expect(result.status).toBe('Inactive');
      expect(result.lastUpdatedBy).toBe(admin.name);
    });
  });

  describe('update — Manager read-only', () => {
    it('rejects Manager on update', async () => {
      estateRepo.seed(makeEstate());
      await expect(
        service.update(
          'EST-0001',
          {
            ownerName: 'K. Perera',
            nic: '197845678123',
            contact: '0772345678',
            estateName: 'Green Valley Estate',
            address: 'New address',
            location: 'Nuwara Eliya',
            selfDelivery: false,
            bank: 'Bank of Ceylon',
            branch: 'Nuwara Eliya',
            account: '8802345671',
          },
          manager,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

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
    it('rejects Manager', async () => {
      estateRepo.seed(makeEstate());
      const dto: IssueAdvanceDto = {
        estateId: 'EST-0001',
        amount: 25000,
        reason: 'Fertilizer application labour',
      };
      await expect(service.issueAdvance(dto, manager)).rejects.toThrow(
        ForbiddenException,
      );
    });

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
    });
  });

  describe('processSettlements — missing-bank exclusion (UC-054)', () => {
    it('excludes missing-bank estates and processes the rest', async () => {
      settlementRepo.seed(makeSettlement({ id: 'SET-A', estateId: 1 }));
      settlementRepo.seed(
        makeSettlement({ id: 'SET-B', estateId: 2, missingBank: true }),
      );

      const result = await service.processSettlements(officer);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('SET-A');
      expect(result[0].status).toBe('Processed');
      expect(result[0].processedBy).toBe(officer.name);

      const stillPending = (await settlementRepo.find()).find(
        (s) => s.id === 'SET-B',
      );
      expect(stillPending?.status).toBe('pending');
    });

    it('flips pending advances for processed estates to Deducted', async () => {
      settlementRepo.seed(makeSettlement({ id: 'SET-A', estateId: 1 }));
      advanceRepo.seed(makeAdvance({ id: 'EADV-1', estateId: 1 }));
      advanceRepo.seed(
        makeAdvance({ id: 'EADV-2', estateId: 2, status: 'deducted' }),
      );

      await service.processSettlements(officer);

      const advances = await advanceRepo.find();
      expect(advances.find((a) => a.id === 'EADV-1')?.status).toBe('deducted');
    });

    it('rejects Manager', async () => {
      settlementRepo.seed(makeSettlement());
      await expect(service.processSettlements(manager)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rejects when there is nothing eligible to process', async () => {
      settlementRepo.seed(makeSettlement({ status: 'processed' }));
      settlementRepo.seed(makeSettlement({ id: 'SET-B', missingBank: true }));
      await expect(service.processSettlements(officer)).rejects.toThrow(
        ConflictException,
      );
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
