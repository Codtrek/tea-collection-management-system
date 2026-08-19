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
import type { ComplaintEntity } from './complaint.entity';
import type { DeliveryGradeLineEntity } from './delivery-grade-line.entity';
import { CreateExceptionDto } from './dto/create-exception.dto';
import { FlagCollectionDto } from './dto/flag-collection.dto';
import { SetGradeLinesDto } from './dto/set-grade-lines.dto';
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
  let complaints: FakeRepository<ComplaintEntity>;
  let resolver: { getAgentForRoute: jest.Mock };
  let notifier: { notifyAgent: jest.Mock };
  let service: CollectionsService;

  const officer: Actor = { name: 'S. Fernando', role: 'Officer', sub: 7 };
  const manager: Actor = { name: 'R. Jayasuriya', role: 'Manager', sub: 8 };

  beforeEach(() => {
    repo = new FakeRepository<CollectionRecordEntity>();
    estates = new FakeRepository<EstateEntity>();
    complaints = new FakeRepository<ComplaintEntity>();
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
      complaints as unknown as Repository<ComplaintEntity>,
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

    it('rejects Manager on flag', async () => {
      repo.seed(makeRecord({ status: 'confirmed' }));
      const dto: FlagCollectionDto = { reason: 'Weight looks wrong' };
      await expect(service.flag('GV-2026-0001', dto, manager)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rejects Manager on grading', async () => {
      repo.seed(makeRecord({ status: 'collected' }));
      const dto: SetGradeLinesDto = {
        lines: [{ grade: 'Super', weightKg: 150 }],
      };
      await expect(
        service.setGradeLines('GV-2026-0001', dto, manager),
      ).rejects.toThrow(ForbiddenException);
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

  describe('grade lines — factory-side, total = Σ lines', () => {
    it('is Ungraded (estate weight shown) until lines exist', async () => {
      repo.seed(makeRecord({ status: 'collected', weightKg: '150.00' }));
      const r = await service.findById('GV-2026-0001');
      expect(r.graded).toBe(false);
      expect(r.weightKg).toBe(150);
      expect(r.estateWeightKg).toBe(150);
    });

    it('grades into multiple lines: total is the sum, estate weight is preserved, record confirms', async () => {
      repo.seed(makeRecord({ status: 'collected', weightKg: '150.00' }));
      const result = await service.setGradeLines(
        'GV-2026-0001',
        {
          lines: [
            { grade: 'Super', weightKg: 100 },
            { grade: 'Normal', weightKg: 50 },
          ],
        },
        officer,
      );
      expect(result.graded).toBe(true);
      expect(result.weightKg).toBe(150);
      expect(result.estateWeightKg).toBe(150);
      expect(result.gradeLines).toEqual([
        { grade: 'Super', weightKg: 100 },
        { grade: 'Normal', weightKg: 50 },
      ]);
      expect(result.status).toBe('Confirmed');
      expect(result.mismatch).toBeUndefined();
    });

    it('rejects two lines for the same grade (409)', async () => {
      repo.seed(makeRecord({ status: 'collected' }));
      await expect(
        service.setGradeLines(
          'GV-2026-0001',
          {
            lines: [
              { grade: 'Super', weightKg: 100 },
              { grade: 'Super', weightKg: 50 },
            ],
          },
          officer,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('only grades a Collected record; Confirmed is locked', async () => {
      const dto: SetGradeLinesDto = { lines: [{ grade: 'Super', weightKg: 150 }] };
      repo.seed(makeRecord({ id: 'A', status: 'approved' }));
      await expect(service.setGradeLines('A', dto, officer)).rejects.toThrow(
        BadRequestException,
      );
      repo.seed(makeRecord({ id: 'B', status: 'confirmed' }));
      await expect(service.setGradeLines('B', dto, officer)).rejects.toThrow(
        ConflictException,
      );
    });

    it('regrading a collected record updates lines in place and drops missing grades', async () => {
      const existingSuper = line('super', '90.00');
      const existingNormal = line('normal', '60.00');
      repo.seed(
        makeRecord({
          status: 'collected',
          weightKg: '150.00',
          gradeLines: [existingSuper, existingNormal],
        }),
      );
      const result = await service.setGradeLines(
        'GV-2026-0001',
        { lines: [{ grade: 'Super', weightKg: 150 }] },
        officer,
      );
      expect(result.gradeLines).toEqual([{ grade: 'Super', weightKg: 150 }]);
      // the Super row was reused, not recreated
      const saved = repo.store.get('GV-2026-0001')!;
      expect(saved.gradeLines).toHaveLength(1);
      expect(saved.gradeLines[0]).toBe(existingSuper);
    });

    it('raises a weight-mismatch complaint when graded total strays beyond the threshold', async () => {
      repo.seed(makeRecord({ status: 'collected', weightKg: '150.00' }));
      const result = await service.setGradeLines(
        'GV-2026-0001',
        { lines: [{ grade: 'Super', weightKg: 120 }] },
        officer,
      );
      expect(result.mismatch?.complaintId).toBe('C-1');
      expect(result.mismatch?.note).toContain('150');
      expect(result.mismatch?.note).toContain('120');
      expect([...complaints.store.values()][0]).toMatchObject({
        type: 'weight_mismatch',
        raisedByUserId: 7,
        collectionRecordId: 'GV-2026-0001',
      });
    });

    it('does not complain for a small difference', async () => {
      repo.seed(makeRecord({ status: 'collected', weightKg: '150.00' }));
      const result = await service.setGradeLines(
        'GV-2026-0001',
        { lines: [{ grade: 'Super', weightKg: 147 }] },
        officer,
      );
      expect(result.mismatch).toBeUndefined();
      expect(complaints.store.size).toBe(0);
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

  describe('flag — Confirmed records only', () => {
    it('rejects flagging a record that is not Confirmed', async () => {
      repo.seed(makeRecord({ status: 'collected' }));
      const dto: FlagCollectionDto = { reason: 'Weight looks wrong' };
      await expect(service.flag('GV-2026-0001', dto, officer)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('appends a correction-request entry to the timeline for a Confirmed record', async () => {
      repo.seed(
        makeRecord({
          status: 'confirmed',
          timeline: [
            {
              status: 'Confirmed',
              timestamp: '2026-07-20T11:00:00.000Z',
              by: 'R. Jayasuriya',
            },
          ],
        }),
      );
      const dto: FlagCollectionDto = { reason: 'Weight looks wrong' };
      const result = await service.flag('GV-2026-0001', dto, officer);

      expect(result.timeline).toHaveLength(2);
      expect(result.timeline[1].status).toBe('Confirmed');
      expect(result.timeline[1].by).toContain('correction requested');
    });
  });

  describe('not found', () => {
    it('rejects an unknown id', async () => {
      await expect(service.findById('NOPE')).rejects.toThrow();
    });
  });
});
