import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from 'pg';
import { DataSource } from 'typeorm';

import { PickupRequestEntity } from '../pickup-requests/entities/pickup-request.entity';
import { CollectorEntity } from '../routes/entities/collector.entity';
import { EstateEntity } from '../routes/entities/estate.entity';
import { FactoryEmployeeEntity } from '../routes/entities/factory-employee.entity';
import { TeaEstateOwnerEntity } from '../routes/entities/tea-estate-owner.entity';
import { CollectionRecordsService } from './collection-records.service';
import { ComplaintEntity } from './entities/complaint.entity';
import { ReceivingOfficerEntity } from './entities/receiving-officer.entity';
import { TeaCollectionRecordEntity } from './entities/tea-collection-record.entity';
import { TeaReceivingRecordEntity } from './entities/tea-receiving-record.entity';

const PG_HOST = '/var/run/postgresql';
const PG_DATABASE = 'nestjs_db';
const TEST_SCHEMA = `test_collection_${Date.now()}`;

const ALL_ENTITIES = [
  TeaCollectionRecordEntity,
  TeaReceivingRecordEntity,
  ComplaintEntity,
  ReceivingOfficerEntity,
  PickupRequestEntity,
  EstateEntity,
  TeaEstateOwnerEntity,
  FactoryEmployeeEntity,
  CollectorEntity,
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
    providers: [CollectionRecordsService],
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
  await dataSource
    .getRepository(FactoryEmployeeEntity)
    .insert({ id: 1, user_id: 200, factory_id: 1 });
  await dataSource
    .getRepository(CollectorEntity)
    .insert({ id: 1, employee_id: 1, factory_id: 1 });
  await dataSource
    .getRepository(FactoryEmployeeEntity)
    .insert({ id: 2, user_id: 300, factory_id: 1 });
  await dataSource
    .getRepository(ReceivingOfficerEntity)
    .insert({ id: 1, employee_id: 2, factory_id: 1 });

  return { service: moduleRef.get(CollectionRecordsService), dataSource };
}

const OFFICER = { receivingOfficerId: 1, factoryId: 1, raisedByUserId: 300 };

describe('CollectionRecordsService', () => {
  it('creates a record awaiting owner confirmation and receiving', async () => {
    const { service } = await setup();

    const result = await service.create(
      { estateId: 1, actualWeightKg: 42.5 },
      1,
    );

    expect(result).toMatchObject({
      ok: true,
      record: {
        collectorId: 1,
        estateId: 1,
        actualWeightKg: 42.5,
        ownerConfirmed: false,
        receiving: null,
      },
    });
  });

  it('rejects a non-positive weight', async () => {
    const { service } = await setup();

    const result = await service.create({ estateId: 1, actualWeightKg: 0 }, 1);

    expect(result).toEqual({
      ok: false,
      error: 'Weight must be greater than zero',
    });
  });

  it('confirms the owner once and only once', async () => {
    const { service } = await setup();
    const created = await service.create(
      { estateId: 1, actualWeightKg: 10 },
      1,
    );
    if (!created.ok) throw new Error('setup failed');

    const first = await service.confirmOwner(created.record.id);
    expect(first).toMatchObject({ ok: true, record: { ownerConfirmed: true } });

    const second = await service.confirmOwner(created.record.id);
    expect(second).toEqual({
      ok: false,
      error: 'This record is already confirmed by the owner',
    });
  });

  it('receives within the threshold with no complaint', async () => {
    const { service, dataSource } = await setup();
    const created = await service.create(
      { estateId: 1, actualWeightKg: 100 },
      1,
    );
    if (!created.ok) throw new Error('setup failed');

    const result = await service.receive(
      created.record.id,
      { receivedWeightKg: 99, teaGrade: 'super' },
      OFFICER,
    );

    expect(result).toMatchObject({
      ok: true,
      complaint: null,
      record: { receiving: { receivedWeightKg: 99, teaGrade: 'super' } },
    });
    expect(await dataSource.getRepository(ComplaintEntity).count()).toBe(0);
  });

  it('auto-raises a weight_mismatch complaint beyond the threshold', async () => {
    const { service, dataSource } = await setup();
    const created = await service.create(
      { estateId: 1, actualWeightKg: 100 },
      1,
    );
    if (!created.ok) throw new Error('setup failed');

    const result = await service.receive(
      created.record.id,
      { receivedWeightKg: 90, teaGrade: 'normal' },
      OFFICER,
    );

    expect(result).toMatchObject({
      ok: true,
      complaint: { type: 'weight_mismatch', status: 'open' },
    });
    const complaints = await dataSource.getRepository(ComplaintEntity).find();
    expect(complaints).toHaveLength(1);
    expect(complaints[0].raised_by_user_id).toBe(300);
    expect(complaints[0].collection_record_id).toBe(created.record.id);
  });

  it('rejects receiving the same record twice', async () => {
    const { service } = await setup();
    const created = await service.create(
      { estateId: 1, actualWeightKg: 100 },
      1,
    );
    if (!created.ok) throw new Error('setup failed');
    await service.receive(
      created.record.id,
      { receivedWeightKg: 100, teaGrade: 'super' },
      OFFICER,
    );

    const result = await service.receive(
      created.record.id,
      { receivedWeightKg: 100, teaGrade: 'super' },
      OFFICER,
    );

    expect(result).toEqual({
      ok: false,
      error: 'This record has already been received at the factory',
    });
  });

  it('completes the linked pickup request on receiving', async () => {
    const { service, dataSource } = await setup();
    await dataSource.getRepository(PickupRequestEntity).insert({
      id: 1,
      estate_id: 1,
      owner_id: 1,
      factory_id: 1,
      request_date: '2026-07-07',
      status: 'picked_up',
    });
    const created = await service.create(
      { estateId: 1, actualWeightKg: 50, pickupRequestId: 1 },
      1,
    );
    if (!created.ok) throw new Error('setup failed');

    await service.receive(
      created.record.id,
      { receivedWeightKg: 50, teaGrade: 'super' },
      OFFICER,
    );

    const pickup = await dataSource
      .getRepository(PickupRequestEntity)
      .findOneByOrFail({ id: 1 });
    expect(pickup.status).toBe('completed');
  });

  it('lists only records still awaiting receiving', async () => {
    const { service } = await setup();
    const first = await service.create({ estateId: 1, actualWeightKg: 10 }, 1);
    const second = await service.create({ estateId: 1, actualWeightKg: 20 }, 1);
    if (!first.ok || !second.ok) throw new Error('setup failed');
    await service.receive(
      first.record.id,
      { receivedWeightKg: 10, teaGrade: 'normal' },
      OFFICER,
    );

    const pending = await service.listPendingReceiving();

    expect(pending.map((record) => record.id)).toEqual([second.record.id]);
  });

  it('resolves collector and receiving-officer ids from users.id', async () => {
    const { service } = await setup();

    expect(await service.resolveCollectorIdForUser(200)).toBe(1);
    expect(await service.resolveCollectorIdForUser(999)).toBeNull();
    expect(await service.resolveReceivingOfficerForUser(300)).toEqual({
      receivingOfficerId: 1,
      factoryId: 1,
    });
    expect(await service.resolveReceivingOfficerForUser(999)).toBeNull();
  });
});
