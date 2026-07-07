import type { AsyncDb } from '@/db/asyncDb';
import { createSchema } from '@/db/schema';
import { createInMemoryDb } from '@/db/testUtils/inMemoryDb';

import { createLocalPaymentService } from '../paymentService';
import type { PaymentService } from '../../types';

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

async function seedReceivedCollection(
  db: AsyncDb,
  opts: { id: string; weightKg: number; grade: 'super' | 'normal'; selfDelivered?: boolean; receivedAt: string },
) {
  await db.runAsync(
    `INSERT INTO tea_collection_records (id, collector_id, estate_id, actual_weight_kg, self_delivered, owner_confirmed, collected_at)
     VALUES (?, 'collector-1', 'estate-1', ?, ?, 1, ?)`,
    `cr-${opts.id}`,
    opts.weightKg,
    opts.selfDelivered ? 1 : 0,
    opts.receivedAt,
  );
  await db.runAsync(
    `INSERT INTO tea_receiving_records (id, collection_record_id, receiving_officer_id, factory_id, received_weight_kg, tea_grade, received_at)
     VALUES (?, ?, 'officer-1', 'factory-1', ?, ?, ?)`,
    `rr-${opts.id}`,
    `cr-${opts.id}`,
    opts.weightKg,
    opts.grade,
    opts.receivedAt,
  );
}

async function createDb(): Promise<AsyncDb> {
  const db = createInMemoryDb();
  await createSchema(db);
  await seedFixtures(db);
  return db;
}

function makeService(db: AsyncDb): PaymentService {
  return createLocalPaymentService(async () => db);
}

const GENERATE_INPUT = {
  ownerId: 'owner-1',
  factoryId: 'factory-1',
  paymentMonth: '2026-07',
  superRatePerKg: 200,
  normalRatePerKg: 150,
  transportRatePerKg: 5,
};

describe('generateForMonth', () => {
  test('aggregates graded received weights, skipping transport for self-delivered tea', async () => {
    const db = await createDb();
    await seedReceivedCollection(db, { id: '1', weightKg: 100, grade: 'super', receivedAt: '2026-07-05T09:00:00.000Z' });
    await seedReceivedCollection(db, {
      id: '2',
      weightKg: 50,
      grade: 'normal',
      selfDelivered: true,
      receivedAt: '2026-07-10T09:00:00.000Z',
    });
    // Outside the month — must be ignored:
    await seedReceivedCollection(db, { id: '3', weightKg: 999, grade: 'super', receivedAt: '2026-06-30T09:00:00.000Z' });
    const service = makeService(db);

    const result = await service.generateForMonth(GENERATE_INPUT);

    expect(result).toMatchObject({
      ok: true,
      payment: {
        ownerId: 'owner-1',
        paymentMonth: '2026-07',
        superWeightKg: 100,
        normalWeightKg: 50,
        grossAmount: 100 * 200 + 50 * 150,
        transportCost: 100 * 5,
        bankTransferFee: 3,
        netAmount: 27500 - 500 - 3,
        status: 'pending',
      },
    });
  });

  test('rejects a duplicate payment for the same owner and month', async () => {
    const db = await createDb();
    await seedReceivedCollection(db, { id: '1', weightKg: 10, grade: 'super', receivedAt: '2026-07-05T09:00:00.000Z' });
    const service = makeService(db);
    await service.generateForMonth(GENERATE_INPUT);

    const result = await service.generateForMonth(GENERATE_INPUT);

    expect(result).toEqual({
      ok: false,
      error: 'A payment for this owner and month already exists.',
    });
  });

  test('rejects when there is no received tea for the month', async () => {
    const db = await createDb();
    const service = makeService(db);

    const result = await service.generateForMonth(GENERATE_INPUT);

    expect(result).toEqual({
      ok: false,
      error: 'No received tea collections found for this month.',
    });
  });

  test('rejects invalid rates', async () => {
    const db = await createDb();
    const service = makeService(db);

    const result = await service.generateForMonth({ ...GENERATE_INPUT, superRatePerKg: 0 });

    expect(result).toEqual({ ok: false, error: 'Rates must be greater than zero' });
  });
});

describe('finalize', () => {
  test('finalizes a pending payment once and only once', async () => {
    const db = await createDb();
    await seedReceivedCollection(db, { id: '1', weightKg: 10, grade: 'super', receivedAt: '2026-07-05T09:00:00.000Z' });
    const service = makeService(db);
    const created = await service.generateForMonth(GENERATE_INPUT);
    if (!created.ok) throw new Error('setup failed');

    const first = await service.finalize(created.payment.id);
    expect(first).toMatchObject({ ok: true, payment: { status: 'finalized' } });

    const second = await service.finalize(created.payment.id);
    expect(second).toEqual({ ok: false, error: 'Only pending payments can be finalized' });
  });
});

describe('listForOwner', () => {
  test('returns only that owner payments', async () => {
    const db = await createDb();
    await seedReceivedCollection(db, { id: '1', weightKg: 10, grade: 'super', receivedAt: '2026-07-05T09:00:00.000Z' });
    const service = makeService(db);
    await service.generateForMonth(GENERATE_INPUT);

    expect(await service.listForOwner('owner-1')).toHaveLength(1);
    expect(await service.listForOwner('someone-else')).toEqual([]);
  });
});
