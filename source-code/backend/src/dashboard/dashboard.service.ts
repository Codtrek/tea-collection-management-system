import { Injectable } from '@nestjs/common';
import { MODULE_KEYS } from '../admin/admin-map';
import type { PublicAuditEntry } from '../audit/audit-map';
import { AuditService } from '../audit/audit.service';
import type { PublicCollection } from '../collections/collection-map';
import { CollectionsService } from '../collections/collections.service';
import { GradingService } from '../collections/grading.service';
import { DispatchAccessService } from '../dispatch/dispatch-access.service';
import { localDate } from '../dispatch/dispatch-map';
import { DispatchService } from '../dispatch/dispatch.service';
import { AdvanceViewService } from '../employees/advance-view.service';
import { PayAdjustmentService } from '../employees/pay-adjustment.service';
import type { MonthReadiness } from '../employees/payroll-view';
import { PayrollViewService } from '../employees/payroll-view.service';
import { ALL_PERIODS } from '../estates/settlement-view';
import { SettlementViewService } from '../estates/settlement-view.service';
import { TransportStatusService } from '../estates/transport-status.service';
import { FertilizerDeliveryService } from '../fertilizer/fertilizer-delivery.service';
import type { PublicRequest } from '../fertilizer/fertilizer-map';
import { FertilizerViewService } from '../fertilizer/fertilizer-view.service';
import { FertilizerService } from '../fertilizer/fertilizer.service';
import { HolidayService } from '../holidays/holiday.service';
import type { CollectionReport } from '../reports/collection-report-rules';
import { CollectionReportService } from '../reports/collection-report.service';
import { FinanceService } from '../reports/finance.service';
import { LeafPurchaseService } from '../reports/leaf-purchase.service';
import {
  type ActionCandidate,
  type ActionItem,
  type AgentCounts,
  type FertilizerToday,
  type Perms,
  addDays,
  agentCounts,
  canAct,
  fertilizerToday,
  formatDay,
  formatRs,
  monthName,
  needsAction,
  oldest,
  plural,
  previousMonth,
  primaryAction,
  showsFigure,
  showsSection,
  toDecideCount,
  ungradedOlderThan,
  ungradedOn,
  visibleActivity,
  waitingForGrading,
} from './dashboard-rules';

export interface DashboardActor {
  name: string;
  role: 'Administrator' | 'Officer' | 'Manager';
  sub?: number;
}

const OLD_UNGRADED_DAYS = 7;

/** One kg-and-deliveries figure, with what it is compared against. */
export interface IntakeFigure {
  kg: number;
  deliveries: number;
  /** null when the comparison period had no deliveries */
  compareKg: number | null;
  changePct: number | null;
}

/** The report's own comparison window, e.g. 1–17 Oct for 1–17 Nov. */
export interface CompareWindow {
  from: string;
  to: string;
}

/** Pending settlements, and what holds them (the queue row and the month panel read the same). */
export interface SettlementState {
  pending: number;
  noBank: number;
  /** a pending month has no transport version: nothing can be processed */
  transportMissing: boolean;
  href: string;
}

export type Section = 'actions' | 'today' | 'month' | 'charts' | 'activity';

export interface DashboardSummary {
  generatedAt: string;
  /** factory calendar (Asia/Colombo) */
  today: string;
  month: string;
  role: DashboardActor['role'];
  actions: ActionItem[];
  /** the page's one primary button: the top queue item's action; null with an empty queue */
  primaryAction: { label: string; href: string; key: string } | null;
  /** "Review approvals (N)": the To decide items */
  toDecide: number;
  todayView: {
    leaf?: IntakeFigure & {
      /** the same weekday last week, whole day */
      compareDate: string;
      href: string;
    };
    grading?: {
      waiting: number;
      waitingHref: string;
      overTolerance: number;
      tolerancePct: number;
      mismatchHref: string;
    };
    agents?: AgentCounts & { href: string };
    fertilizer?: FertilizerToday & { href: string };
  } | null;
  monthView: {
    label: string;
    intake?: IntakeFigure & {
      compare: CompareWindow;
      lastYearKg: number | null;
      yoyPct: number | null;
      superShare: number | null;
      superKg: number;
      normalKg: number;
      href: string;
    };
    leafPurchase?: {
      valueRs: number;
      rsPerKg: number | null;
      changePct: number | null;
      href: string;
    };
    expenses?: { totalRs: number; changePct: number | null; href: string };
    payroll?: {
      month: string;
      status: MonthReadiness;
      lastMonth: string;
      lastMonthStatus: MonthReadiness;
      href: string;
    };
    settlements?: SettlementState;
  } | null;
  charts: {
    daily: {
      key: string;
      label: string;
      kg: number;
      deliveries: number;
      partial: boolean;
      lastMonthKg: number | null;
    }[];
    lastMonthLabel: string;
    /** the report's change against the same days last month (the takeaway) */
    changePct: number | null;
    compare: CompareWindow;
    byRoute: {
      id: number | null;
      name: string;
      kg: number;
      deliveries: number;
    }[];
    href: string;
  } | null;
  activity: PublicAuditEntry[];
  /** a section whose source failed: shown as an inline error in that block only */
  errors: Partial<Record<Section, string>>;
}

const q = (params: Record<string, string>) =>
  new URLSearchParams(params).toString();

/** One section's failure stays in that section. */
async function guard<T>(
  section: Section,
  errors: DashboardSummary['errors'],
  work: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await work();
  } catch {
    errors[section] = `Couldn't load this section.`;
    return fallback;
  }
}

/**
 * GET /dashboard/summary (Dashboard-Addendum). Built only from the services the linked pages
 * already use, each with the same inputs, so every count equals the list it opens. Sections and
 * items the role may not see are never computed.
 */
@Injectable()
export class DashboardService {
  constructor(
    private readonly access: DispatchAccessService,
    private readonly collectionReport: CollectionReportService,
    private readonly leafPurchase: LeafPurchaseService,
    private readonly finance: FinanceService,
    private readonly dispatch: DispatchService,
    private readonly fertilizerView: FertilizerViewService,
    private readonly fertilizer: FertilizerService,
    private readonly fertilizerDeliveries: FertilizerDeliveryService,
    private readonly collections: CollectionsService,
    private readonly grading: GradingService,
    private readonly advances: AdvanceViewService,
    private readonly payroll: PayrollViewService,
    private readonly payChanges: PayAdjustmentService,
    private readonly holidays: HolidayService,
    private readonly settlements: SettlementViewService,
    private readonly transport: TransportStatusService,
    private readonly audit: AuditService,
  ) {}

  async perms(role: string): Promise<Perms> {
    const levels = await Promise.all(
      MODULE_KEYS.map((m) => this.access.levelFor(role, m)),
    );
    return Object.fromEntries(MODULE_KEYS.map((m, i) => [m, levels[i]]));
  }

  async summary(
    actor: DashboardActor,
    now: Date = new Date(),
  ): Promise<DashboardSummary> {
    const perms = await this.perms(actor.role);
    const today = localDate(now);
    const month = today.slice(0, 7);
    const lastMonth = previousMonth(month);
    const has = (f: Parameters<typeof showsFigure>[1]) => showsFigure(perms, f);
    const errors: DashboardSummary['errors'] = {};
    // a shared load is awaited inside each section that uses it, so its failure marks those
    // sections (and only those) as errored; the no-op catch only stops an unhandled rejection
    const shared = <T>(load: () => Promise<T>): Promise<T> => {
      const p = load();
      p.catch(() => undefined);
      return p;
    };
    const none = Promise.resolve(null);

    // shared lists, loaded once, only when something on the page needs them
    const needCollections =
      (showsSection(actor.role, 'today') && has('grading')) ||
      canAct(perms, 'ungradedOld') ||
      canAct(perms, 'gradingCorrections');
    const needRequests =
      (showsSection(actor.role, 'today') && has('fertilizerToday')) ||
      canAct(perms, 'fertilizerToDecide') ||
      canAct(perms, 'fertilizerManager') ||
      canAct(perms, 'staleAllocations');
    const needSettlements =
      canAct(perms, 'settlementsToProcess') ||
      canAct(perms, 'estatesNoBank') ||
      (showsSection(actor.role, 'month') &&
        (perms.estateOwners ?? 'none') !== 'none');
    const collectionsP = needCollections
      ? shared(() => this.collections.findAll())
      : none;
    const requestsP = needRequests
      ? shared(() => this.fertilizerRequests())
      : none;
    const reportP =
      (showsSection(actor.role, 'month') && has('intake')) || has('charts')
        ? shared(() => this.collectionReport.report({ thisMonth: true }, now))
        : none;
    const settlementsP = needSettlements
      ? shared(() => this.settlementState())
      : none;

    const [todayView, monthView, charts, actions, activity] = await Promise.all(
      [
        showsSection(actor.role, 'today')
          ? guard(
              'today',
              errors,
              async () =>
                this.todayView(
                  perms,
                  today,
                  now,
                  await collectionsP,
                  await requestsP,
                ),
              null,
            )
          : null,
        showsSection(actor.role, 'month')
          ? guard(
              'month',
              errors,
              async () =>
                this.monthView(
                  perms,
                  month,
                  lastMonth,
                  now,
                  await reportP,
                  await settlementsP,
                ),
              null,
            )
          : null,
        has('charts')
          ? guard(
              'charts',
              errors,
              async () => this.charts(await reportP, lastMonth, now),
              null,
            )
          : null,
        guard(
          'actions',
          errors,
          async () =>
            this.actions(
              perms,
              actor,
              today,
              lastMonth,
              now,
              await collectionsP,
              await requestsP,
              await settlementsP,
            ),
          [],
        ),
        guard(
          'activity',
          errors,
          () =>
            this.audit.list().then((all) => visibleActivity(all, perms, 10)),
          [],
        ),
      ],
    );

    return {
      generatedAt: now.toISOString(),
      today,
      month,
      role: actor.role,
      actions,
      primaryAction: primaryAction(actions),
      toDecide: toDecideCount(actions),
      todayView,
      monthView,
      charts,
      activity,
      errors,
    };
  }

  /** The queue's own read path: reconcile first, then list (GET /fertilizer/requests). */
  private async fertilizerRequests(): Promise<PublicRequest[]> {
    await this.fertilizerDeliveries.reconcile();
    return this.fertilizerView.list();
  }

  /**
   * Every pending settlement (the list's own rows), how many have no bank details, and whether any
   * pending month has no transport version — the settlement page refuses those.
   */
  private async settlementState(): Promise<SettlementState> {
    const pending = await this.settlements.list({
      month: ALL_PERIODS,
      status: 'Pending',
      limit: 0,
    });
    const periods = [...new Set(pending.rows.map((r) => r.period))];
    const statuses = await Promise.all(
      periods.map((p) => this.transport.forPeriod(p)),
    );
    return {
      pending: pending.total,
      noBank: pending.rows.filter((r) => r.missingBank).length,
      transportMissing: statuses.some((s) => !s.configured),
      href: `/estates/settlements?${q({ month: ALL_PERIODS, status: 'Pending' })}`,
    };
  }

  private async todayView(
    perms: Perms,
    today: string,
    now: Date,
    collections: PublicCollection[] | null,
    requests: PublicRequest[] | null,
  ): Promise<NonNullable<DashboardSummary['todayView']>> {
    const lastWeek = addDays(today, -7);
    const view: NonNullable<DashboardSummary['todayView']> = {};
    const leafOrGrading = showsFigure(perms, 'leafToday');
    const [todayReport, lastWeekReport, board] = await Promise.all([
      leafOrGrading
        ? this.collectionReport.report({ from: today, to: today }, now)
        : null,
      leafOrGrading
        ? this.collectionReport.report({ from: lastWeek, to: lastWeek }, now)
        : null,
      showsFigure(perms, 'agents') ? this.dispatch.board(now, today) : null,
    ]);
    if (todayReport && lastWeekReport) {
      const kg = todayReport.cards.factoryKg.value;
      const prevKg = lastWeekReport.cards.deliveries.value
        ? lastWeekReport.cards.factoryKg.value
        : null;
      view.leaf = {
        kg,
        deliveries: todayReport.cards.deliveries.value,
        compareKg: prevKg,
        changePct:
          prevKg === null || prevKg === 0
            ? null
            : Math.round(((kg - prevKg) / prevKg) * 1000) / 10,
        compareDate: lastWeek,
        href: `/reports/collection?${q({ from: today, to: today })}`,
      };
      if (collections && showsFigure(perms, 'grading')) {
        view.grading = {
          waiting: ungradedOn(collections, today),
          waitingHref: `/collections?${q({ grade: 'Ungraded', status: 'Collected', date: today })}`,
          overTolerance: todayReport.cards.weightDiff.overTolerance.length,
          tolerancePct: todayReport.tolerancePct,
          mismatchHref: `/reports/collection?${q({ from: today, to: today })}#weight-differences`,
        };
      }
    }
    if (board) {
      view.agents = { ...agentCounts(board), href: '/collections/dispatch' };
    }
    if (requests && showsFigure(perms, 'fertilizerToday')) {
      view.fertilizer = {
        ...fertilizerToday(requests, today),
        href: `/fertilizer/requests?${q({ tab: 'all', scope: 'today' })}`,
      };
    }
    return view;
  }

  private async monthView(
    perms: Perms,
    month: string,
    lastMonth: string,
    now: Date,
    report: CollectionReport | null,
    settlementState: SettlementState | null,
  ): Promise<NonNullable<DashboardSummary['monthView']>> {
    const view: NonNullable<DashboardSummary['monthView']> = {
      label: report?.period.label ?? `${monthName(month)} so far`,
    };
    const [leaf, expenses, payrollNow, payrollLast] = await Promise.all([
      showsFigure(perms, 'leafPurchase')
        ? this.leafPurchase.report({ thisMonth: true }, now)
        : null,
      showsFigure(perms, 'expenses')
        ? this.finance.expenseReport({ thisMonth: true }, now)
        : null,
      showsFigure(perms, 'payroll')
        ? this.payroll.month({ month, limit: 1 }, now)
        : null,
      showsFigure(perms, 'payroll')
        ? this.payroll.month({ month: lastMonth, limit: 1 }, now)
        : null,
    ]);
    if (report && showsFigure(perms, 'intake')) {
      const c = report.cards.factoryKg;
      view.intake = {
        kg: c.value,
        deliveries: report.cards.deliveries.value,
        compareKg: c.previous,
        changePct: c.changePct,
        compare: report.period.previous,
        lastYearKg: c.lastYear,
        yoyPct: c.yoyPct,
        superShare: report.cards.superShare.value,
        superKg: report.gradeSplit.superKg,
        normalKg: report.gradeSplit.normalKg,
        href: `/reports/collection?${q({ thisMonth: '1' })}`,
      };
    }
    if (leaf) {
      view.leafPurchase = {
        valueRs: leaf.cards.leafValue.value,
        rsPerKg: leaf.cards.pricePerKg.value,
        changePct: leaf.cards.leafValue.changePct,
        href: `/reports/leaf-purchases?${q({ thisMonth: '1' })}`,
      };
    }
    if (expenses) {
      view.expenses = {
        totalRs: expenses.cards.total.value,
        changePct: expenses.cards.total.changePct,
        href: `/reports/expenses?${q({ thisMonth: '1' })}`,
      };
    }
    if (payrollNow && payrollLast) {
      view.payroll = {
        month,
        status: payrollNow.readiness.status,
        lastMonth,
        lastMonthStatus: payrollLast.readiness.status,
        href: `/employees/payroll?${q({ month: lastMonth })}`,
      };
    }
    if (settlementState) view.settlements = settlementState;
    return view;
  }

  private async charts(
    report: CollectionReport | null,
    lastMonth: string,
    now: Date,
  ): Promise<NonNullable<DashboardSummary['charts']>> {
    if (!report) throw new Error('no collection report');
    const prev = await this.collectionReport.report({ month: lastMonth }, now);
    return {
      // last month aligned by day of the month (1st with 1st)
      daily: report.trend.points.map((p, i) => ({
        ...p,
        lastMonthKg: prev.trend.points[i]?.kg ?? null,
      })),
      lastMonthLabel: monthName(lastMonth),
      changePct: report.cards.factoryKg.changePct,
      compare: report.period.previous,
      byRoute: report.byRoute,
      href: `/reports/collection?${q({ thisMonth: '1' })}`,
    };
  }

  /** "Needs your action": only the items this role may act on are counted at all. */
  private async actions(
    perms: Perms,
    actor: DashboardActor,
    today: string,
    lastMonth: string,
    now: Date,
    collections: PublicCollection[] | null,
    requests: PublicRequest[] | null,
    settlementState: SettlementState | null,
  ): Promise<ActionItem[]> {
    const can = (k: Parameters<typeof canAct>[1]) => canAct(perms, k);
    const out: ActionCandidate[] = [];
    const lastMonthName = monthName(lastMonth);

    const [
      payrollLast,
      payrollPending,
      payrollNoBank,
      advances,
      payChanges,
      holidays,
      alerts,
      corrections,
    ] = await Promise.all([
      can('payrollDue')
        ? this.payroll.month({ month: lastMonth, limit: 1 }, now)
        : null,
      can('payrollDue')
        ? this.payroll.month(
            { month: lastMonth, status: 'Pending', limit: 1 },
            now,
          )
        : null,
      can('employeesNoBank')
        ? this.payroll.month(
            { month: lastMonth, issues: ['noBank'], limit: 1 },
            now,
          )
        : null,
      can('salaryAdvances')
        ? this.advances.list({ tab: 'decide', sort: 'date', dir: 'asc' })
        : null,
      can('payChanges') ? this.payChanges.list(actor) : null,
      can('holidayRequests')
        ? this.holidays.year(Number(today.slice(0, 4)), actor, now)
        : null,
      can('expiredStock') ? this.fertilizer.expiryAlerts(now) : null,
      can('gradingCorrections')
        ? this.grading.pendingCorrectionDeliveryIds()
        : null,
    ]);

    if (payrollLast) {
      const status = payrollLast.readiness.status;
      if (status === 'No payroll') {
        out.push({
          key: 'payrollDue',
          count: 1,
          label: `payroll month not generated (${lastMonthName})`,
          reason: `${lastMonthName} has ended; generate its payroll from attendance`,
          href: `/employees/payroll?${q({ month: lastMonth })}`,
          action: 'Generate payroll',
        });
      } else if (
        (status === 'Ready to process' || status === 'Issues to fix') &&
        payrollPending
      ) {
        const blocking = payrollLast.readiness.blocking;
        out.push({
          key: 'payrollDue',
          count: payrollPending.total,
          label: `${plural(payrollPending.total, 'employee')} to pay for ${lastMonthName}`,
          reason:
            status === 'Issues to fix'
              ? `${blocking} blocked: no bank details`
              : 'Ready to process',
          href: `/employees/payroll?${q({ month: lastMonth, status: 'Pending' })}`,
          action: 'Review payroll',
        });
      }
    }
    if (settlementState && can('settlementsToProcess')) {
      const s = settlementState;
      out.push({
        key: 'settlementsToProcess',
        count: s.pending,
        label: `${plural(s.pending, 'estate settlement')} to process`,
        // never a "ready" count while transport isn't set: nothing can be processed
        reason: s.transportMissing
          ? 'Blocked: monthly transport amount not set'
          : s.noBank > 0
            ? `${s.noBank} blocked: no bank details`
            : null,
        blocked: s.transportMissing || undefined,
        href: s.href,
      });
    }
    if (settlementState && can('estatesNoBank')) {
      const s = settlementState;
      out.push({
        key: 'estatesNoBank',
        count: s.noBank,
        label: `${plural(s.noBank, 'estate')} missing bank details`,
        reason: `Blocks ${s.noBank} of ${plural(s.pending, 'pending settlement')}`,
        blocks: 'settlementsToProcess',
        href: `/estates/settlements?${q({ month: ALL_PERIODS, status: 'Pending', bank: 'missing' })}`,
      });
    }
    if (advances) {
      const n = advances.tabCounts.decide;
      const first = advances.rows[0];
      out.push({
        key: 'salaryAdvances',
        count: n,
        label: `${plural(n, 'salary advance')} to decide`,
        reason:
          n === 1 && first
            ? `${formatRs(first.amount)} requested by ${first.employeeName}`
            : first
              ? `Oldest requested ${formatDay(first.dateRequested)}`
              : null,
        href: '/employees/advances',
      });
    }
    if (requests) {
      const decide = requests.filter((r) => r.status === 'Requested');
      const manager = requests.filter(
        (r) => r.status === 'Awaiting manager approval',
      );
      const since = (rows: PublicRequest[]) => {
        const d = oldest(rows.map((r) => r.requestedDate));
        return d ? `Oldest requested ${formatDay(d)}` : null;
      };
      out.push(
        {
          key: 'fertilizerToDecide',
          count: decide.length,
          label: `${plural(decide.length, 'fertilizer request')} to decide`,
          reason: since(decide),
          href: `/fertilizer/requests?${q({ status: 'Requested' })}`,
        },
        {
          key: 'fertilizerManager',
          count: manager.length,
          label: `${plural(manager.length, 'fertilizer request')} awaiting manager approval`,
          reason: since(manager),
          href: `/fertilizer/requests?${q({ status: 'Awaiting manager approval' })}`,
        },
      );
      const stale = requests.filter((r) => r.staleCommittedKg > 0).length;
      out.push({
        key: 'staleAllocations',
        count: stale,
        label: `${plural(stale, 'request')} holding expired stock`,
        reason: 'Move the allocation to live stock before dispatch',
        href: `/fertilizer/requests?${q({ tab: 'all', scope: 'stale' })}`,
      });
    }
    if (corrections) {
      const n = corrections.length;
      out.push({
        key: 'gradingCorrections',
        count: n,
        label: `${plural(n, 'grading correction')} to approve`,
        reason: 'Each one is decided on its delivery',
        href: `/collections?${q({ corrections: 'pending' })}`,
      });
    }
    if (payChanges) {
      const mine = payChanges.filter(
        (a) => a.status === 'pending' && a.approval.canDecide,
      );
      const d = oldest(mine.map((a) => a.requestedAt));
      out.push({
        key: 'payChanges',
        count: mine.length,
        label: `${plural(mine.length, 'pay change')} awaiting approval`,
        reason: d ? `Oldest prepared ${formatDay(d)}` : null,
        href: `/employees/pay-rates?${q({ changes: 'decide' })}`,
      });
    }
    if (holidays) {
      const n = holidays.pending.length;
      const d = oldest(holidays.pending.map((h) => h.dateFrom));
      out.push({
        key: 'holidayRequests',
        count: n,
        label: `${plural(n, 'holiday request')} to decide`,
        reason: d ? `Earliest starts ${formatDay(d)}` : null,
        href: '/holidays',
      });
    }
    if (alerts) {
      const n = alerts.summary.expired.count;
      out.push({
        key: 'expiredStock',
        count: n,
        label: `${plural(n, 'expired fertilizer batch', 'expired fertilizer batches')} to write off`,
        reason: `${alerts.summary.expired.kg.toLocaleString('en-US')} kg; written off on Expiry Alerts`,
        href: '/fertilizer/alerts#expired',
      });
    }
    if (collections && can('ungradedOld')) {
      const cutoff = addDays(today, -OLD_UNGRADED_DAYS);
      const old = collections.filter(
        (c) => waitingForGrading(c) && c.date <= cutoff,
      );
      const n = ungradedOlderThan(collections, today, OLD_UNGRADED_DAYS);
      const d = oldest(old.map((c) => c.date));
      out.push({
        key: 'ungradedOld',
        count: n,
        label: `${plural(n, 'delivery', 'deliveries')} ungraded for more than ${OLD_UNGRADED_DAYS} days`,
        reason: d
          ? `Oldest delivered ${formatDay(d)}; ungraded leaf can't be settled`
          : null,
        href: `/collections?${q({ grade: 'Ungraded', status: 'Collected', olderThan: String(OLD_UNGRADED_DAYS) })}`,
      });
    }
    if (payrollNoBank) {
      const n = payrollNoBank.total;
      out.push({
        key: 'employeesNoBank',
        count: n,
        label: `${plural(n, 'employee')} missing bank details`,
        reason: `Blocks ${lastMonthName} payroll`,
        blocks: 'payrollDue',
        href: `/employees/payroll?${q({ month: lastMonth, issues: 'noBank' })}`,
      });
    }
    return needsAction(out, perms);
  }
}
