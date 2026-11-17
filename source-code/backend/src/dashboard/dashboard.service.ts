import { Injectable } from '@nestjs/common';
import { MODULE_KEYS } from '../admin/admin-map';
import type { PublicAuditEntry } from '../audit/audit-map';
import { AuditService } from '../audit/audit.service';
import { CollectionsService } from '../collections/collections.service';
import { GradingService } from '../collections/grading.service';
import { DispatchAccessService } from '../dispatch/dispatch-access.service';
import { localDate } from '../dispatch/dispatch-map';
import { DispatchService } from '../dispatch/dispatch.service';
import { AdvanceViewService } from '../employees/advance-view.service';
import { PayAdjustmentService } from '../employees/pay-adjustment.service';
import type { MonthReadiness } from '../employees/payroll-view';
import { PayrollViewService } from '../employees/payroll-view.service';
import { SettlementViewService } from '../estates/settlement-view.service';
import { ALL_PERIODS } from '../estates/settlement-view';
import { FertilizerDeliveryService } from '../fertilizer/fertilizer-delivery.service';
import type { PublicRequest } from '../fertilizer/fertilizer-map';
import { FertilizerViewService } from '../fertilizer/fertilizer-view.service';
import { FertilizerService } from '../fertilizer/fertilizer.service';
import { HolidayService } from '../holidays/holiday.service';
import { CollectionReportService } from '../reports/collection-report.service';
import type { CollectionReport } from '../reports/collection-report-rules';
import { FinanceService } from '../reports/finance.service';
import { LeafPurchaseService } from '../reports/leaf-purchase.service';
import type { PublicCollection } from '../collections/collection-map';
import {
  type ActionItem,
  type AgentCounts,
  type FertilizerToday,
  type Perms,
  addDays,
  agentCounts,
  canAct,
  fertilizerToday,
  monthName,
  needsAction,
  plural,
  previousMonth,
  type QuickAction,
  quickActions,
  showsFigure,
  showsSection,
  ungradedOlderThan,
  ungradedOn,
  visibleActivity,
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

export interface DashboardSummary {
  generatedAt: string;
  /** factory calendar (Asia/Colombo) */
  today: string;
  month: string;
  role: DashboardActor['role'];
  actions: ActionItem[];
  quickActions: QuickAction[];
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
      lastYearKg: number | null;
      yoyPct: number | null;
      superShare: number | null;
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
    byRoute: {
      id: number | null;
      name: string;
      kg: number;
      deliveries: number;
    }[];
    href: string;
  } | null;
  activity: PublicAuditEntry[];
}

const q = (params: Record<string, string>) =>
  new URLSearchParams(params).toString();

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
    const [collections, requests, thisMonthReport] = await Promise.all([
      needCollections ? this.collections.findAll() : null,
      needRequests ? this.fertilizerRequests() : null,
      (showsSection(actor.role, 'month') && has('intake')) || has('charts')
        ? this.collectionReport.report({ thisMonth: true }, now)
        : null,
    ]);

    const [todayView, monthView, charts, actions, activity] = await Promise.all(
      [
        showsSection(actor.role, 'today')
          ? this.todayView(perms, today, now, collections, requests)
          : null,
        showsSection(actor.role, 'month')
          ? this.monthView(perms, month, lastMonth, now, thisMonthReport)
          : null,
        has('charts') && thisMonthReport
          ? this.charts(thisMonthReport, lastMonth, now)
          : null,
        this.actions(
          perms,
          actor,
          today,
          lastMonth,
          now,
          collections,
          requests,
        ),
        this.audit.list().then((all) => visibleActivity(all, perms, 10)),
      ],
    );

    return {
      generatedAt: now.toISOString(),
      today,
      month,
      role: actor.role,
      actions,
      quickActions: quickActions(actor.role, perms, actions.length),
      todayView,
      monthView,
      charts,
      activity,
    };
  }

  /** The queue's own read path: reconcile first, then list (GET /fertilizer/requests). */
  private async fertilizerRequests(): Promise<PublicRequest[]> {
    await this.fertilizerDeliveries.reconcile();
    return this.fertilizerView.list();
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
        lastYearKg: c.lastYear,
        yoyPct: c.yoyPct,
        superShare: report.cards.superShare.value,
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
    return view;
  }

  private async charts(
    report: CollectionReport,
    lastMonth: string,
    now: Date,
  ): Promise<NonNullable<DashboardSummary['charts']>> {
    const prev = await this.collectionReport.report({ month: lastMonth }, now);
    return {
      // last month aligned by day of the month (1st with 1st)
      daily: report.trend.points.map((p, i) => ({
        ...p,
        lastMonthKg: prev.trend.points[i]?.kg ?? null,
      })),
      lastMonthLabel: monthName(lastMonth),
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
  ): Promise<ActionItem[]> {
    const can = (k: Parameters<typeof canAct>[1]) => canAct(perms, k);
    const out: Omit<ActionItem, 'urgency'>[] = [];
    const lastMonthName = monthName(lastMonth);

    const [
      payrollLast,
      payrollPending,
      payrollNoBank,
      settlementsPending,
      settlementsNoBank,
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
      can('settlementsToProcess')
        ? this.settlements.list({
            month: ALL_PERIODS,
            status: 'Pending',
            limit: 1,
          })
        : null,
      can('estatesNoBank')
        ? this.settlements.list({
            month: ALL_PERIODS,
            status: 'Pending',
            noBank: true,
            limit: 1,
          })
        : null,
      can('salaryAdvances')
        ? this.advances.list({ tab: 'decide', limit: 1 })
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
          href: `/employees/payroll?${q({ month: lastMonth })}`,
        });
      } else if (
        (status === 'Ready to process' || status === 'Issues to fix') &&
        payrollPending
      ) {
        out.push({
          key: 'payrollDue',
          count: payrollPending.total,
          label: `${plural(payrollPending.total, 'employee')} to pay for ${lastMonthName}`,
          href: `/employees/payroll?${q({ month: lastMonth, status: 'Pending' })}`,
        });
      }
    }
    if (settlementsPending) {
      const n = settlementsPending.total;
      out.push({
        key: 'settlementsToProcess',
        count: n,
        label: `${plural(n, 'estate settlement')} to process`,
        href: `/estates/settlements?${q({ month: ALL_PERIODS, status: 'Pending' })}`,
      });
    }
    if (advances) {
      const n = advances.tabCounts.decide;
      out.push({
        key: 'salaryAdvances',
        count: n,
        label: `${plural(n, 'salary advance')} to decide`,
        href: '/employees/advances',
      });
    }
    if (requests) {
      const by = (s: string) => requests.filter((r) => r.status === s).length;
      const decide = by('Requested');
      const manager = by('Awaiting manager approval');
      out.push(
        {
          key: 'fertilizerToDecide',
          count: decide,
          label: `${plural(decide, 'fertilizer request')} to decide`,
          href: `/fertilizer/requests?${q({ status: 'Requested' })}`,
        },
        {
          key: 'fertilizerManager',
          count: manager,
          label: `${plural(manager, 'fertilizer request')} awaiting manager approval`,
          href: `/fertilizer/requests?${q({ status: 'Awaiting manager approval' })}`,
        },
      );
      const stale = requests.filter((r) => r.staleCommittedKg > 0).length;
      out.push({
        key: 'staleAllocations',
        count: stale,
        label: `${plural(stale, 'request')} holding expired stock`,
        href: `/fertilizer/requests?${q({ tab: 'all', scope: 'stale' })}`,
      });
    }
    if (corrections) {
      const n = corrections.length;
      out.push({
        key: 'gradingCorrections',
        count: n,
        label: `${plural(n, 'grading correction')} to approve`,
        href: `/collections?${q({ corrections: 'pending' })}`,
      });
    }
    if (payChanges) {
      const n = payChanges.filter(
        (a) => a.status === 'pending' && a.approval.canDecide,
      ).length;
      out.push({
        key: 'payChanges',
        count: n,
        label: `${plural(n, 'pay change')} awaiting approval`,
        href: `/employees/pay-rates?${q({ changes: 'decide' })}`,
      });
    }
    if (holidays) {
      const n = holidays.pending.length;
      out.push({
        key: 'holidayRequests',
        count: n,
        label: `${plural(n, 'holiday request')} to decide`,
        href: '/holidays',
      });
    }
    if (alerts) {
      const n = alerts.summary.expired.count;
      out.push({
        key: 'expiredStock',
        count: n,
        label: `${plural(n, 'expired fertilizer batch', 'expired fertilizer batches')} to write off`,
        href: '/fertilizer/alerts#expired',
      });
    }
    if (collections && can('ungradedOld')) {
      const n = ungradedOlderThan(collections, today, OLD_UNGRADED_DAYS);
      out.push({
        key: 'ungradedOld',
        count: n,
        label: `${plural(n, 'delivery', 'deliveries')} ungraded for more than ${OLD_UNGRADED_DAYS} days`,
        href: `/collections?${q({ grade: 'Ungraded', status: 'Collected', olderThan: String(OLD_UNGRADED_DAYS) })}`,
      });
    }
    if (payrollNoBank) {
      const n = payrollNoBank.total;
      out.push({
        key: 'employeesNoBank',
        count: n,
        label: `${plural(n, 'employee')} missing bank details (${lastMonthName} payroll)`,
        href: `/employees/payroll?${q({ month: lastMonth, issues: 'noBank' })}`,
      });
    }
    if (settlementsNoBank) {
      const n = settlementsNoBank.total;
      out.push({
        key: 'estatesNoBank',
        count: n,
        label: `${plural(n, 'estate')} missing bank details (pending settlements)`,
        href: `/estates/settlements?${q({ month: ALL_PERIODS, status: 'Pending', bank: 'missing' })}`,
      });
    }
    return needsAction(out, perms);
  }
}
