import type { AsyncDb } from '@/db/asyncDb';
import { createSchema } from '@/db/schema';
import { createInMemoryDb } from '@/db/testUtils/inMemoryDb';

import { createLocalRouteService } from '../routeService';
import type { RouteService } from '../../types';

async function seedFixtures(db: AsyncDb) {
  await db.runAsync(
    "INSERT INTO users (id, name, phone, password, role) VALUES ('owner-1', 'Nimal Perera', '0770000001', 'x', 'estate_owner')",
  );
  await db.runAsync(
    "INSERT INTO users (id, name, phone, password, role) VALUES ('collector-1', 'Kamal Silva', '0770000003', 'x', 'collector')",
  );
  await db.runAsync(
    "INSERT INTO users (id, name, phone, password, role) VALUES ('collector-2', 'Other Collector', '0770000009', 'x', 'collector')",
  );
  await db.runAsync("INSERT INTO estates (id, owner_id, name) VALUES ('estate-1', 'owner-1', 'Green Valley Estate')");
  await db.runAsync("INSERT INTO estates (id, owner_id, name) VALUES ('estate-2', 'owner-1', 'Highland Tea Gardens')");
}

async function createDb(): Promise<AsyncDb> {
  const db = createInMemoryDb();
  await createSchema(db);
  await seedFixtures(db);
  return db;
}

function makeService(db: AsyncDb): RouteService {
  return createLocalRouteService(async () => db);
}

describe('getRouteById', () => {
  test('returns the route with its stops', async () => {
    const db = await createDb();
    const service = makeService(db);
    const created = await service.createRoute({
      routeDate: '2026-07-10',
      collectorId: 'collector-1',
      stops: [{ estateId: 'estate-1', hasTeaPickup: true, hasFertilizerDelivery: false }],
    });

    const found = await service.getRouteById(created.id);

    expect(found?.id).toBe(created.id);
    expect(found?.stops).toHaveLength(1);
  });

  test('returns null for an unknown id', async () => {
    const db = await createDb();
    const service = makeService(db);

    expect(await service.getRouteById('does-not-exist')).toBeNull();
  });
});

describe('createRoute', () => {
  test('creates a scheduled route with its stops', async () => {
    const db = await createDb();
    const service = makeService(db);

    const route = await service.createRoute({
      routeDate: '2026-07-10',
      collectorId: 'collector-1',
      truckName: 'Truck A',
      driverName: 'Sena',
      stops: [
        { estateId: 'estate-1', hasTeaPickup: true, hasFertilizerDelivery: false },
        { estateId: 'estate-2', hasTeaPickup: true, hasFertilizerDelivery: true },
      ],
    });

    expect(route.status).toBe('scheduled');
    expect(route.routeDate).toBe('2026-07-10');
    expect(route.collectorId).toBe('collector-1');
    expect(route.stops).toHaveLength(2);
    expect(route.stops[0]).toMatchObject({
      estateId: 'estate-1',
      estateName: 'Green Valley Estate',
      hasTeaPickup: true,
      hasFertilizerDelivery: false,
    });
  });
});

describe('listRoutesForCollector', () => {
  test('returns only the given collector\'s routes for that date', async () => {
    const db = await createDb();
    const service = makeService(db);
    await service.createRoute({
      routeDate: '2026-07-10',
      collectorId: 'collector-1',
      stops: [{ estateId: 'estate-1', hasTeaPickup: true, hasFertilizerDelivery: false }],
    });
    await service.createRoute({
      routeDate: '2026-07-10',
      collectorId: 'collector-2',
      stops: [{ estateId: 'estate-2', hasTeaPickup: true, hasFertilizerDelivery: false }],
    });

    const routes = await service.listRoutesForCollector('collector-1', '2026-07-10');

    expect(routes).toHaveLength(1);
    expect(routes[0].collectorId).toBe('collector-1');
  });
});

describe('startRoute', () => {
  test('transitions a scheduled route to active for its assigned collector', async () => {
    const db = await createDb();
    const service = makeService(db);
    const created = await service.createRoute({
      routeDate: '2026-07-10',
      collectorId: 'collector-1',
      stops: [{ estateId: 'estate-1', hasTeaPickup: true, hasFertilizerDelivery: false }],
    });

    const result = await service.startRoute(created.id, 'collector-1');

    expect(result).toMatchObject({ ok: true, route: { status: 'active' } });
  });

  test('rejects starting a route belonging to a different collector', async () => {
    const db = await createDb();
    const service = makeService(db);
    const created = await service.createRoute({
      routeDate: '2026-07-10',
      collectorId: 'collector-1',
      stops: [{ estateId: 'estate-1', hasTeaPickup: true, hasFertilizerDelivery: false }],
    });

    const result = await service.startRoute(created.id, 'collector-2');

    expect(result).toEqual({ ok: false, error: 'Only the assigned collector can start this route' });
  });

  test('notifies every estate on the route when it becomes active', async () => {
    const db = await createDb();
    const service = makeService(db);
    const created = await service.createRoute({
      routeDate: '2026-07-10',
      collectorId: 'collector-1',
      stops: [
        { estateId: 'estate-1', hasTeaPickup: true, hasFertilizerDelivery: false },
        { estateId: 'estate-2', hasTeaPickup: true, hasFertilizerDelivery: false },
      ],
    });

    await service.startRoute(created.id, 'collector-1');

    const notifications = await db.getAllAsync<{ user_id: string; type: string }>(
      "SELECT user_id, type FROM notifications WHERE type = 'route_active'",
    );
    expect(notifications).toHaveLength(2);
  });
});

describe('setDelayed', () => {
  test('requires a reason', async () => {
    const db = await createDb();
    const service = makeService(db);
    const created = await service.createRoute({
      routeDate: '2026-07-10',
      collectorId: 'collector-1',
      stops: [{ estateId: 'estate-1', hasTeaPickup: true, hasFertilizerDelivery: false }],
    });

    const result = await service.setDelayed(created.id, '');

    expect(result).toEqual({ ok: false, error: 'A reason is required to delay a route' });
  });

  test('sets status and reason with a valid reason', async () => {
    const db = await createDb();
    const service = makeService(db);
    const created = await service.createRoute({
      routeDate: '2026-07-10',
      collectorId: 'collector-1',
      stops: [{ estateId: 'estate-1', hasTeaPickup: true, hasFertilizerDelivery: false }],
    });

    const result = await service.setDelayed(created.id, 'Heavy rain');

    expect(result).toMatchObject({ ok: true, route: { status: 'delayed', statusReason: 'Heavy rain' } });
  });
});

describe('setCancelled', () => {
  test('sets status and reason, and blocks a later start', async () => {
    const db = await createDb();
    const service = makeService(db);
    const created = await service.createRoute({
      routeDate: '2026-07-10',
      collectorId: 'collector-1',
      stops: [{ estateId: 'estate-1', hasTeaPickup: true, hasFertilizerDelivery: false }],
    });

    await service.setCancelled(created.id, 'Road closed');
    const startResult = await service.startRoute(created.id, 'collector-1');

    expect(startResult).toEqual({ ok: false, error: 'Cannot start a route that is cancelled' });
  });
});

describe('completeRoute', () => {
  test('only completes a route that is active', async () => {
    const db = await createDb();
    const service = makeService(db);
    const created = await service.createRoute({
      routeDate: '2026-07-10',
      collectorId: 'collector-1',
      stops: [{ estateId: 'estate-1', hasTeaPickup: true, hasFertilizerDelivery: false }],
    });

    const beforeStart = await service.completeRoute(created.id);
    expect(beforeStart).toEqual({ ok: false, error: 'Cannot complete a route that is scheduled' });

    await service.startRoute(created.id, 'collector-1');
    const afterStart = await service.completeRoute(created.id);
    expect(afterStart).toMatchObject({ ok: true, route: { status: 'completed' } });
  });
});
