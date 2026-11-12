import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { localDate } from '../dispatch/dispatch-map';
import { EstateEntity } from '../estates/estate.entity';
import { monthOf, resolvePeriod, toFact } from './collection-report-rules';
import { FinanceService } from './finance.service';
import {
  CollectionReportService,
  type CollectionReportQuery,
} from './collection-report.service';
import {
  buildLeafPurchaseReport,
  leafTrendRange,
  type LeafGroupBy,
  type LeafPurchaseReport,
} from './leaf-purchase-rules';

export interface LeafPurchaseQuery extends Omit<
  CollectionReportQuery,
  'groupBy'
> {
  groupBy?: LeafGroupBy;
}

const GROUPS: LeafGroupBy[] = ['estate', 'route', 'month'];

/**
 * RPT-02 — loads what the leaf-purchase rules need: graded deliveries (through the Collection
 * report's loaders, so both reports read deliveries the same way), and the grade-rate versions and
 * settlements through FinanceService — the same loaders the Expense report reads, so the two pages
 * can't disagree. `buildLeafPurchaseReport` owns every figure.
 */
@Injectable()
export class LeafPurchaseService {
  constructor(
    private readonly collection: CollectionReportService,
    private readonly finance: FinanceService,
    @InjectRepository(EstateEntity)
    private readonly estates: Repository<EstateEntity>,
  ) {}

  async report(
    q: LeafPurchaseQuery,
    now: Date = new Date(),
  ): Promise<LeafPurchaseReport> {
    const today = localDate(now);
    const period = resolvePeriod(q, today);
    const trendRange = leafTrendRange(period);
    const [
      demo,
      current,
      previous,
      lastYear,
      trend,
      rates,
      settlements,
      months,
      picks,
      estates,
    ] = await Promise.all([
      this.collection.demoIds(),
      this.collection.load(period),
      this.collection.load(period.previous),
      this.collection.load(period.lastYear),
      this.collection.load(trendRange),
      this.finance.rateVersions(),
      this.finance.settlementRows(),
      this.collection.monthsWithData(),
      this.collection.pickers(),
      this.estates.find({ order: { name: 'ASC' } }),
    ]);
    const facts = (
      rows: Awaited<ReturnType<CollectionReportService['load']>>,
    ) => rows.map((r) => toFact(r, demo.records.has(r.id)));
    return buildLeafPurchaseReport({
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
      rates,
      processedSettlementIds: new Set(
        settlements.filter((s) => s.status === 'processed').map((s) => s.id),
      ),
      settlements,
      current: facts(current),
      previous: facts(previous),
      lastYear: facts(lastYear),
      trend: facts(trend),
      monthsWithData: months.filter((m) => m <= monthOf(today)),
      options: {
        routes: picks.routes,
        estates: estates.map((e) => ({
          id: e.id,
          name: e.name,
          routeName: e.routeName,
          demo: demo.estates.has(e.id),
        })),
      },
    });
  }
}
