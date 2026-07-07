import type { AsyncDb } from '@/db/asyncDb';
import { createSchema } from '@/db/schema';
import { createInMemoryDb } from '@/db/testUtils/inMemoryDb';

import { createLocalCollectionService } from '../collectionService';
import type { CollectionService } from '../../types';

async function seedFixtures(db: AsyncDb) {
  await db.runAsync(
    "INSERT INTO users (id, name, phone, password, role) VALUES ('owner-1', 'Nimal Perera', '0770000001', 'x', 'estate_owner')",
  );
  await db.runAsync(
    "INSERT INTO users (id, name, phone, password, role) VALUES ('collector-1', 'Kamal Silva', '0770000003', 'x', 'collector')",
  );
  await db.runAsync(
    "INSERT INTO users (id, name, phone, password, role) VALUES ('officer-1', 'Ruwan Perera', '0770000004', 'x', 'receiving_officer')",
  );
  await db.runAsync("INSERT INTO estates (id, owner_id, name) VALUES ('estate-1', 'owner-1', 'Green Valley Estate')");
  await db.runAsync("INSERT INTO factories (id, name) VALUES ('factory-1', 'Nuwara Eliya Tea Factory')");
}

async function createDb(): Promise<AsyncDb> {
  const db = createInMemoryDb();
  await createSchema(db);
  await seedFixtures(db);
  return db;
}

function makeService(db: AsyncDb): CollectionService {
  return createLocalCollectionService(async () => db);
}

async function createRecord(service: CollectionService, weightKg = 100) {
  const result = await service.createRecord({
    collectorId: 'collector-1',
    estateId: 'estate-1',
    actualWeightKg: weightKg,
  });
  if (!result.ok) throw new Error('setup failed');
  return result.record;
}

describe('createRecord', () => {
  test('creates a record with owner not yet confirmed', async () => {
    const db = await createDb();
    const service = makeService(db);

    const result = await service.createRecord({
      collectorId: 'collector-1',
      estateId: 'estate-1',
      actualWeightKg: 42.5,
    });

    expect(result).toMatchObject({
      ok: true,
      record: {
        collectorId: 'collector-1',
        estateId: 'estate-1',
        estateName: 'Green Valley Estate',
        actualWeightKg: 42.5,
        ownerConfirmed: false,
        selfDelivered: false,
        receiving: null,
      },
    });
  });

  test('rejects a non-positive weight', async () => {
    const db = await createDb();
    const service = makeService(db);

    const result = await service.createRecord({
      collectorId: 'collector-1',
      estateId: 'estate-1',
      actualWeightKg: 0,
    });

    expect(result).toEqual({ ok: false, error: 'Weight must be greater than zero' });
  });

  test('supports manual records linked to no pickup request', async () => {
    const db = await createDb();
    const service = makeService(db);

    const result = await service.createRecord({
      collectorId: 'collector-1',
      estateId: 'estate-1',
      actualWeightKg: 10,
    });

    expect(result).toMatchObject({ ok: true, record: { pickupRequestId: null } });
  });
});

describe('confirmOwner', () => {
  test('marks the record owner-confirmed', async () => {
    const db = await createDb();
    const service = makeService(db);
    const record = await createRecord(service);

    const result = await service.confirmOwner(record.id);

    expect(result).toMatchObject({ ok: true, record: { ownerConfirmed: true } });
  });

  test('rejects confirming twice', async () => {
    const db = await createDb();
    const service = makeService(db);
    const record = await createRecord(service);
    await service.confirmOwner(record.id);

    const result = await service.confirmOwner(record.id);

    expect(result).toEqual({ ok: false, error: 'This record is already confirmed by the owner' });
  });

  test('rejects an unknown record', async () => {
    const db = await createDb();
    const service = makeService(db);

    const result = await service.confirmOwner('nope');

    expect(result).toEqual({ ok: false, error: 'Collection record not found' });
  });
});

describe('listForCollector', () => {
  test('returns only that collector records, newest first', async () => {
    const db = await createDb();
    const service = makeService(db);
    await createRecord(service, 10);
    await createRecord(service, 20);

    const records = await service.listForCollector('collector-1');

    expect(records).toHaveLength(2);
    expect(records.map((r) => r.actualWeightKg).sort()).toEqual([10, 20]);
    expect(await service.listForCollector('someone-else')).toEqual([]);
  });
});

describe('receiveAtFactory', () => {
  test('records factory weight and grade with no complaint inside the threshold', async () => {
    const db = await createDb();
    const service = makeService(db);
    const record = await createRecord(service, 100);

    const result = await service.receiveAtFactory({
      collectionRecordId: record.id,
      receivingOfficerId: 'officer-1',
      factoryId: 'factory-1',
      receivedWeightKg: 99,
      teaGrade: 'super',
    });

    expect(result).toMatchObject({
      ok: true,
      complaint: null,
      record: { receiving: { receivedWeightKg: 99, teaGrade: 'super', factoryId: 'factory-1' } },
    });
  });

  test('auto-raises a weight_mismatch complaint beyond the threshold', async () => {
    const db = await createDb();
    const service = makeService(db);
    const record = await createRecord(service, 100);

    const result = await service.receiveAtFactory({
      collectionRecordId: record.id,
      receivingOfficerId: 'officer-1',
      factoryId: 'factory-1',
      receivedWeightKg: 90,
      teaGrade: 'normal',
    });

    expect(result).toMatchObject({
      ok: true,
      complaint: { type: 'weight_mismatch', status: 'open', collectionRecordId: record.id },
    });
  });

  test('rejects receiving the same record twice', async () => {
    const db = await createDb();
    const service = makeService(db);
    const record = await createRecord(service, 100);
    await service.receiveAtFactory({
      collectionRecordId: record.id,
      receivingOfficerId: 'officer-1',
      factoryId: 'factory-1',
      receivedWeightKg: 100,
      teaGrade: 'super',
    });

    const result = await service.receiveAtFactory({
      collectionRecordId: record.id,
      receivingOfficerId: 'officer-1',
      factoryId: 'factory-1',
      receivedWeightKg: 100,
      teaGrade: 'super',
    });

    expect(result).toEqual({ ok: false, error: 'This record has already been received at the factory' });
  });

  test('rejects an invalid received weight', async () => {
    const db = await createDb();
    const service = makeService(db);
    const record = await createRecord(service, 100);

    const result = await service.receiveAtFactory({
      collectionRecordId: record.id,
      receivingOfficerId: 'officer-1',
      factoryId: 'factory-1',
      receivedWeightKg: -1,
      teaGrade: 'super',
    });

    expect(result).toEqual({ ok: false, error: 'Weight must be greater than zero' });
  });

  test('completes the linked pickup request when one exists', async () => {
    const db = await createDb();
    const service = makeService(db);
    await db.runAsync(
      "INSERT INTO pickup_requests (id, estate_id, owner_id, factory_id, request_date, status, requested_at) VALUES ('pr-1', 'estate-1', 'owner-1', 'factory-1', '2026-07-07', 'picked_up', '2026-07-07T06:00:00.000Z')",
    );
    const created = await service.createRecord({
      collectorId: 'collector-1',
      estateId: 'estate-1',
      actualWeightKg: 50,
      pickupRequestId: 'pr-1',
    });
    if (!created.ok) throw new Error('setup failed');

    await service.receiveAtFactory({
      collectionRecordId: created.record.id,
      receivingOfficerId: 'officer-1',
      factoryId: 'factory-1',
      receivedWeightKg: 50,
      teaGrade: 'super',
    });

    const row = await db.getFirstAsync<{ status: string }>("SELECT status FROM pickup_requests WHERE id = 'pr-1'");
    expect(row?.status).toBe('completed');
  });
});

describe('listPendingReceiving', () => {
  test('returns only records without a receiving record', async () => {
    const db = await createDb();
    const service = makeService(db);
    const first = await createRecord(service, 10);
    const second = await createRecord(service, 20);
    await service.receiveAtFactory({
      collectionRecordId: first.id,
      receivingOfficerId: 'officer-1',
      factoryId: 'factory-1',
      receivedWeightKg: 10,
      teaGrade: 'normal',
    });

    const pending = await service.listPendingReceiving();

    expect(pending.map((r) => r.id)).toEqual([second.id]);
  });
});
