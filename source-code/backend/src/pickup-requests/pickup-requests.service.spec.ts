import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from 'pg';
import { DataSource } from 'typeorm';

import { EstateEntity } from '../routes/entities/estate.entity';
import { RouteStopEntity } from '../routes/entities/route-stop.entity';
import { RouteEntity } from '../routes/entities/route.entity';
import { TeaEstateOwnerEntity } from '../routes/entities/tea-estate-owner.entity';
import { PickupRequestEntity } from './entities/pickup-request.entity';
import { PickupRequestsService } from './pickup-requests.service';

const PG_HOST = '/var/run/postgresql';
const PG_DATABASE = 'nestjs_db';
const TEST_SCHEMA = `test_pickup_${Date.now()}`;

const ALL_ENTITIES = [
  PickupRequestEntity,
  EstateEntity,
  RouteStopEntity,
  RouteEntity,
  TeaEstateOwnerEntity,
];

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
    providers: [PickupRequestsService],
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

  return { service: moduleRef.get(PickupRequestsService), dataSource };
}

async function createActiveRouteStop(dataSource: DataSource, date: string) {
  await dataSource.getRepository(RouteEntity).insert({
    id: 1,
    factory_id: 1,
    collector_id: 1,
    route_date: date,
    status: 'active',
  });
  await dataSource
    .getRepository(RouteStopEntity)
    .insert({ id: 1, route_id: 1, estate_id: 1, stop_order: 0 });
}

describe('PickupRequestsService', () => {
  it('auto-assigns to the active route stop and creates a pending request', async () => {
    const { service, dataSource } = await setup();
    const today = new Date().toISOString().slice(0, 10);
    await createActiveRouteStop(dataSource, today);

    const result = await service.create(
      { estateId: 1, factoryId: 1, requestDate: today },
      1,
    );

    expect(result).toMatchObject({
      ok: true,
      request: { status: 'pending', routeStopId: 1, ownerId: 1 },
    });
  });

  it('rejects when no collector is active on the estate route', async () => {
    const { service } = await setup();
    const today = new Date().toISOString().slice(0, 10);

    const result = await service.create(
      { estateId: 1, factoryId: 1, requestDate: today },
      1,
    );

    expect(result).toEqual({
      ok: false,
      error:
        'No collector is currently active on your estate route. Try again once your route starts.',
    });
  });

  it('rejects a second active request for the same estate on the same day', async () => {
    const { service, dataSource } = await setup();
    const today = new Date().toISOString().slice(0, 10);
    await createActiveRouteStop(dataSource, today);
    await service.create({ estateId: 1, factoryId: 1, requestDate: today }, 1);

    const result = await service.create(
      { estateId: 1, factoryId: 1, requestDate: today },
      1,
    );

    expect(result).toEqual({
      ok: false,
      error: 'This estate already has an active pickup request today.',
    });
  });

  it('accepts a pending request', async () => {
    const { service, dataSource } = await setup();
    const today = new Date().toISOString().slice(0, 10);
    await createActiveRouteStop(dataSource, today);
    const created = await service.create(
      { estateId: 1, factoryId: 1, requestDate: today },
      1,
    );
    if (!created.ok) throw new Error('setup failed');

    const result = await service.accept(created.request.id);

    expect(result).toMatchObject({ ok: true, request: { status: 'accepted' } });
  });

  it('declines a pending request with a reason', async () => {
    const { service, dataSource } = await setup();
    const today = new Date().toISOString().slice(0, 10);
    await createActiveRouteStop(dataSource, today);
    const created = await service.create(
      { estateId: 1, factoryId: 1, requestDate: today },
      1,
    );
    if (!created.ok) throw new Error('setup failed');

    const result = await service.decline(created.request.id, 'Truck full');

    expect(result).toMatchObject({
      ok: true,
      request: { status: 'cancelled', declineReason: 'Truck full' },
    });
  });

  it('resolves the tea_estate_owners.id for a given users.id', async () => {
    const { service } = await setup();

    expect(await service.resolveOwnerIdForUser(100)).toBe(1);
    expect(await service.resolveOwnerIdForUser(999)).toBeNull();
  });
});
