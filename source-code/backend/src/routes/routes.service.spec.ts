import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from 'pg';
import { DataSource } from 'typeorm';

import { CollectorEntity } from './entities/collector.entity';
import { EstateEntity } from './entities/estate.entity';
import { FactoryEmployeeEntity } from './entities/factory-employee.entity';
import { NotificationEntity } from './entities/notification.entity';
import { RouteStopEntity } from './entities/route-stop.entity';
import { RouteEntity } from './entities/route.entity';
import { TeaEstateOwnerEntity } from './entities/tea-estate-owner.entity';
import { RoutesService } from './routes.service';

const ALL_ENTITIES = [
  RouteEntity,
  RouteStopEntity,
  NotificationEntity,
  EstateEntity,
  TeaEstateOwnerEntity,
  FactoryEmployeeEntity,
  CollectorEntity,
];

// Runs against a real local Postgres (same engine as production) in a throwaway schema, since
// better-sqlite3 and Postgres don't share a common column-type vocabulary for datetime columns
// (sqlite wants 'datetime', postgres wants 'timestamp') — testing against the real engine avoids
// that whole class of dialect mismatch.
const PG_HOST = '/var/run/postgresql';
const PG_DATABASE = 'nestjs_db';
const TEST_SCHEMA = `test_routes_${Date.now()}`;

let activeModuleRef: TestingModule | null = null;

beforeAll(async () => {
  const client = new Client({ host: PG_HOST, database: PG_DATABASE });
  await client.connect();
  await client.query(`CREATE SCHEMA IF NOT EXISTS "${TEST_SCHEMA}"`);
  await client.end();
});

afterAll(async () => {
  const client = new Client({ host: PG_HOST, database: PG_DATABASE });
  await client.connect();
  await client.query(`DROP SCHEMA IF EXISTS "${TEST_SCHEMA}" CASCADE`);
  await client.end();
});

afterEach(async () => {
  await activeModuleRef?.close();
  activeModuleRef = null;
});

async function setup() {
  const moduleRef = await Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot({
        type: 'postgres',
        host: PG_HOST,
        database: PG_DATABASE,
        schema: TEST_SCHEMA,
        dropSchema: true,
        synchronize: true,
        retryAttempts: 0,
        entities: ALL_ENTITIES,
      }),
      TypeOrmModule.forFeature(ALL_ENTITIES),
    ],
    providers: [RoutesService],
  }).compile();
  activeModuleRef = moduleRef;

  const dataSource = moduleRef.get(DataSource);
  await dataSource
    .getRepository(TeaEstateOwnerEntity)
    .insert({ id: 1, user_id: 100, name: 'Nimal Perera' });
  await dataSource.getRepository(EstateEntity).insert({
    id: 1,
    owner_id: 1,
    name: 'Green Valley Estate',
    location: 'Nuwara Eliya',
  });
  await dataSource.getRepository(EstateEntity).insert({
    id: 2,
    owner_id: 1,
    name: 'Highland Tea Gardens',
    location: 'Nuwara Eliya',
  });
  const employeeInsert = await dataSource
    .getRepository(FactoryEmployeeEntity)
    .insert({ user_id: 200, factory_id: 1 });
  const employeeId = employeeInsert.identifiers[0].id as number;
  const collectorInsert = await dataSource
    .getRepository(CollectorEntity)
    .insert({ employee_id: employeeId, factory_id: 1 });
  const collectorId = collectorInsert.identifiers[0].id as number;

  return { service: moduleRef.get(RoutesService), dataSource, collectorId };
}

describe('RoutesService', () => {
  it('resolves the collectors.id for a given users.id', async () => {
    const { service, collectorId } = await setup();

    expect(await service.resolveCollectorIdForUser(200)).toBe(collectorId);
    expect(await service.resolveCollectorIdForUser(999)).toBeNull();
  });

  it('creates a scheduled route with its stops', async () => {
    const { service } = await setup();

    const route = await service.create({
      factoryId: 1,
      collectorId: 10,
      routeDate: '2026-07-10',
      stops: [
        { estateId: 1, hasTeaPickup: true, hasFertilizerDelivery: false },
      ],
    });

    expect(route.status).toBe('scheduled');
    expect(route.stops).toHaveLength(1);
    expect(route.stops[0]).toMatchObject({
      estateId: 1,
      hasTeaPickup: true,
      hasFertilizerDelivery: false,
    });
  });

  it('starts a route for its assigned collector and notifies estate owners', async () => {
    const { service, dataSource } = await setup();
    const created = await service.create({
      factoryId: 1,
      collectorId: 10,
      routeDate: '2026-07-10',
      stops: [
        { estateId: 1, hasTeaPickup: true, hasFertilizerDelivery: false },
        { estateId: 2, hasTeaPickup: true, hasFertilizerDelivery: false },
      ],
    });

    const result = await service.start(created.id, 10);

    expect(result).toMatchObject({ ok: true, route: { status: 'active' } });
    const notifications = await dataSource
      .getRepository(NotificationEntity)
      .find({ where: { type: 'route_active' } });
    expect(notifications).toHaveLength(2);
    expect(notifications.map((n) => n.user_id).sort()).toEqual([100, 100]);
  });

  it('rejects starting a route for a different collector', async () => {
    const { service } = await setup();
    const created = await service.create({
      factoryId: 1,
      collectorId: 10,
      routeDate: '2026-07-10',
      stops: [
        { estateId: 1, hasTeaPickup: true, hasFertilizerDelivery: false },
      ],
    });

    const result = await service.start(created.id, 999);

    expect(result).toEqual({
      ok: false,
      error: 'Only the assigned collector can start this route',
    });
  });

  it('delays a route with a reason and notifies estate owners', async () => {
    const { service, dataSource } = await setup();
    const created = await service.create({
      factoryId: 1,
      collectorId: 10,
      routeDate: '2026-07-10',
      stops: [
        { estateId: 1, hasTeaPickup: true, hasFertilizerDelivery: false },
      ],
    });

    const result = await service.delay(created.id, 'Heavy rain');

    expect(result).toMatchObject({
      ok: true,
      route: { status: 'delayed', statusReason: 'Heavy rain' },
    });
    const notifications = await dataSource
      .getRepository(NotificationEntity)
      .find({ where: { type: 'route_delayed' } });
    expect(notifications).toHaveLength(1);
  });

  it('rejects delaying without a reason', async () => {
    const { service } = await setup();
    const created = await service.create({
      factoryId: 1,
      collectorId: 10,
      routeDate: '2026-07-10',
      stops: [
        { estateId: 1, hasTeaPickup: true, hasFertilizerDelivery: false },
      ],
    });

    const result = await service.delay(created.id, '');

    expect(result).toEqual({
      ok: false,
      error: 'A reason is required to delay a route',
    });
  });

  it('cancels a route with a reason, blocking a later start', async () => {
    const { service } = await setup();
    const created = await service.create({
      factoryId: 1,
      collectorId: 10,
      routeDate: '2026-07-10',
      stops: [
        { estateId: 1, hasTeaPickup: true, hasFertilizerDelivery: false },
      ],
    });

    await service.cancel(created.id, 'Road closed');
    const startResult = await service.start(created.id, 10);

    expect(startResult).toEqual({
      ok: false,
      error: 'Cannot start a route that is cancelled',
    });
  });

  it('only completes an active route', async () => {
    const { service } = await setup();
    const created = await service.create({
      factoryId: 1,
      collectorId: 10,
      routeDate: '2026-07-10',
      stops: [
        { estateId: 1, hasTeaPickup: true, hasFertilizerDelivery: false },
      ],
    });

    const beforeStart = await service.complete(created.id);
    expect(beforeStart).toEqual({
      ok: false,
      error: 'Cannot complete a route that is scheduled',
    });

    await service.start(created.id, 10);
    const afterStart = await service.complete(created.id);
    expect(afterStart).toMatchObject({
      ok: true,
      route: { status: 'completed' },
    });
  });

  it('lists routes by date and by collector', async () => {
    const { service } = await setup();
    await service.create({
      factoryId: 1,
      collectorId: 10,
      routeDate: '2026-07-10',
      stops: [
        { estateId: 1, hasTeaPickup: true, hasFertilizerDelivery: false },
      ],
    });
    await service.create({
      factoryId: 1,
      collectorId: 20,
      routeDate: '2026-07-10',
      stops: [
        { estateId: 2, hasTeaPickup: true, hasFertilizerDelivery: false },
      ],
    });

    const byDate = await service.findByDate('2026-07-10');
    const byCollector = await service.findByCollector(10, '2026-07-10');

    expect(byDate).toHaveLength(2);
    expect(byCollector).toHaveLength(1);
    expect(byCollector[0].collectorId).toBe(10);
  });
});
