import type { AsyncDb } from '@/db/asyncDb';
import { getDb } from '@/db';
import {
  canConfirmOwner,
  canReceiveCollection,
  isWeightMismatch,
  validateWeightKg,
  type TeaGrade,
} from '@/domain/collectionRecord';

import type {
  CollectionActionResult,
  CollectionRecord,
  CollectionService,
  Complaint,
  ReceiveResult,
} from '../types';

type CollectionRecordRow = {
  id: string;
  pickup_request_id: string | null;
  route_stop_id: string | null;
  collector_id: string;
  estate_id: string;
  estate_name: string;
  actual_weight_kg: number;
  self_delivered: number;
  owner_confirmed: number;
  evidence_url: string | null;
  evidence_status: CollectionRecord['evidenceStatus'];
  collected_at: string;
  receiving_id: string | null;
  receiving_officer_id: string | null;
  factory_id: string | null;
  received_weight_kg: number | null;
  tea_grade: TeaGrade | null;
  received_at: string | null;
};

const RECORD_SELECT = `
  SELECT cr.*, e.name AS estate_name,
         rr.id AS receiving_id, rr.receiving_officer_id, rr.factory_id,
         rr.received_weight_kg, rr.tea_grade, rr.received_at
  FROM tea_collection_records cr
  JOIN estates e ON e.id = cr.estate_id
  LEFT JOIN tea_receiving_records rr ON rr.collection_record_id = cr.id
`;

function toCollectionRecord(row: CollectionRecordRow): CollectionRecord {
  return {
    id: row.id,
    pickupRequestId: row.pickup_request_id,
    routeStopId: row.route_stop_id,
    collectorId: row.collector_id,
    estateId: row.estate_id,
    estateName: row.estate_name,
    actualWeightKg: row.actual_weight_kg,
    selfDelivered: row.self_delivered === 1,
    ownerConfirmed: row.owner_confirmed === 1,
    evidenceUrl: row.evidence_url,
    evidenceStatus: row.evidence_status,
    collectedAt: row.collected_at,
    receiving:
      row.receiving_id !== null
        ? {
            id: row.receiving_id,
            collectionRecordId: row.id,
            receivingOfficerId: row.receiving_officer_id!,
            factoryId: row.factory_id!,
            receivedWeightKg: row.received_weight_kg!,
            teaGrade: row.tea_grade!,
            receivedAt: row.received_at!,
          }
        : null,
  };
}

async function fetchRecord(db: AsyncDb, id: string): Promise<CollectionRecord | null> {
  const row = await db.getFirstAsync<CollectionRecordRow>(`${RECORD_SELECT} WHERE cr.id = ?`, id);
  return row ? toCollectionRecord(row) : null;
}

export function createLocalCollectionService(dbProvider: () => Promise<AsyncDb>): CollectionService {
  return {
    async createRecord(input): Promise<CollectionActionResult> {
      const db = await dbProvider();
      const check = validateWeightKg(input.actualWeightKg);
      if (!check.ok) return check;

      const id = `collection-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await db.runAsync(
        `INSERT INTO tea_collection_records
          (id, pickup_request_id, route_stop_id, collector_id, estate_id, actual_weight_kg, self_delivered, owner_confirmed, evidence_url, collected_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        id,
        input.pickupRequestId ?? null,
        input.routeStopId ?? null,
        input.collectorId,
        input.estateId,
        input.actualWeightKg,
        input.selfDelivered ? 1 : 0,
        input.evidenceUrl ?? null,
        new Date().toISOString(),
      );

      const record = await fetchRecord(db, id);
      if (!record) throw new Error('Failed to create collection record');
      return { ok: true, record };
    },

    async confirmOwner(recordId): Promise<CollectionActionResult> {
      const db = await dbProvider();
      const record = await fetchRecord(db, recordId);
      if (!record) return { ok: false, error: 'Collection record not found' };
      const check = canConfirmOwner(record.ownerConfirmed);
      if (!check.ok) return check;

      await db.runAsync(`UPDATE tea_collection_records SET owner_confirmed = 1 WHERE id = ?`, recordId);
      return { ok: true, record: (await fetchRecord(db, recordId))! };
    },

    async listForCollector(collectorId) {
      const db = await dbProvider();
      const rows = await db.getAllAsync<CollectionRecordRow>(
        `${RECORD_SELECT} WHERE cr.collector_id = ? ORDER BY cr.collected_at DESC`,
        collectorId,
      );
      return rows.map(toCollectionRecord);
    },

    async listPendingReceiving() {
      const db = await dbProvider();
      const rows = await db.getAllAsync<CollectionRecordRow>(
        `${RECORD_SELECT} WHERE rr.id IS NULL ORDER BY cr.collected_at ASC`,
      );
      return rows.map(toCollectionRecord);
    },

    async receiveAtFactory(input): Promise<ReceiveResult> {
      const db = await dbProvider();
      const record = await fetchRecord(db, input.collectionRecordId);
      if (!record) return { ok: false, error: 'Collection record not found' };

      const receiveCheck = canReceiveCollection(record.receiving !== null);
      if (!receiveCheck.ok) return receiveCheck;
      const weightCheck = validateWeightKg(input.receivedWeightKg);
      if (!weightCheck.ok) return weightCheck;

      const now = new Date().toISOString();
      const receivingId = `receiving-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await db.runAsync(
        `INSERT INTO tea_receiving_records
          (id, collection_record_id, receiving_officer_id, factory_id, received_weight_kg, tea_grade, received_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        receivingId,
        record.id,
        input.receivingOfficerId,
        input.factoryId,
        input.receivedWeightKg,
        input.teaGrade,
        now,
      );

      if (record.pickupRequestId) {
        await db.runAsync(
          `UPDATE pickup_requests SET status = 'completed', resolved_at = ? WHERE id = ?`,
          now,
          record.pickupRequestId,
        );
      }

      let complaint: Complaint | null = null;
      if (isWeightMismatch(record.actualWeightKg, input.receivedWeightKg)) {
        const complaintId = `complaint-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const description = `Collected weight ${record.actualWeightKg}kg differs from factory weight ${input.receivedWeightKg}kg for estate ${record.estateName}`;
        await db.runAsync(
          `INSERT INTO complaints (id, type, raised_by_user_id, collection_record_id, description, status, created_at)
           VALUES (?, 'weight_mismatch', ?, ?, ?, 'open', ?)`,
          complaintId,
          input.receivingOfficerId,
          record.id,
          description,
          now,
        );
        complaint = {
          id: complaintId,
          type: 'weight_mismatch',
          raisedByUserId: input.receivingOfficerId,
          collectionRecordId: record.id,
          description,
          status: 'open',
          createdAt: now,
        };
      }

      return { ok: true, record: (await fetchRecord(db, record.id))!, complaint };
    },
  };
}

export const localCollectionService: CollectionService = createLocalCollectionService(getDb);
