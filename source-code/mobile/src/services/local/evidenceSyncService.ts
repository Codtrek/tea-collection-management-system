import NetInfo from '@react-native-community/netinfo';

import type { AsyncDb } from '@/db/asyncDb';
import { getDb } from '@/db';
import { canCaptureEvidence, resolveCaptureOutcome, type EvidenceStatus } from '@/domain/evidenceSync';

import type { CaptureEvidenceResult, EvidenceSyncService, FlushQueueResult } from '../types';

type SyncQueueRow = {
  id: string;
  entity_id: string;
  payload: string;
};

export type EvidenceSyncDeps = {
  isOnline: () => Promise<boolean>;
  uploader: (localUri: string) => Promise<string>;
};

const ENTITY_TYPE = 'collection_evidence';

export function createLocalEvidenceSyncService(
  dbProvider: () => Promise<AsyncDb>,
  deps: EvidenceSyncDeps,
): EvidenceSyncService {
  async function markUploaded(db: AsyncDb, collectionRecordId: string, url: string) {
    await db.runAsync(
      `UPDATE tea_collection_records SET evidence_url = ?, evidence_status = 'uploaded' WHERE id = ?`,
      url,
      collectionRecordId,
    );
  }

  return {
    async captureEvidence(collectionRecordId, localUri): Promise<CaptureEvidenceResult> {
      const db = await dbProvider();
      const record = await db.getFirstAsync<{ evidence_status: EvidenceStatus }>(
        'SELECT evidence_status FROM tea_collection_records WHERE id = ?',
        collectionRecordId,
      );
      if (!record) return { ok: false, error: 'Collection record not found' };
      const check = canCaptureEvidence(record.evidence_status);
      if (!check.ok) return check;

      const online = await deps.isOnline();
      const outcome = resolveCaptureOutcome(online);

      if (outcome === 'uploaded') {
        const url = await deps.uploader(localUri);
        await markUploaded(db, collectionRecordId, url);
        return { ok: true, status: 'uploaded' };
      }

      await db.runAsync(
        `UPDATE tea_collection_records SET evidence_status = 'queued_offline' WHERE id = ?`,
        collectionRecordId,
      );
      const queueId = `sync-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await db.runAsync(
        `INSERT INTO sync_queue (id, entity_type, entity_id, payload, status, attempts, created_at)
         VALUES (?, ?, ?, ?, 'pending', 0, ?)`,
        queueId,
        ENTITY_TYPE,
        collectionRecordId,
        JSON.stringify({ localUri }),
        new Date().toISOString(),
      );
      return { ok: true, status: 'queued_offline' };
    },

    async flushQueue(): Promise<FlushQueueResult> {
      const db = await dbProvider();
      const pending = await db.getAllAsync<SyncQueueRow>(
        `SELECT id, entity_id, payload FROM sync_queue WHERE entity_type = ? AND status = 'pending'`,
        ENTITY_TYPE,
      );

      let synced = 0;
      let failed = 0;
      for (const item of pending) {
        const { localUri } = JSON.parse(item.payload) as { localUri: string };
        try {
          const url = await deps.uploader(localUri);
          await markUploaded(db, item.entity_id, url);
          await db.runAsync(`UPDATE sync_queue SET status = 'synced' WHERE id = ?`, item.id);
          synced += 1;
        } catch (error) {
          await db.runAsync(
            `UPDATE sync_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?`,
            error instanceof Error ? error.message : String(error),
            item.id,
          );
          failed += 1;
        }
      }
      return { synced, failed };
    },
  };
}

export const localEvidenceSyncService: EvidenceSyncService = createLocalEvidenceSyncService(getDb, {
  isOnline: async () => {
    const state = await NetInfo.fetch();
    return Boolean(state.isConnected);
  },
  // TODO: swap for a real Cloudinary uploader once credentials exist.
  uploader: async (localUri: string) => `https://stub-evidence.local/${encodeURIComponent(localUri)}`,
});
