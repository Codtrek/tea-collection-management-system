import type { AsyncDb } from '@/db/asyncDb';
import { getDb } from '@/db';
import {
  canAcceptPickup,
  canCancelPickup,
  canDeclinePickup,
  canMarkOnTheWay,
  canMarkPickedUp,
  type PickupStatus,
} from '@/domain/pickupStatus';
import { todayISODate } from '@/utils/date';

import type { CreatePickupResult, PickupActionResult, PickupRequest, PickupService } from '../types';

type PickupRequestRow = {
  id: string;
  estate_id: string;
  estate_name: string;
  owner_id: string;
  factory_id: string;
  route_stop_id: string | null;
  request_date: string;
  status: PickupStatus;
  decline_reason: string | null;
  estimated_weight_kg: number | null;
  gps_pin_lat: number | null;
  gps_pin_lng: number | null;
  requested_at: string;
  resolved_at: string | null;
};

function toPickupRequest(row: PickupRequestRow): PickupRequest {
  return {
    id: row.id,
    estateId: row.estate_id,
    estateName: row.estate_name,
    ownerId: row.owner_id,
    factoryId: row.factory_id,
    routeStopId: row.route_stop_id,
    requestDate: row.request_date,
    status: row.status,
    declineReason: row.decline_reason,
    estimatedWeightKg: row.estimated_weight_kg,
    gpsPinLat: row.gps_pin_lat,
    gpsPinLng: row.gps_pin_lng,
    requestedAt: row.requested_at,
    resolvedAt: row.resolved_at,
  };
}

async function fetchRequest(db: AsyncDb, id: string): Promise<PickupRequest | null> {
  const row = await db.getFirstAsync<PickupRequestRow>(
    `SELECT pr.*, e.name as estate_name FROM pickup_requests pr
     JOIN estates e ON e.id = pr.estate_id
     WHERE pr.id = ?`,
    id,
  );
  return row ? toPickupRequest(row) : null;
}

async function findActiveRouteStopForEstate(db: AsyncDb, estateId: string, date: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ id: string }>(
    `SELECT rs.id FROM route_stops rs
     JOIN routes r ON r.id = rs.route_id
     WHERE rs.estate_id = ? AND r.status = 'active' AND r.route_date = ?`,
    estateId,
    date,
  );
  return row?.id ?? null;
}

export function createLocalPickupService(dbProvider: () => Promise<AsyncDb>): PickupService {
  async function applyTransition(
    db: AsyncDb,
    id: string,
    status: PickupStatus,
    extra?: { declineReason?: string; resolved?: boolean },
  ): Promise<PickupRequest> {
    if (extra?.declineReason !== undefined) {
      await db.runAsync(
        `UPDATE pickup_requests SET status = ?, decline_reason = ?, resolved_at = ? WHERE id = ?`,
        status,
        extra.declineReason,
        new Date().toISOString(),
        id,
      );
    } else if (extra?.resolved) {
      await db.runAsync(`UPDATE pickup_requests SET status = ?, resolved_at = ? WHERE id = ?`, status, new Date().toISOString(), id);
    } else {
      await db.runAsync(`UPDATE pickup_requests SET status = ? WHERE id = ?`, status, id);
    }
    return (await fetchRequest(db, id))!;
  }

  return {
    async createRequest(input) {
      const db = await dbProvider();
      const today = todayISODate();

      const existing = await db.getFirstAsync<{ id: string }>(
        `SELECT id FROM pickup_requests WHERE estate_id = ? AND request_date = ? AND status NOT IN ('expired', 'cancelled', 'completed')`,
        input.estateId,
        today,
      );
      if (existing) {
        return { ok: false, error: 'This estate already has an active pickup request today.' };
      }

      const routeStopId = await findActiveRouteStopForEstate(db, input.estateId, today);
      if (!routeStopId) {
        return {
          ok: false,
          error: 'No collector is currently active on your estate route. Try again once your route starts.',
        };
      }

      const id = `pickup-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await db.runAsync(
        `INSERT INTO pickup_requests
          (id, estate_id, owner_id, factory_id, route_stop_id, request_date, status, estimated_weight_kg, gps_pin_lat, gps_pin_lng, requested_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
        id,
        input.estateId,
        input.ownerId,
        input.factoryId,
        routeStopId,
        today,
        input.estimatedWeightKg ?? null,
        input.gpsPinLat ?? null,
        input.gpsPinLng ?? null,
        new Date().toISOString(),
      );

      const request = await fetchRequest(db, id);
      if (!request) throw new Error('Failed to create pickup request');
      return { ok: true, request } satisfies CreatePickupResult;
    },

    async getActiveRequestForEstate(estateId) {
      const db = await dbProvider();
      const today = todayISODate();
      const row = await db.getFirstAsync<PickupRequestRow>(
        `SELECT pr.*, e.name as estate_name FROM pickup_requests pr
         JOIN estates e ON e.id = pr.estate_id
         WHERE pr.estate_id = ? AND pr.request_date = ? AND pr.status NOT IN ('expired', 'cancelled', 'completed')`,
        estateId,
        today,
      );
      return row ? toPickupRequest(row) : null;
    },

    async listForCollector(collectorId) {
      const db = await dbProvider();
      const rows = await db.getAllAsync<PickupRequestRow>(
        `SELECT pr.*, e.name as estate_name FROM pickup_requests pr
         JOIN estates e ON e.id = pr.estate_id
         JOIN route_stops rs ON rs.id = pr.route_stop_id
         JOIN routes r ON r.id = rs.route_id
         WHERE r.collector_id = ? AND pr.status = 'pending'`,
        collectorId,
      );
      return rows.map(toPickupRequest);
    },

    async accept(id): Promise<PickupActionResult> {
      const db = await dbProvider();
      const request = await fetchRequest(db, id);
      if (!request) return { ok: false, error: 'Pickup request not found' };
      const check = canAcceptPickup(request.status);
      if (!check.ok) return check;
      return { ok: true, request: await applyTransition(db, id, 'accepted') };
    },

    async decline(id, reason): Promise<PickupActionResult> {
      const db = await dbProvider();
      const request = await fetchRequest(db, id);
      if (!request) return { ok: false, error: 'Pickup request not found' };
      const check = canDeclinePickup(request.status, reason);
      if (!check.ok) return check;
      return { ok: true, request: await applyTransition(db, id, 'cancelled', { declineReason: reason }) };
    },

    async markOnTheWay(id): Promise<PickupActionResult> {
      const db = await dbProvider();
      const request = await fetchRequest(db, id);
      if (!request) return { ok: false, error: 'Pickup request not found' };
      const check = canMarkOnTheWay(request.status);
      if (!check.ok) return check;
      return { ok: true, request: await applyTransition(db, id, 'on_the_way') };
    },

    async markPickedUp(id): Promise<PickupActionResult> {
      const db = await dbProvider();
      const request = await fetchRequest(db, id);
      if (!request) return { ok: false, error: 'Pickup request not found' };
      const check = canMarkPickedUp(request.status);
      if (!check.ok) return check;
      return { ok: true, request: await applyTransition(db, id, 'picked_up') };
    },

    async cancel(id): Promise<PickupActionResult> {
      const db = await dbProvider();
      const request = await fetchRequest(db, id);
      if (!request) return { ok: false, error: 'Pickup request not found' };
      const check = canCancelPickup(request.status);
      if (!check.ok) return check;
      return { ok: true, request: await applyTransition(db, id, 'cancelled', { resolved: true }) };
    },
  };
}

export const localPickupService: PickupService = createLocalPickupService(getDb);
