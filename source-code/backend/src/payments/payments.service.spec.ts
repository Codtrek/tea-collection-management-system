import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from 'pg';
import { DataSource } from 'typeorm';

import { ComplaintEntity } from '../collection-records/entities/complaint.entity';
import { ReceivingOfficerEntity } from '../collection-records/entities/receiving-officer.entity';
import { TeaCollectionRecordEntity } from '../collection-records/entities/tea-collection-record.entity';
import { TeaReceivingRecordEntity } from '../collection-records/entities/tea-receiving-record.entity';
import { EstateEntity } from '../routes/entities/estate.entity';
import { TeaEstateOwnerEntity } from '../routes/entities/tea-estate-owner.entity';
import { MonthlyPaymentEntity } from './entities/monthly-payment.entity';
import { PaymentsService } from './payments.service';

const PG_HOST = '/var/run/postgresql';
const PG_DATABASE = 'nestjs_db';
const TEST_SCHEMA = `test_payments_${Date.now()}`;

const ALL_ENTITIES = [
  MonthlyPaymentEntity,
  TeaReceivingRecordEntity,
  TeaCollectionRecordEntity,
  ComplaintEntity,
  ReceivingOfficerEntity,
  EstateEntity,
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
    providers: [PaymentsService],
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

  async function addReceivedCollection(options: {
    id: number;
    weightKg: number;
    teaGrade: 'super' | 'normal';
    selfDelivered?: boolean;
    receivedAt: string;
  }) {
    await dataSource.getRepository(TeaCollectionRecordEntity).insert({
      id: options.id,
      collector_id: 1,
      estate_id: 1,
      actual_weight_kg: options.weightKg.toFixed(2),
      self_delivered: options.selfDelivered ?? false,
      owner_confirmed: true,
    });
    await dataSource.getRepository(TeaReceivingRecordEntity).insert({
      collection_record_id: options.id,
      receiving_officer_id: 1,
      factory_id: 1,
      received_weight_kg: options.weightKg.toFixed(2),
      tea_grade: options.teaGrade,
      received_at: new Date(options.receivedAt),
    });
  }

  return {
    service: moduleRef.get(PaymentsService),
    dataSource,
    addReceivedCollection,
  };
}

describe('PaymentsService', () => {
  it('generates a monthly payment aggregating super/normal weight, excluding self-delivered from transport', async () => {
    const { service, addReceivedCollection } = await setup();
    await addReceivedCollection({
      id: 1,
      weightKg: 100,
      teaGrade: 'super',
      receivedAt: '2026-07-05T10:00:00Z',
    });
    await addReceivedCollection({
      id: 2,
      weightKg: 50,
      teaGrade: 'normal',
      receivedAt: '2026-07-10T10:00:00Z',
    });
    await addReceivedCollection({
      id: 3,
      weightKg: 20,
      teaGrade: 'super',
      selfDelivered: true,
      receivedAt: '2026-07-15T10:00:00Z',
    });

    const result = await service.generateForMonth({
      ownerId: 1,
      factoryId: 1,
      paymentMonth: '2026-07',
      superRatePerKg: 200,
      normalRatePerKg: 150,
      transportRatePerKg: 5,
    });

    expect(result).toMatchObject({
      ok: true,
      payment: {
        ownerId: 1,
        factoryId: 1,
        paymentMonth: '2026-07',
        superWeightKg: 120,
        normalWeightKg: 50,
        grossAmount: 200 * 120 + 150 * 50,
        transportCost: 150 * 5,
        status: 'pending',
      },
    });
  });

  it('excludes collections from other months', async () => {
    const { service, addReceivedCollection } = await setup();
    await addReceivedCollection({
      id: 1,
      weightKg: 100,
      teaGrade: 'super',
      receivedAt: '2026-06-30T10:00:00Z',
    });

    const result = await service.generateForMonth({
      ownerId: 1,
      factoryId: 1,
      paymentMonth: '2026-07',
      superRatePerKg: 200,
      normalRatePerKg: 150,
    });

    expect(result).toEqual({
      ok: false,
      error: 'No received tea collections found for this month.',
    });
  });

  it('rejects a duplicate payment for the same owner, factory, and month', async () => {
    const { service, addReceivedCollection } = await setup();
    await addReceivedCollection({
      id: 1,
      weightKg: 100,
      teaGrade: 'super',
      receivedAt: '2026-07-05T10:00:00Z',
    });
    await service.generateForMonth({
      ownerId: 1,
      factoryId: 1,
      paymentMonth: '2026-07',
      superRatePerKg: 200,
      normalRatePerKg: 150,
    });

    const result = await service.generateForMonth({
      ownerId: 1,
      factoryId: 1,
      paymentMonth: '2026-07',
      superRatePerKg: 200,
      normalRatePerKg: 150,
    });

    expect(result).toEqual({
      ok: false,
      error: 'A payment for this owner and month already exists.',
    });
  });

  it('rejects invalid rates', async () => {
    const { service } = await setup();

    const result = await service.generateForMonth({
      ownerId: 1,
      factoryId: 1,
      paymentMonth: '2026-07',
      superRatePerKg: 0,
      normalRatePerKg: 150,
    });

    expect(result).toEqual({
      ok: false,
      error: 'Rates must be greater than zero',
    });
  });

  it('finalizes a pending payment once and only once', async () => {
    const { service, addReceivedCollection } = await setup();
    await addReceivedCollection({
      id: 1,
      weightKg: 100,
      teaGrade: 'super',
      receivedAt: '2026-07-05T10:00:00Z',
    });
    const created = await service.generateForMonth({
      ownerId: 1,
      factoryId: 1,
      paymentMonth: '2026-07',
      superRatePerKg: 200,
      normalRatePerKg: 150,
    });
    if (!created.ok) throw new Error('setup failed');

    const first = await service.finalize(created.payment.id);
    expect(first).toMatchObject({ ok: true, payment: { status: 'finalized' } });

    const second = await service.finalize(created.payment.id);
    expect(second).toEqual({
      ok: false,
      error: 'Only pending payments can be finalized',
    });
  });

  it('lists payments only for the requested owner', async () => {
    const { service, dataSource, addReceivedCollection } = await setup();
    await dataSource
      .getRepository(TeaEstateOwnerEntity)
      .insert({ id: 2, user_id: 101, name: 'Sunil Silva' });
    await dataSource.getRepository(EstateEntity).insert({
      id: 2,
      owner_id: 2,
      name: 'Blue Hills Estate',
      location: 'Kandy',
    });
    await addReceivedCollection({
      id: 1,
      weightKg: 100,
      teaGrade: 'super',
      receivedAt: '2026-07-05T10:00:00Z',
    });
    await dataSource.getRepository(TeaCollectionRecordEntity).insert({
      id: 2,
      collector_id: 1,
      estate_id: 2,
      actual_weight_kg: '80.00',
      self_delivered: false,
      owner_confirmed: true,
    });
    await dataSource.getRepository(TeaReceivingRecordEntity).insert({
      collection_record_id: 2,
      receiving_officer_id: 1,
      factory_id: 1,
      received_weight_kg: '80.00',
      tea_grade: 'super',
      received_at: new Date('2026-07-06T10:00:00Z'),
    });

    await service.generateForMonth({
      ownerId: 1,
      factoryId: 1,
      paymentMonth: '2026-07',
      superRatePerKg: 200,
      normalRatePerKg: 150,
    });
    await service.generateForMonth({
      ownerId: 2,
      factoryId: 1,
      paymentMonth: '2026-07',
      superRatePerKg: 200,
      normalRatePerKg: 150,
    });

    const ownerOnePayments = await service.listForOwner(1);
    expect(ownerOnePayments).toHaveLength(1);
    expect(ownerOnePayments[0].ownerId).toBe(1);
  });

  it('resolves owner id from users.id', async () => {
    const { service } = await setup();

    expect(await service.resolveOwnerIdForUser(100)).toBe(1);
    expect(await service.resolveOwnerIdForUser(999)).toBeNull();
  });
});
