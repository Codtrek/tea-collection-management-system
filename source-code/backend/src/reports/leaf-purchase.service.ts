import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GradeRateEntity } from '../admin/grade-rate.entity';
import { localDate } from '../dispatch/dispatch-map';
import { EstateEntity } from '../estates/estate.entity';
import { SettlementEntity } from '../estates/settlement.entity';
import {
  monthOf,
  resolvePeriod,
  toFact,
  type DateRange,
} from './collection-report-rules';
import {
  CollectionReportService,
  type CollectionReportQuery,
} from './collection-report.service';
import {
  buildLeafPurchaseReport,
  leafTrendRange,
  leafValueByMonth,
  type LeafGroupBy,
  type LeafPurchaseReport,
  type RateVersion,
  type SettlementInput,
} from './leaf-purchase-rules';
import { labelToKey } from './reports-map';

export interface LeafPurchaseQuery extends Omit<
  CollectionReportQuery,
  'groupBy'
> {
  groupBy?: LeafGroupBy;
}

const GROUPS: LeafGroupBy[] = ['estate', 'route', 'month'];

/**
 * RPT-02 — loads what the leaf-purchase rules need: graded deliveries (through the Collection
 * report's loaders, so both reports read deliveries the same way), the grade-rate versions and the
 * settlements. `buildLeafPurchaseReport` owns every figure.
 */
@Injectable()
export class LeafPurchaseService {
  constructor(
    private readonly collection: CollectionReportService,
    @InjectRepository(GradeRateEntity)
    private readonly rates: Repository<GradeRateEntity>,
    @InjectRepository(SettlementEntity)
    private readonly settlements: Repository<SettlementEntity>,
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
      this.rateVersions(),
      this.settlementRows(),
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

  /**
   * Accrued leaf value per month over a range — the Expense report's "Green leaf purchases" line.
   * Every delivery counts (no filters, demo included), like the rest of the Expense report.
   */
  async valueByMonth(range: DateRange): Promise<Map<string, number>> {
    const [rows, rates] = await Promise.all([
      this.collection.load(range),
      this.rateVersions(),
    ]);
    return leafValueByMonth(
      rows.map((r) => toFact(r)),
      rates,
    );
  }

  private async rateVersions(): Promise<RateVersion[]> {
    return (await this.rates.find()).map((r) => ({
      effectiveDate: r.effectiveDate,
      superRate: Number(r.superRate),
      normalRate: Number(r.normalRate),
    }));
  }

  private async settlementRows(): Promise<SettlementInput[]> {
    return (await this.settlements.find()).map((s) => ({
      id: s.id,
      month: labelToKey(s.period),
      status: s.status,
      superKg: Number(s.superKg),
      normalKg: Number(s.normalKg),
      superRate: Number(s.superRate),
      normalRate: Number(s.normalRate),
      transportCost: Number(s.transportCost),
      fertilizerDeduction: Number(s.fertilizerDeduction),
      advanceDeduction: Number(s.advanceDeduction),
      adjustmentAmount: Number(s.adjustmentAmount ?? 0),
    }));
  }
}
