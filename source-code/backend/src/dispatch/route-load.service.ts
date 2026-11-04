import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CollectionRecordEntity } from '../collections/collection-record.entity';
import { round1 } from './dispatch-map';

/** Days of delivery history behind expected load and the agent's ceiling. */
export const LOAD_WINDOW_DAYS = 30;

const DELIVERED = new Set(['collected', 'confirmed']);

const isoDaysBefore = (date: string, days: number): string => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
};

export interface StopCounts {
  total: number;
  done: number;
  remaining: number;
}

/**
 * The single source for every load figure dispatch shows or ranks by. Nothing else
 * recomputes these (Claude.md: one selector/service per shared metric).
 *
 * "Delivered" kg is the ESTATE weight (what the agent weighed at the estate) of
 * collected/confirmed records — it exists before the factory has graded anything.
 */
@Injectable()
export class RouteLoadService {
  constructor(
    @InjectRepository(CollectionRecordEntity)
    private readonly records: Repository<CollectionRecordEntity>,
  ) {}

  /** Average daily kg this route delivers on the days it delivers, over the last 30 days. */
  async expectedRouteKg(routeId: number, today: string): Promise<number> {
    const from = isoDaysBefore(today, LOAD_WINDOW_DAYS);
    const rows = (await this.records.find({ where: { routeId } })).filter(
      (r) =>
        DELIVERED.has(r.status) &&
        r.collectionDate >= from &&
        r.collectionDate < today,
    );
    return round1(averageDailyKg(rows));
  }

  /** The agent's highest single-day delivered kg in the last 30 days — the soft ceiling. */
  async agentDailyCeiling(agentId: number, today: string): Promise<number> {
    const from = isoDaysBefore(today, LOAD_WINDOW_DAYS);
    const rows = (await this.records.find({ where: { agentId } })).filter(
      (r) =>
        DELIVERED.has(r.status) &&
        r.collectionDate >= from &&
        r.collectionDate < today,
    );
    const byDay = sumByDay(rows);
    return round1(Math.max(0, ...byDay.values()));
  }

  /** Estate-weighed kg this agent has collected on `date`. */
  async kgCollectedToday(agentId: number, date: string): Promise<number> {
    const rows = (await this.records.find({ where: { agentId } })).filter(
      (r) => DELIVERED.has(r.status) && r.collectionDate === date,
    );
    return round1(rows.reduce((s, r) => s + Number(r.weightKg), 0));
  }

  /** Stops (records) due on `date` for a route: total / done / remaining. */
  async stopCounts(routeId: number, date: string): Promise<StopCounts> {
    const rows = (await this.records.find({ where: { routeId } })).filter(
      (r) => r.collectionDate === date,
    );
    const done = rows.filter((r) => DELIVERED.has(r.status)).length;
    return { total: rows.length, done, remaining: rows.length - done };
  }

  /** Has anyone already collected on this route today? (blocks a mid-route reassignment) */
  async hasCollectionStarted(routeId: number, date: string): Promise<boolean> {
    return (await this.stopCounts(routeId, date)).done > 0;
  }
}

function sumByDay(rows: CollectionRecordEntity[]): Map<string, number> {
  const byDay = new Map<string, number>();
  for (const r of rows) {
    byDay.set(
      r.collectionDate,
      (byDay.get(r.collectionDate) ?? 0) + Number(r.weightKg),
    );
  }
  return byDay;
}

function averageDailyKg(rows: CollectionRecordEntity[]): number {
  const byDay = sumByDay(rows);
  if (byDay.size === 0) return 0;
  return [...byDay.values()].reduce((s, v) => s + v, 0) / byDay.size;
}
