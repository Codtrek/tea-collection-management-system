import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { AgentDirectoryService } from '../dispatch/agent-directory.service';
import type { DispatchNotifier } from '../dispatch/dispatch-notifier.service';
import type { RouteResolverService } from '../dispatch/route-resolver.service';
import type { EstateEntity } from '../estates/estate.entity';
import { gradedTotalKg, weightSummary } from './collection-map';
import type { CollectionRecordEntity } from './collection-record.entity';
import { type Actor, CollectionsService } from './collections.service';
import type { DeliveryGradeLineEntity } from './delivery-grade-line.entity';
import { CreateExceptionDto } from './dto/create-exception.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';

function makeRecord(
  overrides: Partial<CollectionRecordEntity> = {},
): CollectionRecordEntity {
  return {
    id: 'GV-2026-0001',
    estateId: null,
    estateRef: null,
    estateName: 'Green Valley Estate',
    routeId: null,
    routeName: 'Route 3',
    weightKg: '150.00',
    gradeLines: [],
    status: 'collected',
    collectionDate: '2026-07-20',
    agentId: null,
    agentName: 'R. Senanayake',
    photos: [],
    timeline: [
      {
        status: 'Collected',
        timestamp: '2026-07-20T08:00:00.000Z',
        by: 'R. Senanayake',
      },
    ],
    provisional: null,
    mismatch: null,
    gradedAt: null,
    lockedAt: null,
    finalizedAt: null,
    settlementId: null,
    lastUpdatedBy: null,
    lastUpdatedOn: null,
    createdAt: new Date('2026-07-20T00:00:00.000Z'),
    ...overrides,
  };
}

function line(grade: 'super' | 'normal', weightKg: string): DeliveryGradeLineEntity {
  return { grade, weightKg } as DeliveryGradeLineEntity;
}

function makeEstate(overrides: Partial<EstateEntity> = {}): EstateEntity {
  return {
    id: 1,
    ownerId: 1,
    name: 'Green Valley Estate',
    location: 'Nuwara Eliya',
    address: null,
    routeId: 5,
    routeName: 'Route 3',
    selfDelivery: false,
    status: 'active',
    ytdDeliveriesKg: '0.00',
    bankName: null,
    bankBranch: null,
    bankAccount: null,
    lastUpdatedBy: null,
    lastUpdatedOn: null,
    registeredOn: '2021-03-01',
    lat: null,
    lng: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

/** Minimal in-memory stand-in for the TypeORM Repository surface the service uses. */
class FakeRepository<T extends { id: string | number }> {
  readonly store = new Map<string | number, T>();
  private nextId = 1;

  seed(record: T): void {
    this.store.set(record.id, record);
  }

  find(): Promise<T[]> {
    return Promise.resolve([...this.store.values()]);
  }

  findOne({ where }: { where: Partial<T> }): Promise<T | null> {
    const [[key, value]] = Object.entries(where) as [keyof T, unknown][];
    return Promise.resolve(
      [...this.store.values()].find((r) => r[key] === value) ?? null,
    );
  }

  create(partial: Partial<T>): T {
    return partial as T;
  }

  save(record: T): Promise<T> {
    if (record.id === undefined) {
      (record as { id: number }).id = this.nextId++;
    }
    this.store.set(record.id, record);
    return Promise.resolve(record);
  }
}

describe('CollectionsService', () => {
  let repo: FakeRepository<CollectionRecordEntity>;
  let estates: FakeRepository<EstateEntity>;
  let resolver: { getAgentForRoute: jest.Mock };
  let notifier: { notifyAgent: jest.Mock };
  let service: CollectionsService;

  const officer: Actor = { name: 'S. Fernando', role: 'Officer', sub: 7 };
  const manager: Actor = { name: 'R. Jayasuriya', role: 'Manager', sub: 8 };

  beforeEach(() => {
    repo = new FakeRepository<CollectionRecordEntity>();
    estates = new FakeRepository<EstateEntity>();
    resolver = { getAgentForRoute: jest.fn().mockResolvedValue(null) };
    notifier = { notifyAgent: jest.fn().mockResolvedValue(undefined) };
    service = new CollectionsService(
      repo as unknown as Repository<CollectionRecordEntity>,
      {
        record: jest.fn().mockResolvedValue(undefined),
      } as unknown as import('../audit/audit.service').AuditService,
      resolver as unknown as RouteResolverService,
      {
        names: jest.fn().mockResolvedValue(
          new Map([
            [1, 'R. Senanayake'],
            [2, 'W. Gunaratne'],
          ]),
        ),
      } as unknown as AgentDirectoryService,
      notifier as unknown as DispatchNotifier,
      estates as unknown as Repository<EstateEntity>,
    );
  });

  describe('update — lock rule (§7.1)', () => {
    it('rejects edits to a Confirmed record', async () => {
      repo.seed(makeRecord({ status: 'confirmed' }));
      const dto: UpdateCollectionDto = { weightKg: 200, date: '2026-07-21' };
      await expect(
        service.update('GV-2026-0001', dto, officer),
      ).rejects.toThrow(ConflictException);
    });

    it('allows edits to a non-Confirmed record', async () => {
      repo.seed(makeRecord({ status: 'collected' }));
      const dto: UpdateCollectionDto = { weightKg: 200, date: '2026-07-21' };
      const result = await service.update('GV-2026-0001', dto, officer);
      expect(result.weightKg).toBe(200);
      expect(result.status).toBe('Collected');
      expect(result.lastUpdatedBy).toBe(officer.name);
    });

    it('edits the ESTATE weight only — grade lines are untouched', async () => {
      repo.seed(
        makeRecord({ status: 'collected', gradeLines: [line('super', '150.00')] }),
      );
      const result = await service.update(
        'GV-2026-0001',
        { weightKg: 160, date: '2026-07-21' },
        officer,
      );
      expect(result.estateWeightKg).toBe(160);
      expect(result.gradeLines).toEqual([{ grade: 'Super', weightKg: 150 }]);
    });
  });

  describe('Manager write access — read-only', () => {
    it('rejects Manager on update', async () => {
      repo.seed(makeRecord({ status: 'collected' }));
      const dto: UpdateCollectionDto = { weightKg: 100, date: '2026-07-21' };
      await expect(
        service.update('GV-2026-0001', dto, manager),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects Manager on createException', async () => {
      const dto: CreateExceptionDto = {
        estateId: 1,
        reportedWeight: 175,
        date: '2026-07-21',
        reason: 'Phone-arranged pickup',
      };
      await expect(service.createException(dto, manager)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('createException — estate-first provisional record (§7.1)', () => {
    const dto: CreateExceptionDto = {
      estateId: 1,
      reportedWeight: 175,
      date: '2026-07-21',
      reason: 'Phone-arranged pickup — owner called the factory directly.',
    };

    it('derives route + today’s agent from the estate and notifies that agent', async () => {
      estates.seed(makeEstate());
      resolver.getAgentForRoute.mockResolvedValue({
        agentId: 1,
        assignmentId: 10,
        type: 'PERMANENT',
        covering: false,
      });

      const result = await service.createException(dto, officer);

      expect(resolver.getAgentForRoute).toHaveBeenCalledWith(5, '2026-07-21');
      expect(result.status).toBe('Pending Agent Confirmation');
      expect(result.graded).toBe(false);
      expect(result.gradeLines).toEqual([]);
      expect(result.weightKg).toBe(175);
      expect(result.route).toBe('Route 3');
      expect(result.agent).toBe('R. Senanayake');
      expect(result.estateId).toBe('EST-0001');
      expect(result.provisional).toEqual({
        reportedBy: officer.name,
        reason: dto.reason,
      });
      expect(notifier.notifyAgent).toHaveBeenCalledWith(1, expect.anything());
    });

    it('routes to the COVER agent when a cover is active', async () => {
      estates.seed(makeEstate());
      resolver.getAgentForRoute.mockResolvedValue({
        agentId: 2,
        assignmentId: 11,
        type: 'COVER',
        covering: true,
      });
      const result = await service.createException(dto, officer);
      expect(result.agent).toBe('W. Gunaratne');
      expect(notifier.notifyAgent).toHaveBeenCalledWith(2, expect.anything());
    });

    it('still logs the entry as Unassigned when nobody covers the route', async () => {
      estates.seed(makeEstate());
      const result = await service.createException(dto, officer);
      expect(result.agent).toBe('Unassigned');
      expect(notifier.notifyAgent).not.toHaveBeenCalled();
    });

    it('rejects an unknown or inactive estate and one with no route', async () => {
      await expect(service.createException(dto, officer)).rejects.toThrow(
        NotFoundException,
      );
      estates.seed(makeEstate({ status: 'inactive' }));
      await expect(service.createException(dto, officer)).rejects.toThrow(
        BadRequestException,
      );
      estates.seed(makeEstate({ status: 'active', routeId: null }));
      await expect(service.createException(dto, officer)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('read-time agent resolution', () => {
    it('shows the route’s CURRENT agent on uncollected records, the stamped agent once collected', async () => {
      resolver.getAgentForRoute.mockResolvedValue({
        agentId: 2,
        assignmentId: 11,
        type: 'COVER',
        covering: true,
      });
      repo.seed(
        makeRecord({
          id: 'P-1',
          routeId: 5,
          status: 'approved',
          agentName: 'R. Senanayake',
        }),
      );
      repo.seed(
        makeRecord({
          id: 'C-1',
          routeId: 5,
          status: 'collected',
          agentName: 'R. Senanayake',
        }),
      );
      const all = await service.findAll();
      expect(all.find((r) => r.id === 'P-1')?.agent).toBe('W. Gunaratne');
      expect(all.find((r) => r.id === 'C-1')?.agent).toBe('R. Senanayake');
    });

    it('leaves self-delivered records alone', async () => {
      resolver.getAgentForRoute.mockResolvedValue({
        agentId: 2,
        assignmentId: 11,
        type: 'COVER',
        covering: true,
      });
      repo.seed(
        makeRecord({
          id: 'S-1',
          routeId: 5,
          status: 'approved',
          agentName: 'Self-delivered',
        }),
      );
      expect((await service.findById('S-1')).agent).toBe('Self-delivered');
    });
  });

  describe('grade lines — total = Σ lines (grading itself lives in grading.service.spec.ts)', () => {
    it('is Ungraded (estate weight shown) until lines exist', async () => {
      repo.seed(makeRecord({ status: 'collected', weightKg: '150.00' }));
      const r = await service.findById('GV-2026-0001');
      expect(r.graded).toBe(false);
      expect(r.weightKg).toBe(150);
      expect(r.estateWeightKg).toBe(150);
      expect(r.gradingState).toBeUndefined();
    });

    it('weightSummary / gradedTotalKg are the single source of the total', () => {
      const rec = makeRecord({
        weightKg: '999.00',
        gradeLines: [line('super', '32.00'), line('normal', '12.50')],
      });
      expect(gradedTotalKg(rec)).toBe(44.5);
      expect(weightSummary(rec).weightKg).toBe(44.5);
      expect(weightSummary(rec).estateWeightKg).toBe(999);
      expect(weightSummary(makeRecord({ weightKg: '80.00' })).weightKg).toBe(80);
    });
  });

  describe('grading state is surfaced on every record', () => {
    it('open inside the window, locked after it, settled once paid; legacy confirmed rows are locked', async () => {
      const future = new Date(Date.now() + 10 * 60_000);
      const past = new Date(Date.now() - 10 * 60_000);
      repo.seed(makeRecord({ id: 'O', status: 'confirmed', lockedAt: future }));
      repo.seed(makeRecord({ id: 'L', status: 'confirmed', lockedAt: past }));
      repo.seed(makeRecord({ id: 'S', status: 'confirmed', lockedAt: past, settlementId: 'SET-1' }));
      repo.seed(makeRecord({ id: 'G', status: 'confirmed', lockedAt: null }));
      const all = await service.findAll();
      const state = (id: string) => all.find((r) => r.id === id)?.gradingState;
      expect(state('O')).toBe('open');
      expect(state('L')).toBe('locked');
      expect(state('S')).toBe('settled');
      expect(state('G')).toBe('locked');
      expect(all.find((r) => r.id === 'S')?.settlementId).toBe('SET-1');
    });
  });

  describe('not found', () => {
    it('rejects an unknown id', async () => {
      await expect(service.findById('NOPE')).rejects.toThrow();
    });
  });
});
