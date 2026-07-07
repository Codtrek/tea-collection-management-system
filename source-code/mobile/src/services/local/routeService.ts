import type { AsyncDb } from '@/db/asyncDb';
import { getDb } from '@/db';
import {
  canCompleteRoute,
  canSetCancelled,
  canSetDelayed,
  canStartRoute,
  type RouteStatus,
} from '@/domain/routeStatus';

import type { ActionResult, CreateRouteInput, Route, RouteService, RouteStop } from '../types';

type RouteRow = {
  id: string;
  route_date: string;
  collector_id: string;
  truck_name: string | null;
  driver_name: string | null;
  status: RouteStatus;
  status_reason: string | null;
  started_at: string | null;
  completed_at: string | null;
};

type RouteStopRow = {
  id: string;
  route_id: string;
  estate_id: string;
  estate_name: string;
  stop_order: number;
  has_tea_pickup: number;
  has_fertilizer_delivery: number;
};

function toRouteStop(row: RouteStopRow): RouteStop {
  return {
    id: row.id,
    routeId: row.route_id,
    estateId: row.estate_id,
    estateName: row.estate_name,
    stopOrder: row.stop_order,
    hasTeaPickup: row.has_tea_pickup === 1,
    hasFertilizerDelivery: row.has_fertilizer_delivery === 1,
  };
}

function toRoute(row: RouteRow, stops: RouteStop[]): Route {
  return {
    id: row.id,
    routeDate: row.route_date,
    collectorId: row.collector_id,
    truckName: row.truck_name,
    driverName: row.driver_name,
    status: row.status,
    statusReason: row.status_reason,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    stops,
  };
}

async function fetchStops(db: AsyncDb, routeId: string): Promise<RouteStop[]> {
  const rows = await db.getAllAsync<RouteStopRow>(
    `SELECT rs.*, e.name as estate_name FROM route_stops rs
     JOIN estates e ON e.id = rs.estate_id
     WHERE rs.route_id = ? ORDER BY rs.stop_order`,
    routeId,
  );
  return rows.map(toRouteStop);
}

async function fetchRoute(db: AsyncDb, routeId: string): Promise<Route | null> {
  const row = await db.getFirstAsync<RouteRow>('SELECT * FROM routes WHERE id = ?', routeId);
  if (!row) return null;
  return toRoute(row, await fetchStops(db, routeId));
}

async function notifyEstatesOnRoute(
  db: AsyncDb,
  routeId: string,
  type: 'route_active' | 'route_delayed' | 'route_cancelled',
  title: string,
  body: string,
): Promise<void> {
  const stops = await db.getAllAsync<{ owner_id: string }>(
    `SELECT e.owner_id FROM route_stops rs JOIN estates e ON e.id = rs.estate_id WHERE rs.route_id = ?`,
    routeId,
  );
  for (const stop of stops) {
    await db.runAsync(
      `INSERT INTO notifications (id, user_id, type, title, body, reference_id, reference_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'routes', ?)`,
      `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      stop.owner_id,
      type,
      title,
      body,
      routeId,
      new Date().toISOString(),
    );
  }
}

export function createLocalRouteService(dbProvider: () => Promise<AsyncDb>): RouteService {
  return {
    async getRouteById(routeId) {
      const db = await dbProvider();
      return fetchRoute(db, routeId);
    },

    async listRoutesForDate(routeDate) {
      const db = await dbProvider();
      const rows = await db.getAllAsync<RouteRow>('SELECT * FROM routes WHERE route_date = ?', routeDate);
      return Promise.all(rows.map(async (row) => toRoute(row, await fetchStops(db, row.id))));
    },

    async listRoutesForCollector(collectorId, routeDate) {
      const db = await dbProvider();
      const rows = await db.getAllAsync<RouteRow>(
        'SELECT * FROM routes WHERE collector_id = ? AND route_date = ?',
        collectorId,
        routeDate,
      );
      return Promise.all(rows.map(async (row) => toRoute(row, await fetchStops(db, row.id))));
    },

    async createRoute(input: CreateRouteInput) {
      const db = await dbProvider();
      const routeId = `route-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await db.runAsync(
        `INSERT INTO routes (id, route_date, collector_id, truck_name, driver_name, status, created_at)
         VALUES (?, ?, ?, ?, ?, 'scheduled', ?)`,
        routeId,
        input.routeDate,
        input.collectorId,
        input.truckName ?? null,
        input.driverName ?? null,
        new Date().toISOString(),
      );
      for (const [index, stop] of input.stops.entries()) {
        await db.runAsync(
          `INSERT INTO route_stops (id, route_id, estate_id, stop_order, has_tea_pickup, has_fertilizer_delivery)
           VALUES (?, ?, ?, ?, ?, ?)`,
          `stop-${routeId}-${index}`,
          routeId,
          stop.estateId,
          index,
          stop.hasTeaPickup ? 1 : 0,
          stop.hasFertilizerDelivery ? 1 : 0,
        );
      }
      const route = await fetchRoute(db, routeId);
      if (!route) throw new Error('Failed to create route');
      return route;
    },

    async startRoute(routeId, collectorId): Promise<ActionResult> {
      const db = await dbProvider();
      const route = await fetchRoute(db, routeId);
      if (!route) return { ok: false, error: 'Route not found' };
      const check = canStartRoute(route.status, route.collectorId, collectorId);
      if (!check.ok) return check;
      const startedAt = new Date().toISOString();
      await db.runAsync("UPDATE routes SET status = 'active', started_at = ? WHERE id = ?", startedAt, routeId);
      await notifyEstatesOnRoute(db, routeId, 'route_active', 'Route started', 'Your collector is on the way today.');
      const updated = await fetchRoute(db, routeId);
      return { ok: true, route: updated! };
    },

    async setDelayed(routeId, reason): Promise<ActionResult> {
      const db = await dbProvider();
      const route = await fetchRoute(db, routeId);
      if (!route) return { ok: false, error: 'Route not found' };
      const check = canSetDelayed(route.status, reason);
      if (!check.ok) return check;
      await db.runAsync("UPDATE routes SET status = 'delayed', status_reason = ? WHERE id = ?", reason, routeId);
      await notifyEstatesOnRoute(db, routeId, 'route_delayed', 'Route delayed', reason);
      const updated = await fetchRoute(db, routeId);
      return { ok: true, route: updated! };
    },

    async setCancelled(routeId, reason): Promise<ActionResult> {
      const db = await dbProvider();
      const route = await fetchRoute(db, routeId);
      if (!route) return { ok: false, error: 'Route not found' };
      const check = canSetCancelled(route.status, reason);
      if (!check.ok) return check;
      await db.runAsync("UPDATE routes SET status = 'cancelled', status_reason = ? WHERE id = ?", reason, routeId);
      await notifyEstatesOnRoute(db, routeId, 'route_cancelled', 'Route cancelled', reason);
      const updated = await fetchRoute(db, routeId);
      return { ok: true, route: updated! };
    },

    async completeRoute(routeId): Promise<ActionResult> {
      const db = await dbProvider();
      const route = await fetchRoute(db, routeId);
      if (!route) return { ok: false, error: 'Route not found' };
      const check = canCompleteRoute(route.status);
      if (!check.ok) return check;
      const completedAt = new Date().toISOString();
      await db.runAsync("UPDATE routes SET status = 'completed', completed_at = ? WHERE id = ?", completedAt, routeId);
      const updated = await fetchRoute(db, routeId);
      return { ok: true, route: updated! };
    },
  };
}

export const localRouteService: RouteService = createLocalRouteService(getDb);
