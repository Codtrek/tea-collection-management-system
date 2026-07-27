import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { EstateEntity } from '../estates/estate.entity';
import type { CreateBatchDto } from './dto/create-batch.dto';
import type { FertilizerBatchEntity } from './fertilizer-batch.entity';
import type { FertilizerRequestEntity } from './fertilizer-request.entity';
import { type Actor, FertilizerService } from './fertilizer.service';
import type { StockMovementEntity } from './stock-movement.entity';

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
    // Mirrors what a real INSERT ... RETURNING does for `@CreateDateColumn` —
    // populated on first save, never overwritten after.
    const withCreatedAt = { createdAt: new Date(), ...record } as T;
    this.store.set(withCreatedAt.id, withCreatedAt);
    return Promise.resolve(withCreatedAt);
  }
}

// A window comfortably in the future relative to "today" wherever this runs.
const FAR_FUTURE = '2099-01-01';
const PAST = '2020-01-01';

function makeBatch(
  overrides: Partial<FertilizerBatchEntity> = {},
): FertilizerBatchEntity {
  return {
    id: 1,
    item: 'Urea Fertilizer',
    category: 'Fertilizer',
    quantityKg: '700.00',
    unit: 'kg',
    receivedDate: '2026-06-01',
    expiryDate: FAR_FUTURE,
    location: 'Warehouse A',
    supplier: 'CIC Agri Businesses',
    lotNumber: 'LOT-U-4471',
    qualityNotes: null,
    discarded: false,
    lastUpdatedBy: null,
    lastUpdatedOn: null,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    ...overrides,
  };
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
    justification: 'Top dressing.',
    factoryId: null,
    origin: 'web',
    status: 'Submitted',
    approvedQtyKg: null,
    dispatchedQtyKg: '0.00',
    decidedBy: null,
    decidedOn: null,
    createdAt: new Date('2026-07-10T00:00:00.000Z'),
    ...overrides,
  };
}

function makeMovement(
  overrides: Partial<StockMovementEntity> = {},
): StockMovementEntity {
  return {
    id: 1,
    batchId: 1,
    type: 'Incoming',
    quantityKg: '700.00',
    movementDate: '2026-06-01',
    destination: null,
    linkedRequestId: null,
    supplier: 'CIC Agri Businesses',
    notes: null,
    recordedBy: 'S. Fernando',
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeEstate(overrides: Partial<EstateEntity> = {}): EstateEntity {
  return {
    id: 1,
    ownerId: 1,
    name: 'Green Valley Estate',
    location: 'Nuwara Eliya',
    address: null,
    routeId: null,
    routeName: null,
    selfDelivery: false,
    status: 'active',
    ytdDeliveriesKg: '0.00',
    bankName: null,
    bankBranch: null,
    bankAccount: null,
    lastUpdatedBy: null,
    lastUpdatedOn: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

const validBatchDto: CreateBatchDto = {
  item: 'TSP',
  category: 'Fertilizer',
  quantityKg: 500,
  unit: 'kg',
  receivedDate: '2026-06-01',
  expiryDate: FAR_FUTURE,
  supplier: 'Hayleys Agriculture',
  lotNumber: 'LOT-T-1',
};

describe('FertilizerService', () => {
  let batchRepo: FakeRepository<FertilizerBatchEntity>;
  let movementRepo: FakeRepository<StockMovementEntity>;
  let requestRepo: FakeRepository<FertilizerRequestEntity>;
  let estateRepo: FakeRepository<EstateEntity>;
  let service: FertilizerService;

  const admin: Actor = { name: 'A. Bandara', role: 'Administrator' };
  const officer: Actor = { name: 'S. Fernando', role: 'Officer' };
  const manager: Actor = { name: 'R. Jayasuriya', role: 'Manager' };

  beforeEach(() => {
    batchRepo = new FakeRepository();
    movementRepo = new FakeRepository();
    requestRepo = new FakeRepository();
    estateRepo = new FakeRepository();

    service = new FertilizerService(
      batchRepo as unknown as Repository<FertilizerBatchEntity>,
      movementRepo as unknown as Repository<StockMovementEntity>,
      requestRepo as unknown as Repository<FertilizerRequestEntity>,
      estateRepo as unknown as Repository<EstateEntity>,
    );
  });

  describe('listPositions — the stock arithmetic', () => {
    it('excludes Submitted requests from committed, but counts them as pending demand', async () => {
      batchRepo.seed(makeBatch({ quantityKg: '700.00' }));
      requestRepo.seed(
        makeRequest({ id: 1, status: 'Submitted', quantityKg: '300.00' }),
      );

      const [position] = await service.listPositions();
      expect(position.committed).toBe(0);
      expect(position.pendingDemand).toBe(300);
      expect(position.available).toBe(700);
    });

    it('counts Approved and Partially Dispatched requests as committed', async () => {
      batchRepo.seed(makeBatch({ quantityKg: '700.00' }));
      requestRepo.seed(
        makeRequest({
          id: 1,
          status: 'Approved',
          quantityKg: '400.00',
          approvedQtyKg: '400.00',
        }),
      );
      requestRepo.seed(
        makeRequest({
          id: 2,
          status: 'Partially Dispatched',
          quantityKg: '400.00',
          approvedQtyKg: '400.00',
          dispatchedQtyKg: '100.00',
        }),
      );

      const [position] = await service.listPositions();
      // remainders: 400 + (400-100) = 700
      expect(position.committed).toBe(700);
      expect(position.available).toBe(0);
    });

    it('goes negative on over-commitment — the whole point of the position table', async () => {
      batchRepo.seed(makeBatch({ quantityKg: '500.00' }));
      requestRepo.seed(
        makeRequest({
          id: 1,
          status: 'Approved',
          quantityKg: '700.00',
          approvedQtyKg: '700.00',
        }),
      );

      const [position] = await service.listPositions();
      expect(position.available).toBe(-200);
      expect(position.status).toBe('Short');
    });

    it('excludes expired batches from on-hand', async () => {
      batchRepo.seed(
        makeBatch({ id: 1, quantityKg: '500.00', expiryDate: FAR_FUTURE }),
      );
      batchRepo.seed(
        makeBatch({ id: 2, quantityKg: '120.00', expiryDate: PAST }),
      );

      const [position] = await service.listPositions();
      expect(position.onHand).toBe(500);
    });

    it('excludes discarded batches from on-hand', async () => {
      batchRepo.seed(makeBatch({ id: 1, quantityKg: '500.00' }));
      batchRepo.seed(
        makeBatch({ id: 2, quantityKg: '300.00', discarded: true }),
      );

      const [position] = await service.listPositions();
      expect(position.onHand).toBe(500);
    });
  });

  describe('listMovements', () => {
    it('formats the batch id and omits linkedRequest for an ad-hoc movement', async () => {
      batchRepo.seed(makeBatch({ id: 1 }));
      movementRepo.seed(makeMovement({ id: 1, batchId: 1 }));

      const [movement] = await service.listMovements();
      expect(movement.batchId).toBe('FB-0001');
      expect(movement.linkedRequest).toBeUndefined();
    });

    it('formats linkedRequest when a movement is tied to a request', async () => {
      batchRepo.seed(makeBatch({ id: 1 }));
      requestRepo.seed(makeRequest({ id: 5 }));
      movementRepo.seed(
        makeMovement({ id: 1, batchId: 1, linkedRequestId: 5 }),
      );

      const [movement] = await service.listMovements();
      expect(movement.linkedRequest).toMatch(/^FR-2026-/);
    });
  });

  describe('logRequest', () => {
    it('rejects Manager', async () => {
      estateRepo.seed(makeEstate());
      await expect(
        service.logRequest(
          { estateId: 'EST-0001', item: 'Urea Fertilizer', quantityKg: 200 },
          manager,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects an unknown estate', async () => {
      await expect(
        service.logRequest(
          { estateId: 'EST-9999', item: 'Urea Fertilizer', quantityKg: 200 },
          officer,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates a Submitted, web-origin request for Officer', async () => {
      estateRepo.seed(makeEstate());
      const result = await service.logRequest(
        {
          estateId: 'EST-0001',
          item: 'Urea Fertilizer',
          quantityKg: 200,
          reason: 'Phoned in',
        },
        officer,
      );
      expect(result.status).toBe('Submitted');
      expect(result.origin).toBe('web');
      expect(result.estateName).toBe('Green Valley Estate');
      expect(result.quantityKg).toBe(200);
    });
  });

  describe('decideRequest — Administrator only', () => {
    it('rejects Officer', async () => {
      estateRepo.seed(makeEstate());
      requestRepo.seed(makeRequest());
      await expect(
        service.decideRequest('FR-2026-0001', { decision: 'approve' }, officer),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows Administrator to approve in full', async () => {
      estateRepo.seed(makeEstate());
      requestRepo.seed(makeRequest({ quantityKg: '400.00' }));
      const result = await service.decideRequest(
        'FR-2026-0001',
        { decision: 'approve' },
        admin,
      );
      expect(result.status).toBe('Approved');
      expect(result.approvedQtyKg).toBe(400);
      expect(result.decidedBy).toBe(admin.name);
    });

    it('allows a partial approval', async () => {
      estateRepo.seed(makeEstate());
      requestRepo.seed(makeRequest({ quantityKg: '400.00' }));
      const result = await service.decideRequest(
        'FR-2026-0001',
        { decision: 'approve', approvedQtyKg: 250 },
        admin,
      );
      expect(result.approvedQtyKg).toBe(250);
    });

    it('rejects approving more than the requested quantity', async () => {
      estateRepo.seed(makeEstate());
      requestRepo.seed(makeRequest({ quantityKg: '400.00' }));
      await expect(
        service.decideRequest(
          'FR-2026-0001',
          { decision: 'approve', approvedQtyKg: 500 },
          admin,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects deciding an already-decided request', async () => {
      estateRepo.seed(makeEstate());
      requestRepo.seed(
        makeRequest({ status: 'Approved', approvedQtyKg: '400.00' }),
      );
      await expect(
        service.decideRequest('FR-2026-0001', { decision: 'reject' }, admin),
      ).rejects.toThrow(ConflictException);
    });

    it('cancel is terminal, same as reject', async () => {
      estateRepo.seed(makeEstate());
      requestRepo.seed(makeRequest());
      const result = await service.decideRequest(
        'FR-2026-0001',
        { decision: 'cancel' },
        admin,
      );
      expect(result.status).toBe('Cancelled');
    });
  });

  describe('recordMovement — Incoming', () => {
    it('rejects Manager', async () => {
      await expect(
        service.recordMovement(
          {
            type: 'Incoming',
            quantityKg: 100,
            date: '2026-07-01',
            ...validBatchDto,
          },
          manager,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('restocks an existing batch, adding to its quantity', async () => {
      batchRepo.seed(makeBatch({ quantityKg: '700.00' }));
      await service.recordMovement(
        {
          type: 'Incoming',
          batchId: 'FB-0001',
          quantityKg: 300,
          date: '2026-07-01',
        },
        officer,
      );
      const [batch] = await batchRepo.find();
      expect(Number(batch.quantityKg)).toBe(1000);
    });

    it('creates a new batch when no batchId is given', async () => {
      const movement = await service.recordMovement(
        {
          type: 'Incoming',
          quantityKg: 500,
          date: '2026-06-01',
          item: 'TSP',
          category: 'Fertilizer',
          unit: 'kg',
          expiryDate: FAR_FUTURE,
          supplier: 'Hayleys Agriculture',
          lotNumber: 'LOT-T-1',
        },
        officer,
      );
      const batches = await batchRepo.find();
      expect(batches).toHaveLength(1);
      expect(batches[0].item).toBe('TSP');
      expect(Number(batches[0].quantityKg)).toBe(500);
      expect(movement.batchId).toMatch(/^FB-/);
    });

    it('rejects restocking a discarded batch', async () => {
      batchRepo.seed(makeBatch({ discarded: true }));
      await expect(
        service.recordMovement(
          {
            type: 'Incoming',
            batchId: 'FB-0001',
            quantityKg: 100,
            date: '2026-07-01',
          },
          officer,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('recordMovement — Outgoing', () => {
    it('rejects a movement with no existing batch', async () => {
      await expect(
        service.recordMovement(
          {
            type: 'Outgoing',
            quantityKg: 100,
            date: '2026-07-01',
            destination: 'Green Valley Estate',
          },
          officer,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects a movement with no destination', async () => {
      batchRepo.seed(makeBatch({ quantityKg: '700.00' }));
      await expect(
        service.recordMovement(
          {
            type: 'Outgoing',
            batchId: 'FB-0001',
            quantityKg: 100,
            date: '2026-07-01',
          },
          officer,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects exceeding the batch quantity', async () => {
      batchRepo.seed(makeBatch({ quantityKg: '100.00' }));
      await expect(
        service.recordMovement(
          {
            type: 'Outgoing',
            batchId: 'FB-0001',
            quantityKg: 200,
            date: '2026-07-01',
            destination: 'Green Valley Estate',
          },
          officer,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('allows an ad-hoc dispatch with no linked request', async () => {
      batchRepo.seed(makeBatch({ quantityKg: '700.00' }));
      const movement = await service.recordMovement(
        {
          type: 'Outgoing',
          batchId: 'FB-0001',
          quantityKg: 120,
          date: '2026-07-01',
          destination: 'Mount Rest Estate',
        },
        officer,
      );
      expect(movement.linkedRequest).toBeUndefined();
      const [batch] = await batchRepo.find();
      expect(Number(batch.quantityKg)).toBe(580);
    });

    it('advances dispatchedQtyKg and flips Approved -> Partially Dispatched', async () => {
      batchRepo.seed(makeBatch({ quantityKg: '700.00' }));
      requestRepo.seed(
        makeRequest({
          status: 'Approved',
          quantityKg: '400.00',
          approvedQtyKg: '400.00',
        }),
      );

      await service.recordMovement(
        {
          type: 'Outgoing',
          batchId: 'FB-0001',
          quantityKg: 150,
          date: '2026-07-01',
          destination: 'Green Valley Estate',
          linkedRequest: 'FR-2026-0001',
        },
        officer,
      );

      const [request] = await requestRepo.find();
      expect(request.status).toBe('Partially Dispatched');
      expect(Number(request.dispatchedQtyKg)).toBe(150);
    });

    it('flips to Dispatched once the full approved quantity is dispatched', async () => {
      batchRepo.seed(makeBatch({ quantityKg: '700.00' }));
      requestRepo.seed(
        makeRequest({
          status: 'Approved',
          quantityKg: '400.00',
          approvedQtyKg: '400.00',
        }),
      );

      await service.recordMovement(
        {
          type: 'Outgoing',
          batchId: 'FB-0001',
          quantityKg: 400,
          date: '2026-07-01',
          destination: 'Green Valley Estate',
          linkedRequest: 'FR-2026-0001',
        },
        officer,
      );

      const [request] = await requestRepo.find();
      expect(request.status).toBe('Dispatched');
    });

    it('rejects dispatching more than the approved remainder', async () => {
      batchRepo.seed(makeBatch({ quantityKg: '700.00' }));
      requestRepo.seed(
        makeRequest({
          status: 'Approved',
          quantityKg: '400.00',
          approvedQtyKg: '400.00',
        }),
      );

      await expect(
        service.recordMovement(
          {
            type: 'Outgoing',
            batchId: 'FB-0001',
            quantityKg: 500,
            date: '2026-07-01',
            destination: 'Green Valley Estate',
            linkedRequest: 'FR-2026-0001',
          },
          officer,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects linking to a Submitted (not yet approved) request', async () => {
      batchRepo.seed(makeBatch({ quantityKg: '700.00' }));
      requestRepo.seed(
        makeRequest({ status: 'Submitted', quantityKg: '400.00' }),
      );

      await expect(
        service.recordMovement(
          {
            type: 'Outgoing',
            batchId: 'FB-0001',
            quantityKg: 100,
            date: '2026-07-01',
            destination: 'Green Valley Estate',
            linkedRequest: 'FR-2026-0001',
          },
          officer,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('discardBatch', () => {
    it('rejects Manager', async () => {
      batchRepo.seed(makeBatch());
      await expect(service.discardBatch('FB-0001', manager)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('marks the batch discarded and removes it from on-hand', async () => {
      batchRepo.seed(makeBatch({ quantityKg: '700.00' }));
      const result = await service.discardBatch('FB-0001', officer);
      expect(result.discarded).toBe(true);

      const [position] = await service.listPositions();
      expect(position.onHand).toBe(0);
    });
  });

  describe('not found', () => {
    it('rejects an unknown batch id', async () => {
      await expect(service.getBatch('FB-9999')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects a malformed batch id', async () => {
      await expect(service.getBatch('nope')).rejects.toThrow(NotFoundException);
    });
  });
});
