import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { CollectionRecordEntity } from '../collections/collection-record.entity';
import { CollectionSettingsService } from '../collections/collection-settings.service';
import { localDate } from '../dispatch/dispatch-map';
import { EstateEntity } from '../estates/estate.entity';
import {
  buildCollectionReport,
  monthOf,
  resolvePeriod,
  toFact,
  type CollectionReport,
  type DateRange,
  type Grade,
  type GroupBy,
  type PeriodInput,
} from './collection-report-rules';

export interface CollectionReportQuery extends PeriodInput {
  routeId?: number;
  agentId?: number;
  estateId?: number;
  grade?: Grade;
  includeDemo?: boolean;
  groupBy?: GroupBy;
}

const GROUPS: GroupBy[] = ['estate', 'route', 'agent', 'day'];

/**
 * RPT-01 — loads the deliveries a report needs (the period, the previous period and the same
 * period last year) and hands them to `buildCollectionReport`, which owns every rule. The page,
 * its totals and the CSV export all read this one response.
 */
@Injectable()
export class CollectionReportService {
  constructor(
    @InjectRepository(CollectionRecordEntity)
    private readonly records: Repository<CollectionRecordEntity>,
    @InjectRepository(EstateEntity)
    private readonly estates: Repository<EstateEntity>,
    private readonly settings: CollectionSettingsService,
  ) {}

  async report(
    q: CollectionReportQuery,
    now: Date = new Date(),
  ): Promise<CollectionReport> {
    const today = localDate(now);
    const period = resolvePeriod(q, today);
    const [
      demo,
      current,
      previous,
      lastYear,
      estates,
      cfg,
      monthsWithData,
      picks,
    ] = await Promise.all([
      this.demoIds(),
      this.load(period),
      this.load(period.previous),
      this.load(period.lastYear),
      this.estates.find({ where: { status: 'active' } }),
      this.settings.get(),
      this.monthsWithData(),
      this.pickers(),
    ]);
    const facts = (rows: CollectionRecordEntity[]) =>
      rows.map((r) => toFact(r, demo.records.has(r.id)));
    return buildCollectionReport({
      today,
      period,
      groupBy: q.groupBy && GROUPS.includes(q.groupBy) ? q.groupBy : 'estate',
      filters: {
        routeId: q.routeId,
        agentId: q.agentId,
        estateId: q.estateId,
        grade: q.grade,
        includeDemo: q.includeDemo !== false,
      },
      tolerancePct: cfg.mismatchTolerancePct,
      current: facts(current),
      previous: facts(previous),
      lastYear: facts(lastYear),
      activeEstates: estates.map((e) => ({
        id: e.id,
        name: e.name,
        routeId: e.routeId,
        routeName: e.routeName,
        demo: demo.estates.has(e.id),
      })),
      monthsWithData: monthsWithData.filter((m) => m <= monthOf(today)),
      options: {
        ...picks,
        estates: (await this.estates.find({ order: { name: 'ASC' } })).map(
          (e) => ({
            id: e.id,
            name: e.name,
            routeName: e.routeName,
            demo: demo.estates.has(e.id),
          }),
        ),
      },
    });
  }

  private load(r: DateRange): Promise<CollectionRecordEntity[]> {
    return this.records.find({
      where: { collectionDate: Between(r.from, r.to) },
    });
  }

  /** Routes and agents that have delivered leaf — the filter pickers (latest name wins). */
  private async pickers(): Promise<{
    routes: { id: number; name: string }[];
    agents: { id: number; name: string }[];
  }> {
    const pick = (col: 'route' | 'agent') =>
      this.records.manager.query<{ id: number; name: string }[]>(
        `SELECT id, name FROM (
           SELECT DISTINCT ON (${col}_id) ${col}_id AS id, ${col}_name AS name
             FROM tea_collection_records
            WHERE ${col}_id IS NOT NULL AND status IN ('collected', 'confirmed')
            ORDER BY ${col}_id, collection_date DESC
         ) x ORDER BY name`,
      );
    const [routes, agents] = await Promise.all([pick('route'), pick('agent')]);
    return { routes, agents };
  }

  /** Months that have any delivered leaf, newest first — the month picker's options. */
  private async monthsWithData(): Promise<string[]> {
    const rows = await this.records.manager.query<{ month: string }[]>(
      `SELECT DISTINCT to_char(collection_date, 'YYYY-MM') AS month
         FROM tea_collection_records
        WHERE status IN ('collected', 'confirmed')
        ORDER BY 1 DESC`,
    );
    return rows.map((r) => r.month);
  }

  /**
   * Rows the local demo seed created (its `demo_seed_rows` registry). The table only exists where
   * the demo seed has run, so elsewhere nothing is demo.
   */
  private async demoIds(): Promise<{
    records: Set<string>;
    estates: Set<number>;
  }> {
    const empty = { records: new Set<string>(), estates: new Set<number>() };
    const [{ t }] = await this.records.manager.query<{ t: string | null }[]>(
      `SELECT to_regclass('public.demo_seed_rows') AS t`,
    );
    if (!t) return empty;
    const rows = await this.records.manager.query<
      { table_name: string; id: string }[]
    >(
      `SELECT table_name, row_key->>'id' AS id
         FROM demo_seed_rows
        WHERE table_name IN ('tea_collection_records', 'estates')`,
    );
    for (const r of rows) {
      if (r.table_name === 'estates') empty.estates.add(Number(r.id));
      else empty.records.add(r.id);
    }
    return empty;
  }
}
