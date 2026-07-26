import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { CollectionRecordEntity } from './collection-record.entity';
import { type Actor, CollectionsService } from './collections.service';
import { CreateExceptionDto } from './dto/create-exception.dto';
import { FlagCollectionDto } from './dto/flag-collection.dto';
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
    grade: 'pending',
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

/** Minimal in-memory stand-in for the TypeORM Repository surface the service uses. */
class FakeRepository {
  private readonly store = new Map<string, CollectionRecordEntity>();

  seed(record: CollectionRecordEntity): void {
    this.store.set(record.id, record);
  }

  find(): Promise<CollectionRecordEntity[]> {
    return Promise.resolve([...this.store.values()]);
  }

  findOne({
    where: { id },
  }: {
    where: { id: string };
  }): Promise<CollectionRecordEntity | null> {
    return Promise.resolve(this.store.get(id) ?? null);
  }

  create(partial: Partial<CollectionRecordEntity>): CollectionRecordEntity {
    return partial as CollectionRecordEntity;
  }

  save(record: CollectionRecordEntity): Promise<CollectionRecordEntity> {
    this.store.set(record.id, record);
    return Promise.resolve(record);
  }
}

describe('CollectionsService', () => {
  let repo: FakeRepository;
  let service: CollectionsService;

  const officer: Actor = { name: 'S. Fernando', role: 'Officer' };
  const manager: Actor = { name: 'R. Jayasuriya', role: 'Manager' };

  beforeEach(() => {
    repo = new FakeRepository();
    service = new CollectionsService(
      repo as unknown as Repository<CollectionRecordEntity>,
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
  });

  describe('update — grade gate', () => {
    it('rejects changing the grade before status is Collected', async () => {
      repo.seed(makeRecord({ status: 'agent_assigned', grade: 'pending' }));
      const dto: UpdateCollectionDto = {
        weightKg: 100,
        date: '2026-07-21',
        grade: 'Super',
      };
      await expect(
        service.update('GV-2026-0001', dto, officer),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows setting the grade once status is Collected', async () => {
      repo.seed(makeRecord({ status: 'collected', grade: 'pending' }));
      const dto: UpdateCollectionDto = {
        weightKg: 100,
        date: '2026-07-21',
        grade: 'Super',
      };
      const result = await service.update('GV-2026-0001', dto, officer);
      expect(result.grade).toBe('Super');
    });

    it('does not reject resubmitting the unchanged grade regardless of status', async () => {
      repo.seed(makeRecord({ status: 'submitted', grade: 'pending' }));
      const dto: UpdateCollectionDto = {
        weightKg: 100,
        date: '2026-07-21',
        grade: 'Pending',
      };
      const result = await service.update('GV-2026-0001', dto, officer);
      expect(result.grade).toBe('Pending');
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
        estateId: 'EST-0001',
        estateName: 'Green Valley Estate',
        route: 'Route 3',
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
  });

  describe('createException — provisional record (§7.1)', () => {
    it('creates a Pending Agent Confirmation record, never an authoritative weight', async () => {
      const dto: CreateExceptionDto = {
        estateId: 'EST-0001',
        estateName: 'Green Valley Estate',
        route: 'Route 3',
        agent: 'R. Senanayake',
        reportedWeight: 175,
        date: '2026-07-21',
        reason: 'Phone-arranged pickup — owner called the factory directly.',
      };
      const result = await service.createException(dto, officer);

      expect(result.status).toBe('Pending Agent Confirmation');
      expect(result.grade).toBe('Pending');
      expect(result.weightKg).toBe(175);
      expect(result.photos).toEqual([]);
      expect(result.provisional).toEqual({
        reportedBy: officer.name,
        reason: dto.reason,
      });
      expect(result.estateId).toBe('EST-0001');
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
