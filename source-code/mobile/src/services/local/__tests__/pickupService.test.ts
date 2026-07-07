import type { AsyncDb } from '@/db/asyncDb';
import { createSchema } from '@/db/schema';
import { createInMemoryDb } from '@/db/testUtils/inMemoryDb';

import { createLocalPickupService } from '../pickupService';
import type { PickupService } from '../../types';

async function seedFixtures(db: AsyncDb) {
  await db.runAsync(
    "INSERT INTO users (id, name, phone, password, role) VALUES ('owner-1', 'Nimal Perera', '0770000001', 'x', 'estate_owner')",
  );
  await db.runAsync(
    "INSERT INTO users (id, name, phone, password, role) VALUES ('collector-1', 'Kamal Silva', '0770000003', 'x', 'collector')",
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

function makeService(db: AsyncDb): PickupService {
  return createLocalPickupService(async () => db);
}

async function createActiveRouteStop(db: AsyncDb, date: string) {
  await db.runAsync(
    "INSERT INTO routes (id, route_date, collector_id, status, created_at) VALUES ('route-1', ?, 'collector-1', 'active', ?)",
    date,
    new Date().toISOString(),
  );
  await db.runAsync(
    "INSERT INTO route_stops (id, route_id, estate_id, stop_order, has_tea_pickup) VALUES ('stop-1', 'route-1', 'estate-1', 0, 1)",
  );
}

describe('createRequest', () => {
  test('auto-assigns to the collector active on the estate route today', async () => {
    const db = await createDb();
    const today = new Date().toISOString().slice(0, 10);
    await createActiveRouteStop(db, today);
    const service = makeService(db);

    const result = await service.createRequest({ estateId: 'estate-1', ownerId: 'owner-1', factoryId: 'factory-1' });

    expect(result).toMatchObject({ ok: true, request: { status: 'pending', routeStopId: 'stop-1' } });
  });

  test('rejects when no collector is currently active on the estate route', async () => {
    const db = await createDb();
    const service = makeService(db);

    const result = await service.createRequest({ estateId: 'estate-1', ownerId: 'owner-1', factoryId: 'factory-1' });

    expect(result).toEqual({
      ok: false,
      error: 'No collector is currently active on your estate route. Try again once your route starts.',
    });
  });

  test('rejects a second active request for the same estate on the same day', async () => {
    const db = await createDb();
    const today = new Date().toISOString().slice(0, 10);
    await createActiveRouteStop(db, today);
    const service = makeService(db);
    await service.createRequest({ estateId: 'estate-1', ownerId: 'owner-1', factoryId: 'factory-1' });

    const result = await service.createRequest({ estateId: 'estate-1', ownerId: 'owner-1', factoryId: 'factory-1' });

    expect(result).toEqual({
      ok: false,
      error: 'This estate already has an active pickup request today.',
    });
  });
});

describe('collector actions', () => {
  async function createPendingRequest(db: AsyncDb) {
    const today = new Date().toISOString().slice(0, 10);
    await createActiveRouteStop(db, today);
    const service = makeService(db);
    const result = await service.createRequest({ estateId: 'estate-1', ownerId: 'owner-1', factoryId: 'factory-1' });
    if (!result.ok) throw new Error('setup failed');
    return { service, request: result.request };
  }

  test('accepts a pending request', async () => {
    const db = await createDb();
    const { service, request } = await createPendingRequest(db);

    const result = await service.accept(request.id);

    expect(result).toMatchObject({ ok: true, request: { status: 'accepted' } });
  });

  test('declines a pending request with a reason, freeing the estate for a new request', async () => {
    const db = await createDb();
    const { service, request } = await createPendingRequest(db);

    const result = await service.decline(request.id, 'Truck full');

    expect(result).toMatchObject({ ok: true, request: { status: 'cancelled', declineReason: 'Truck full' } });
  });

  test('marks on the way then picked up', async () => {
    const db = await createDb();
    const { service, request } = await createPendingRequest(db);
    await service.accept(request.id);

    const onTheWay = await service.markOnTheWay(request.id);
    expect(onTheWay).toMatchObject({ ok: true, request: { status: 'on_the_way' } });

    const pickedUp = await service.markPickedUp(request.id);
    expect(pickedUp).toMatchObject({ ok: true, request: { status: 'picked_up' } });
  });
});

describe('cancel', () => {
  test('owner can cancel a pending request', async () => {
    const db = await createDb();
    const today = new Date().toISOString().slice(0, 10);
    await createActiveRouteStop(db, today);
    const service = makeService(db);
    const created = await service.createRequest({ estateId: 'estate-1', ownerId: 'owner-1', factoryId: 'factory-1' });
    if (!created.ok) throw new Error('setup failed');

    const result = await service.cancel(created.request.id);

    expect(result).toMatchObject({ ok: true, request: { status: 'cancelled' } });
  });
});
