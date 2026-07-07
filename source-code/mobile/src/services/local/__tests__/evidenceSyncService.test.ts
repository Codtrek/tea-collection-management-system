import type { AsyncDb } from '@/db/asyncDb';
import { createSchema } from '@/db/schema';
import { createInMemoryDb } from '@/db/testUtils/inMemoryDb';

import { createLocalCollectionService } from '../collectionService';
import { createLocalEvidenceSyncService } from '../evidenceSyncService';
import type { CollectionService, EvidenceSyncService } from '../../types';

async function seedFixtures(db: AsyncDb) {
  await db.runAsync(
    "INSERT INTO users (id, name, phone, password, role) VALUES ('owner-1', 'Nimal Perera', '0770000001', 'x', 'estate_owner')",
  );
  await db.runAsync(
    "INSERT INTO users (id, name, phone, password, role) VALUES ('collector-1', 'Kamal Silva', '0770000003', 'x', 'collector')",
  );
  await db.runAsync("INSERT INTO estates (id, owner_id, name) VALUES ('estate-1', 'owner-1', 'Green Valley Estate')");
}

async function createDb(): Promise<AsyncDb> {
  const db = createInMemoryDb();
  await createSchema(db);
  await seedFixtures(db);
  return db;
}

function makeCollectionService(db: AsyncDb): CollectionService {
  return createLocalCollectionService(async () => db);
}

function makeEvidenceService(
  db: AsyncDb,
  options: { isOnline: boolean | boolean[]; uploader?: (localUri: string) => Promise<string> },
): EvidenceSyncService {
  const onlineQueue = Array.isArray(options.isOnline) ? [...options.isOnline] : null;
  const isOnline = async () => (onlineQueue ? (onlineQueue.shift() ?? false) : (options.isOnline as boolean));
  const uploader = options.uploader ?? (async (localUri: string) => `https://stub-evidence.local/${localUri}`);
  return createLocalEvidenceSyncService(async () => db, { isOnline, uploader });
}

describe('createLocalEvidenceSyncService', () => {
  it('uploads immediately when online', async () => {
    const db = await createDb();
    const collectionService = makeCollectionService(db);
    const created = await collectionService.createRecord({ collectorId: 'collector-1', estateId: 'estate-1', actualWeightKg: 50 });
    if (!created.ok) throw new Error('setup failed');
    const evidenceService = makeEvidenceService(db, { isOnline: true });

    const result = await evidenceService.captureEvidence(created.record.id, 'file://photo.jpg');

    expect(result).toEqual({ ok: true, status: 'uploaded' });
    const records = await collectionService.listForCollector('collector-1');
    expect(records[0].evidenceStatus).toBe('uploaded');
    expect(records[0].evidenceUrl).toBe('https://stub-evidence.local/file://photo.jpg');
  });

  it('queues offline when there is no connectivity', async () => {
    const db = await createDb();
    const collectionService = makeCollectionService(db);
    const created = await collectionService.createRecord({ collectorId: 'collector-1', estateId: 'estate-1', actualWeightKg: 50 });
    if (!created.ok) throw new Error('setup failed');
    const evidenceService = makeEvidenceService(db, { isOnline: false });

    const result = await evidenceService.captureEvidence(created.record.id, 'file://photo.jpg');

    expect(result).toEqual({ ok: true, status: 'queued_offline' });
    const records = await collectionService.listForCollector('collector-1');
    expect(records[0].evidenceStatus).toBe('queued_offline');
    expect(records[0].evidenceUrl).toBeNull();
  });

  it('rejects capturing evidence twice for the same record', async () => {
    const db = await createDb();
    const collectionService = makeCollectionService(db);
    const created = await collectionService.createRecord({ collectorId: 'collector-1', estateId: 'estate-1', actualWeightKg: 50 });
    if (!created.ok) throw new Error('setup failed');
    const evidenceService = makeEvidenceService(db, { isOnline: true });
    await evidenceService.captureEvidence(created.record.id, 'file://photo.jpg');

    const result = await evidenceService.captureEvidence(created.record.id, 'file://photo2.jpg');

    expect(result).toEqual({ ok: false, error: 'Evidence has already been captured for this record' });
  });

  it('flushes queued items and marks them uploaded once back online', async () => {
    const db = await createDb();
    const collectionService = makeCollectionService(db);
    const first = await collectionService.createRecord({ collectorId: 'collector-1', estateId: 'estate-1', actualWeightKg: 50 });
    const second = await collectionService.createRecord({ collectorId: 'collector-1', estateId: 'estate-1', actualWeightKg: 60 });
    if (!first.ok || !second.ok) throw new Error('setup failed');
    const offlineService = makeEvidenceService(db, { isOnline: false });
    await offlineService.captureEvidence(first.record.id, 'file://a.jpg');
    await offlineService.captureEvidence(second.record.id, 'file://b.jpg');

    const onlineService = makeEvidenceService(db, { isOnline: true });
    const flushResult = await onlineService.flushQueue();

    expect(flushResult).toEqual({ synced: 2, failed: 0 });
    const records = await collectionService.listForCollector('collector-1');
    expect(records.every((record) => record.evidenceStatus === 'uploaded')).toBe(true);
    expect(records.every((record) => record.evidenceUrl !== null)).toBe(true);
  });

  it('keeps a failed upload pending in the queue for the next flush', async () => {
    const db = await createDb();
    const collectionService = makeCollectionService(db);
    const created = await collectionService.createRecord({ collectorId: 'collector-1', estateId: 'estate-1', actualWeightKg: 50 });
    if (!created.ok) throw new Error('setup failed');
    const offlineService = makeEvidenceService(db, { isOnline: false });
    await offlineService.captureEvidence(created.record.id, 'file://a.jpg');

    const failingUploader = async () => {
      throw new Error('network error');
    };
    const failingFlushService = makeEvidenceService(db, { isOnline: true, uploader: failingUploader });
    const failedFlush = await failingFlushService.flushQueue();
    expect(failedFlush).toEqual({ synced: 0, failed: 1 });

    const recordsAfterFailure = await collectionService.listForCollector('collector-1');
    expect(recordsAfterFailure[0].evidenceStatus).toBe('queued_offline');

    const succeedingService = makeEvidenceService(db, { isOnline: true });
    const secondFlush = await succeedingService.flushQueue();
    expect(secondFlush).toEqual({ synced: 1, failed: 0 });
    const recordsAfterRetry = await collectionService.listForCollector('collector-1');
    expect(recordsAfterRetry[0].evidenceStatus).toBe('uploaded');
  });
});
