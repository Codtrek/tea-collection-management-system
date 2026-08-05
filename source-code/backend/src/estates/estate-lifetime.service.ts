import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from '../audit/audit-log.entity';
import { CollectionRecordEntity } from '../collections/collection-record.entity';
import { toAppGrade, toAppStatus, type PublicCollection } from '../collections/collection-map';
import { FertilizerChargeEntity } from '../fertilizer/fertilizer-charge.entity';
import { FertilizerRequestEntity } from '../fertilizer/fertilizer-request.entity';
import { EstateAdvanceEntity } from './estate-advance.entity';
import {
  formatEstateId,
  parseEstateId,
  toAppAdvanceStatus,
  toAppSettlementStatus,
  type PublicAdvance,
  type PublicSettlement,
} from './estate-map';
import type {
  EstateAnalytics,
  EstateLifetimeMetrics,
  PaginatedResult,
  TimelineEntry,
  TimelinePage,
} from './estate-lifetime-map';
import { EstateEntity } from './estate.entity';
import { SettlementEntity } from './settlement.entity';

/** Mirrors `CollectionsService.toPublic` — kept local since that mapper is private to its own module. */
function toPublicCollection(entity: CollectionRecordEntity): PublicCollection {
  return {
    id: entity.id,
    estateId: entity.estateRef ?? (entity.estateId !== null ? String(entity.estateId) : ''),
    estateName: entity.estateName,
    route: entity.routeName,
    weightKg: Number(entity.weightKg),
    grade: toAppGrade(entity.grade),
    status: toAppStatus(entity.status),
    date: entity.collectionDate,
    agent: entity.agentName,
    photos: entity.photos ?? [],
    timeline: entity.timeline ?? [],
    mismatch: entity.mismatch ?? undefined,
    provisional: entity.provisional ?? undefined,
    lastUpdatedBy: entity.lastUpdatedBy ?? undefined,
    lastUpdatedOn: entity.lastUpdatedOn ? entity.lastUpdatedOn.toISOString() : undefined,
  };
}

/** Mirrors `EstatesService.toPublicSettlement`. */
function toPublicSettlement(entity: SettlementEntity): PublicSettlement {
  return {
    id: entity.id,
    estateId: formatEstateId(entity.estateId),
    estateName: entity.estateName,
    period: entity.period,
    superKg: Number(entity.superKg),
    normalKg: Number(entity.normalKg),
    superRate: Number(entity.superRate),
    normalRate: Number(entity.normalRate),
    transportCost: Number(entity.transportCost),
    fertilizerDeduction: Number(entity.fertilizerDeduction),
    advanceDeduction: Number(entity.advanceDeduction),
    status: toAppSettlementStatus(entity.status),
    selfDelivery: entity.selfDelivery,
    missingBank: entity.missingBank || undefined,
    processedBy: entity.processedBy ?? undefined,
    processedOn: entity.processedOn ? entity.processedOn.toISOString() : undefined,
  };
}

/** Mirrors `EstatesService.toPublicAdvance`. */
function toPublicAdvance(entity: EstateAdvanceEntity): PublicAdvance {
  return {
    id: entity.id,
    estateId: formatEstateId(entity.estateId),
    estateName: entity.estateName,
    amount: Number(entity.amount),
    reason: entity.reason,
    dateIssued: entity.dateIssued,
    issuedBy: entity.issuedBy,
    status: toAppAdvanceStatus(entity.status),
  };
}

export interface DateRangeQuery {
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function inRange(date: string, from?: string, to?: string): boolean {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

function monthsBetween(from: Date, to: Date): number {
  return Math.max(
    0,
    (to.getFullYear() - from.getFullYear()) * 12 +
      (to.getMonth() - from.getMonth()),
  );
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

@Injectable()
export class EstateLifetimeService {
  constructor(
    @InjectRepository(EstateEntity)
    private readonly estateRepo: Repository<EstateEntity>,
    @InjectRepository(CollectionRecordEntity)
    private readonly collectionRepo: Repository<CollectionRecordEntity>,
    @InjectRepository(SettlementEntity)
    private readonly settlementRepo: Repository<SettlementEntity>,
    @InjectRepository(EstateAdvanceEntity)
    private readonly advanceRepo: Repository<EstateAdvanceEntity>,
    @InjectRepository(FertilizerRequestEntity)
    private readonly requestRepo: Repository<FertilizerRequestEntity>,
    @InjectRepository(FertilizerChargeEntity)
    private readonly chargeRepo: Repository<FertilizerChargeEntity>,
    @InjectRepository(AuditLogEntity)
    private readonly auditRepo: Repository<AuditLogEntity>,
  ) {}

  // ── §3 — the shared lifetime selector ───────────────────────────
  // Every figure the portal's Lifetime Summary strip shows comes from here —
  // no component ever sums a table. Deliveries count Confirmed records only
  // (same rule RPT-01 uses); earnings count processed settlements only,
  // as gross revenue (same rule + figure RPT-02 uses as "totalRevenue").

  async lifetime(formattedId: string): Promise<EstateLifetimeMetrics> {
    const estate = await this.findEstate(formattedId);
    const now = new Date();

    const [confirmed, processed, advances, requests, charges] =
      await Promise.all([
        this.collectionRepo.find({
          where: { estateId: estate.id, status: 'confirmed' },
        }),
        this.settlementRepo.find({
          where: { estateId: estate.id, status: 'processed' },
        }),
        this.advanceRepo.find({ where: { estateId: estate.id } }),
        this.requestRepo.find({ where: { estateId: estate.id } }),
        this.chargeRepo.find({ where: { estateId: estate.id } }),
      ]);

    const deliveredKg = confirmed.reduce((s, c) => s + Number(c.weightKg), 0);
    const superKg = confirmed
      .filter((c) => c.grade === 'super')
      .reduce((s, c) => s + Number(c.weightKg), 0);
    const normalKg = deliveredKg - superKg;

    const earnedRs = processed.reduce(
      (s, r) =>
        s +
        Number(r.superKg) * Number(r.superRate) +
        Number(r.normalKg) * Number(r.normalRate),
      0,
    );

    const fertilizerRs = charges.reduce((s, c) => s + Number(c.totalCharge), 0);
    const advancesRs = advances.reduce((s, a) => s + Number(a.amount), 0);

    const outstandingCharges = charges.filter((c) => !c.settlementId);
    const fertilizerUndeductedRs = outstandingCharges.reduce(
      (s, c) => s + Number(c.totalCharge),
      0,
    );

    const lastSettlement = [...processed].sort((a, b) =>
      (b.processedOn?.toISOString() ?? '').localeCompare(
        a.processedOn?.toISOString() ?? '',
      ),
    )[0];
    const lastSettlementRs = lastSettlement
      ? Number(lastSettlement.superKg) * Number(lastSettlement.superRate) +
        Number(lastSettlement.normalKg) * Number(lastSettlement.normalRate) -
        Number(lastSettlement.transportCost) -
        Number(lastSettlement.fertilizerDeduction) -
        Number(lastSettlement.advanceDeduction)
      : null;

    const { deliveredVsAvgPct, qualityVsAvgPct } =
      await this.compareToFactoryAverage(estate.id);

    // Dispute rollup (addendum §11 item 33) — this codebase has no dispute
    // *resolution* tracking (`mismatch` is a flag with no resolved state, and
    // the unused `complaints` table was never modeled), so `resolved` is
    // honestly 0 rather than fabricated; every flagged record counts as open.
    const disputeCount = confirmed.filter((c) => c.mismatch !== null).length;

    const registeredOn = estate.registeredOn;

    return {
      memberSince: registeredOn,
      tenureMonths: monthsBetween(new Date(registeredOn), now),
      lifetime: {
        deliveredKg: round1(deliveredKg),
        earnedRs: Math.round(earnedRs),
        fertilizerRs: Math.round(fertilizerRs),
        fertilizerOrders: requests.length,
        gradeSuperPct: deliveredKg > 0 ? round1((superKg / deliveredKg) * 100) : 0,
        gradeNormalPct: deliveredKg > 0 ? round1((normalKg / deliveredKg) * 100) : 0,
        advancesRs: Math.round(advancesRs),
      },
      outstanding: {
        fertilizerUndeductedRs: Math.round(fertilizerUndeductedRs),
        undeductedDispatchCount: outstandingCharges.length,
        lastSettlementRs: lastSettlementRs !== null ? Math.round(lastSettlementRs) : null,
        lastSettlementDate: lastSettlement?.processedOn
          ? lastSettlement.processedOn.toISOString()
          : null,
      },
      comparison: { deliveredVsAvgPct, qualityVsAvgPct },
      disputes: {
        total: disputeCount,
        resolved: 0,
        open: disputeCount,
      },
      // Route reassignment doesn't exist in this system — route is
      // system-assigned at registration and never edited (addendum §11 item
      // 34) — so there is exactly one entry, spanning the whole tenure.
      routeHistory: [
        {
          route: estate.routeName ?? 'Unassigned',
          from: registeredOn,
          to: null,
        },
      ],
    };
  }

  // ── §5 — EST-10 unified timeline ────────────────────────────────

  async timeline(
    formattedId: string,
    filters: { type?: string; from?: string; to?: string; page?: number; limit?: number },
  ): Promise<TimelinePage> {
    const estate = await this.findEstate(formattedId);
    const page = Math.max(0, filters.page ?? 0);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 25));

    const [collections, settlements, advances, chargesWithMovement, auditEntries] =
      await Promise.all([
        this.collectionRepo.find({ where: { estateId: estate.id } }),
        this.settlementRepo.find({ where: { estateId: estate.id } }),
        this.advanceRepo.find({ where: { estateId: estate.id } }),
        this.chargeRepo.find({ where: { estateId: estate.id } }),
        this.auditRepo.find({ where: { module: 'Estate Owner' } }),
      ]);

    const entries: TimelineEntry[] = [];

    for (const c of collections) {
      entries.push({
        id: `col-${c.id}`,
        type: 'Delivery',
        date: new Date(c.collectionDate).toISOString(),
        description: `Delivery ${c.id} — ${Number(c.weightKg)} kg${c.grade !== 'pending' ? ` ${c.grade === 'super' ? 'Super' : 'Normal'}` : ''}`,
        recordHref: `/collections/${c.id}`,
      });
    }

    for (const s of settlements) {
      if (s.status !== 'processed') continue;
      const net =
        Number(s.superKg) * Number(s.superRate) +
        Number(s.normalKg) * Number(s.normalRate) -
        Number(s.transportCost) -
        Number(s.fertilizerDeduction) -
        Number(s.advanceDeduction);
      entries.push({
        id: `set-${s.id}`,
        type: 'Settlement',
        date: s.processedOn ? s.processedOn.toISOString() : s.createdAt.toISOString(),
        description: `Settlement processed — Rs. ${Math.round(net).toLocaleString()} net`,
        value: Math.round(net),
        recordHref: '/estates/settlements',
      });
    }

    for (const a of advances) {
      entries.push({
        id: `adv-${a.id}`,
        type: 'Advance',
        date: new Date(a.dateIssued).toISOString(),
        description: `Advance issued — Rs. ${Number(a.amount).toLocaleString()}`,
        value: Number(a.amount),
        recordHref: '/estates/advances',
      });
    }

    for (const c of chargesWithMovement) {
      entries.push({
        id: `fert-${c.id}`,
        type: 'Fertilizer',
        date: c.calculatedAt.toISOString(),
        description: `Dispatched — ${Number(c.quantityKg)} kg — Rs. ${Math.round(Number(c.totalCharge)).toLocaleString()}${c.settlementId ? ' (deducted)' : ' (deducted at next settlement)'}`,
        value: Math.round(Number(c.totalCharge)),
        recordHref: '/fertilizer',
      });
    }

    const estateRecord = formatEstateId(estate.id);
    for (const log of auditEntries) {
      if (log.record !== estateRecord) continue;
      entries.push({
        id: `aud-${log.id}`,
        type: 'Account',
        date: log.createdAt.toISOString(),
        description: log.action + (log.details ? ` · ${log.details}` : ''),
        recordHref: '/estates',
      });
    }

    // Newest first, with Registration as the origin — always the final entry
    // of the very last page, never mixed into date-sort (it predates every
    // date-stamped record and is synthetic, not a stored row).
    entries.sort((a, b) => b.date.localeCompare(a.date));

    const filtered = entries.filter(
      (e) => (!filters.type || e.type === filters.type) && inRange(e.date, filters.from, filters.to),
    );

    const registrationEntry: TimelineEntry = {
      id: 'registered',
      type: 'Registered',
      date: new Date(estate.registeredOn).toISOString(),
      description: `Registered — ${MONTHS[new Date(estate.registeredOn).getMonth()]} ${new Date(estate.registeredOn).getFullYear()}`,
    };
    // Only surfaced when no type filter excludes it and it falls in range —
    // matches every other entry's filtering, and only appears once, on the
    // last page (it's the true end of the feed, not a repeatable event).
    const includeRegistration =
      (!filters.type || filters.type === 'Registered') &&
      inRange(registrationEntry.date, filters.from, filters.to);

    const total = filtered.length + (includeRegistration ? 1 : 0);
    const start = page * limit;
    const pageRows = filtered.slice(start, start + limit);
    const remainingAfterPage = filtered.length - (start + pageRows.length);
    if (includeRegistration && remainingAfterPage <= 0 && pageRows.length < limit) {
      pageRows.push(registrationEntry);
    }

    return {
      entries: pageRows,
      page,
      limit,
      total,
      hasMore: start + pageRows.length < total,
    };
  }

  // ── §9 — EST-09 pre-scoped analytics ────────────────────────────

  async analytics(formattedId: string): Promise<EstateAnalytics> {
    const estate = await this.findEstate(formattedId);
    const confirmed = await this.collectionRepo.find({
      where: { estateId: estate.id, status: 'confirmed' },
    });

    const byMonth = new Map<string, number>();
    for (const c of confirmed) {
      const key = c.collectionDate.slice(0, 7);
      byMonth.set(key, (byMonth.get(key) ?? 0) + Number(c.weightKg));
    }
    const processed = await this.settlementRepo.find({
      where: { estateId: estate.id, status: 'processed' },
    });
    const revenueByPeriod = new Map<string, number>();
    for (const s of processed) {
      const gross =
        Number(s.superKg) * Number(s.superRate) + Number(s.normalKg) * Number(s.normalRate);
      revenueByPeriod.set(s.period, (revenueByPeriod.get(s.period) ?? 0) + gross);
    }
    const revenueTrend = [...revenueByPeriod.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([period, revenue]) => ({
        month: period.split(' ')[0]?.slice(0, 3) ?? period,
        revenue: Math.round(revenue),
      }));

    const superKg = confirmed
      .filter((c) => c.grade === 'super')
      .reduce((s, c) => s + Number(c.weightKg), 0);
    const totalKg = confirmed.reduce((s, c) => s + Number(c.weightKg), 0);
    const superPct = totalKg > 0 ? Math.round((superKg / totalKg) * 100) : 0;

    const { deliveredVsAvgPct } = await this.compareToFactoryAverage(estate.id);
    const monthCount = Math.max(1, byMonth.size);
    const avgMonthlyKg = round1(totalKg / monthCount);
    const factoryAvg = await this.factoryAverages();

    return {
      estateId: formatEstateId(estate.id),
      estateName: estate.name,
      revenueTrend,
      gradeSplit: { superPct },
      avgMonthlyKg,
      factoryAvgMonthlyKg: factoryAvg.avgMonthlyKg,
      factoryAvgSuperPct: factoryAvg.avgSuperPct,
      deliveredVsAvgPct,
    };
  }

  // ── Per-estate paginated lists (§7) ─────────────────────────────
  // Default window: last 90 days, server-side page size 25 — a long-tenured
  // estate's tab must load one page, not its whole multi-year history.
  // Entities map to the same Public* shapes the existing global list
  // endpoints already return, so the frontend's types.ts needs no new shape.

  async deliveries(
    formattedId: string,
    q: DateRangeQuery,
  ): Promise<PaginatedResult<PublicCollection>> {
    const estate = await this.findEstate(formattedId);
    const all = await this.collectionRepo.find({ where: { estateId: estate.id } });
    const paged = this.paginate(all, q, (r) => r.collectionDate);
    return { ...paged, rows: paged.rows.map((r) => toPublicCollection(r)) };
  }

  async payments(
    formattedId: string,
    q: DateRangeQuery,
  ): Promise<PaginatedResult<PublicSettlement>> {
    const estate = await this.findEstate(formattedId);
    const all = await this.settlementRepo.find({ where: { estateId: estate.id } });
    const paged = this.paginate(all, q, (r) =>
      r.processedOn ? r.processedOn.toISOString().slice(0, 10) : r.createdAt.toISOString().slice(0, 10),
    );
    return { ...paged, rows: paged.rows.map((r) => toPublicSettlement(r)) };
  }

  async advancesFor(
    formattedId: string,
    q: DateRangeQuery,
  ): Promise<PaginatedResult<PublicAdvance>> {
    const estate = await this.findEstate(formattedId);
    const all = await this.advanceRepo.find({ where: { estateId: estate.id } });
    const paged = this.paginate(all, q, (r) => r.dateIssued);
    return { ...paged, rows: paged.rows.map((r) => toPublicAdvance(r)) };
  }

  // ── helpers ─────────────────────────────────────────────────────

  private paginate<T>(
    rows: T[],
    q: DateRangeQuery,
    dateOf: (row: T) => string,
  ): PaginatedResult<T> {
    const page = Math.max(0, q.page ?? 0);
    const limit = Math.min(100, Math.max(1, q.limit ?? 25));

    // Default window: last 90 days, unless an explicit range is given.
    const defaultFrom = new Date();
    defaultFrom.setDate(defaultFrom.getDate() - 90);
    const from = q.from ?? (q.to ? undefined : defaultFrom.toISOString().slice(0, 10));

    const filtered = rows
      .filter((r) => inRange(dateOf(r), from, q.to))
      .sort((a, b) => dateOf(b).localeCompare(dateOf(a)));

    const start = page * limit;
    return {
      rows: filtered.slice(start, start + limit),
      page,
      limit,
      total: filtered.length,
      hasMore: start + limit < filtered.length,
    };
  }

  /**
   * Trailing 6-month factory-wide average (delivered kg/month, Super%) —
   * the baseline every estate's comparison figure is measured against.
   * Deliberately a recent window, not full lifetime: "how is this estate
   * doing lately vs the factory" is more useful than dragging in 2019 data
   * for every comparison.
   */
  private async factoryAverages(): Promise<{ avgMonthlyKg: number; avgSuperPct: number }> {
    const estates = await this.estateRepo.find();
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 6);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const all = await this.collectionRepo.find({ where: { status: 'confirmed' } });
    const recent = all.filter((c) => c.collectionDate >= cutoffStr);
    const totalKg = recent.reduce((s, c) => s + Number(c.weightKg), 0);
    const superKg = recent
      .filter((c) => c.grade === 'super')
      .reduce((s, c) => s + Number(c.weightKg), 0);

    const estateCount = Math.max(1, estates.length);
    return {
      avgMonthlyKg: round1(totalKg / estateCount / 6),
      avgSuperPct: totalKg > 0 ? round1((superKg / totalKg) * 100) : 0,
    };
  }

  private async compareToFactoryAverage(
    estateId: number,
  ): Promise<{ deliveredVsAvgPct: number | null; qualityVsAvgPct: number | null }> {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 6);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const own = await this.collectionRepo.find({
      where: { estateId, status: 'confirmed' },
    });
    const recentOwn = own.filter((c) => c.collectionDate >= cutoffStr);
    const ownRecentKg = recentOwn.reduce((s, c) => s + Number(c.weightKg), 0);
    const ownMonthlyKg = round1(ownRecentKg / 6);
    const ownSuperKg = recentOwn
      .filter((c) => c.grade === 'super')
      .reduce((s, c) => s + Number(c.weightKg), 0);
    const ownSuperPct = recentOwn.length
      ? round1(
          (ownSuperKg / recentOwn.reduce((s, c) => s + Number(c.weightKg), 0)) * 100,
        )
      : null;

    const factoryAvg = await this.factoryAverages();

    const deliveredVsAvgPct =
      factoryAvg.avgMonthlyKg > 0
        ? round1(((ownMonthlyKg - factoryAvg.avgMonthlyKg) / factoryAvg.avgMonthlyKg) * 100)
        : null;
    const qualityVsAvgPct =
      ownSuperPct !== null && factoryAvg.avgSuperPct > 0
        ? round1(((ownSuperPct - factoryAvg.avgSuperPct) / factoryAvg.avgSuperPct) * 100)
        : null;

    return { deliveredVsAvgPct, qualityVsAvgPct };
  }

  private async findEstate(formattedId: string): Promise<EstateEntity> {
    const id = parseEstateId(formattedId);
    const estate = Number.isNaN(id)
      ? null
      : await this.estateRepo.findOne({ where: { id } });
    if (!estate) {
      throw new NotFoundException(`No estate "${formattedId}".`);
    }
    return estate;
  }
}
