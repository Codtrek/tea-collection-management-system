import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentDirectoryService } from '../dispatch/agent-directory.service';
import { RouteResolverService } from '../dispatch/route-resolver.service';
import { RouteScheduleService } from '../dispatch/route-schedule.service';
import { EstateEntity } from '../estates/estate.entity';
import { formatEstateId } from '../estates/estate-map';
import { RouteEntity } from '../estates/route.entity';
import { FertilizerAllocationEntity } from './fertilizer-allocation.entity';
import { fertilizerOutstanding } from './fertilizer-balance';
import { FertilizerBatchEntity } from './fertilizer-batch.entity';
import { FertilizerChargeEntity } from './fertilizer-charge.entity';
import { FertilizerDeliveryEntity } from './fertilizer-delivery.entity';
import { attemptLabel, paymentStatus } from './fertilizer-flow';
import {
  FAIL_REASON_LABEL,
  formatBatchId,
  formatChargeId,
  formatRequestId,
  parseRequestId,
  type PublicAttempt,
  type PublicRequest,
  type PublicRequestDetail,
} from './fertilizer-map';
import { FertilizerNotificationEntity } from './fertilizer-notification.entity';
import { noticeStatusOf } from './fertilizer-notification.service';
import { FertilizerPaymentEntity } from './fertilizer-payment.entity';
import { FertilizerRequestEventEntity } from './fertilizer-request-event.entity';
import { FertilizerRequestEntity } from './fertilizer-request.entity';
import { FertilizerSettingsService } from './fertilizer-settings.service';
import { round2 } from './fertilizer-stock-ledger.service';

const iso = (d: Date | null) => (d ? new Date(d).toISOString() : null);

/** Everything a request's read model needs, loaded once and shared by list + detail. */
interface Context {
  estates: Map<number, EstateEntity>;
  routes: Map<number, RouteEntity>;
  agentNames: Map<number, string>;
  maxAttempts: number;
  managerApprovalAboveKg: number;
}

/**
 * The fertilizer read models (FERT-05 queue, FERT-06 detail). Read-only: every figure on a
 * request — committed kg, attempt, agent, payment, notice — is built here and only here.
 */
@Injectable()
export class FertilizerViewService {
  constructor(
    @InjectRepository(FertilizerRequestEntity)
    private readonly requests: Repository<FertilizerRequestEntity>,
    @InjectRepository(FertilizerDeliveryEntity)
    private readonly deliveries: Repository<FertilizerDeliveryEntity>,
    @InjectRepository(FertilizerAllocationEntity)
    private readonly allocations: Repository<FertilizerAllocationEntity>,
    @InjectRepository(FertilizerBatchEntity)
    private readonly batches: Repository<FertilizerBatchEntity>,
    @InjectRepository(FertilizerChargeEntity)
    private readonly charges: Repository<FertilizerChargeEntity>,
    @InjectRepository(FertilizerPaymentEntity)
    private readonly payments: Repository<FertilizerPaymentEntity>,
    @InjectRepository(FertilizerRequestEventEntity)
    private readonly events: Repository<FertilizerRequestEventEntity>,
    @InjectRepository(FertilizerNotificationEntity)
    private readonly notices: Repository<FertilizerNotificationEntity>,
    @InjectRepository(EstateEntity)
    private readonly estates: Repository<EstateEntity>,
    @InjectRepository(RouteEntity)
    private readonly routes: Repository<RouteEntity>,
    private readonly resolver: RouteResolverService,
    private readonly schedule: RouteScheduleService,
    private readonly directory: AgentDirectoryService,
    private readonly settings: FertilizerSettingsService,
  ) {}

  async list(): Promise<PublicRequest[]> {
    const [rows, ctx, deliveries, allocations, charges, payments, notices] =
      await Promise.all([
        this.requests.find(),
        this.context(),
        this.deliveries.find(),
        this.allocations.find({ where: { state: 'active' } }),
        this.charges.find(),
        this.payments.find(),
        this.notices.find(),
      ]);
    const out: PublicRequest[] = [];
    for (const r of [...rows].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id,
    )) {
      out.push(
        await this.toPublic(r, ctx, {
          deliveries: deliveries.filter((d) => d.requestId === r.id),
          active: allocations.filter((a) => a.requestId === r.id),
          charges: charges.filter((c) => c.fertilizerRequestId === r.id),
          payments: payments.filter((p) => p.requestId === r.id),
          notices: notices.filter((n) => n.requestId === r.id),
        }),
      );
    }
    return out;
  }

  async detail(formattedOrId: string | number): Promise<PublicRequestDetail> {
    const request = await this.find(formattedOrId);
    const id = request.id;
    const [ctx, deliveries, allocations, charges, payments, notices, events] =
      await Promise.all([
        this.context(),
        this.deliveries.find({ where: { requestId: id } }),
        this.allocations.find({ where: { requestId: id } }),
        this.charges.find({ where: { fertilizerRequestId: id } }),
        this.payments.find({ where: { requestId: id } }),
        this.notices.find({ where: { requestId: id } }),
        this.events.find({ where: { requestId: id } }),
      ]);
    const base = await this.toPublic(request, ctx, {
      deliveries,
      active: allocations.filter((a) => a.state === 'active'),
      charges,
      payments,
      notices,
    });
    const batchRows = await this.batches.find({
      where: { item: request.item },
    });
    const batchById = new Map(batchRows.map((b) => [b.id, b]));
    const attempts: PublicAttempt[] = [];
    for (const d of [...deliveries].sort((a, b) => a.attemptNo - b.attemptNo)) {
      attempts.push(await this.attempt(d, ctx));
    }
    return {
      ...base,
      allocations: allocations
        .filter((a) => a.state !== 'released')
        .map((a) => ({
          batchId: formatBatchId(a.batchId),
          lotNumber: batchById.get(a.batchId)?.lotNumber ?? '',
          expiryDate: batchById.get(a.batchId)?.expiryDate ?? '',
          qtyKg: Number(a.qtyKg),
          state: a.state,
        })),
      attempts,
      timeline: [...events]
        .sort(
          (a, b) =>
            new Date(a.at).getTime() - new Date(b.at).getTime() || a.id - b.id,
        )
        .map((e) => ({
          at: iso(e.at)!,
          deviceAt: iso(e.deviceAt),
          actor: e.actor,
          actorRole: e.actorRole,
          action: e.action,
          fromStatus: e.fromStatus,
          toStatus: e.toStatus,
          note: e.note,
        })),
      charges: [...charges]
        .sort((a, b) => a.id - b.id)
        .map((c) => ({
          id: formatChargeId(c.id),
          deliveryId: c.deliveryId,
          qtyKg: Number(c.quantityKg),
          ratePerKg: Number(c.ratePerKg),
          totalRs: Number(c.totalCharge),
          method: c.paymentMethod ?? 'deduct',
          settlementId: c.settlementId,
          calculatedAt: iso(c.calculatedAt) ?? '',
        })),
      payments: [...payments]
        .sort((a, b) => a.id - b.id)
        .map((p) => ({
          id: p.id,
          amountRs: Number(p.amount),
          paidOn: p.paidOn,
          method: p.method,
          reference: p.reference,
          recordedBy: p.recordedBy,
        })),
      notices: [...notices]
        .sort((a, b) => a.id - b.id)
        .map((n) => ({
          kind: n.kind,
          status: noticeStatusOf(n),
          createdAt: iso(n.createdAt) ?? '',
          sentAt: iso(n.sentAt),
        })),
      maxAttempts: ctx.maxAttempts,
      managerApprovalAboveKg: ctx.managerApprovalAboveKg,
    };
  }

  /** Look a request up by 'FR-2026-0001', a bare id, or a number. 404 when missing. */
  async find(formattedOrId: string | number): Promise<FertilizerRequestEntity> {
    const id =
      typeof formattedOrId === 'number'
        ? formattedOrId
        : /^\d+$/.test(formattedOrId)
          ? Number(formattedOrId)
          : parseRequestId(formattedOrId);
    const request = Number.isNaN(id)
      ? null
      : await this.requests.findOne({ where: { id } });
    if (!request) {
      throw new NotFoundException(`No fertilizer request "${formattedOrId}".`);
    }
    return request;
  }

  private async context(): Promise<Context> {
    const [estates, routes, agentNames, settings] = await Promise.all([
      this.estates.find(),
      this.routes.find(),
      this.directory.names(),
      this.settings.get(),
    ]);
    return {
      estates: new Map(estates.map((e) => [e.id, e])),
      routes: new Map(routes.map((r) => [r.id, r])),
      agentNames,
      maxAttempts: settings.maxDeliveryAttempts,
      managerApprovalAboveKg: settings.managerApprovalAboveKg,
    };
  }

  private async toPublic(
    r: FertilizerRequestEntity,
    ctx: Context,
    rel: {
      deliveries: FertilizerDeliveryEntity[];
      active: FertilizerAllocationEntity[];
      charges: FertilizerChargeEntity[];
      payments: FertilizerPaymentEntity[];
      notices: FertilizerNotificationEntity[];
    },
  ): Promise<PublicRequest> {
    const estate = ctx.estates.get(r.estateId);
    const route = r.routeId !== null ? ctx.routes.get(r.routeId) : undefined;
    const latest = [...rel.deliveries].sort(
      (a, b) => b.attemptNo - a.attemptNo,
    )[0];
    const balance = fertilizerOutstanding(rel.charges, rel.payments);
    const lastNotice = [...rel.notices].sort((a, b) => b.id - a.id)[0];
    return {
      id: formatRequestId(r.id, r.createdAt),
      orderRef: r.orderRef,
      estateId: formatEstateId(r.estateId),
      estateName: estate?.name ?? 'Unknown estate',
      routeId: r.routeId,
      routeName: route ? (route.name ?? `Route ${route.id}`) : null,
      item: r.item,
      quantityKg: Number(r.quantityKg),
      requestedDate: r.createdAt.toISOString().slice(0, 10),
      origin: r.origin,
      status: r.status,
      reason: r.justification ?? undefined,
      approvedQtyKg:
        r.approvedQtyKg !== null ? Number(r.approvedQtyKg) : undefined,
      deliveredQtyKg: Number(r.deliveredQtyKg ?? 0),
      decisionReason: r.decisionReason ?? undefined,
      decidedBy: r.decidedBy ?? undefined,
      decidedOn: r.decidedOn ? r.decidedOn.toISOString() : undefined,
      needsManager:
        r.status === 'Awaiting manager approval' || r.managerDecidedBy !== null,
      managerDecidedBy: r.managerDecidedBy ?? undefined,
      managerDecidedOn: r.managerDecidedOn
        ? r.managerDecidedOn.toISOString()
        : undefined,
      ratePerKg: r.ratePerKg !== null ? Number(r.ratePerKg) : null,
      committedKg: round2(rel.active.reduce((s, a) => s + Number(a.qtyKg), 0)),
      payment: {
        method: r.paymentMethod,
        amountOwedRs: balance.chargedRs,
        recoveredRs: balance.recoveredRs,
        paidRs: balance.paidRs,
        outstandingRs: balance.outstandingRs,
        status: paymentStatus(r.paymentMethod, {
          amountOwedRs: balance.chargedRs,
          recoveredRs: balance.recoveredRs,
          paidRs: balance.paidRs,
        }),
      },
      attempt: latest ? await this.attempt(latest, ctx) : null,
      attemptLabel: attemptLabel(r.status, r.cycleFailures, ctx.maxAttempts),
      pickupMismatch: rel.deliveries.some((d) => d.pickupMismatch),
      noticeStatus: lastNotice ? noticeStatusOf(lastNotice) : null,
    };
  }

  /** Before pickup the agent is whoever runs the route that day (cover-aware); after, the pickup agent. */
  private async attempt(
    d: FertilizerDeliveryEntity,
    ctx: Context,
  ): Promise<PublicAttempt> {
    const route = ctx.routes.get(d.routeId);
    let agentId: number | null = d.pickupAgentId;
    let covering = false;
    const open = d.outcome === null && d.cancelledAt === null;
    if (agentId === null && open) {
      if (await this.schedule.isScheduled(d.routeId, d.scheduledDate)) {
        const res = await this.resolver.getAgentForRoute(
          d.routeId,
          d.scheduledDate,
        );
        agentId = res?.agentId ?? null;
        covering = res?.covering ?? false;
      }
    }
    const num = (v: string | null) => (v === null ? null : Number(v));
    return {
      id: d.id,
      attemptNo: d.attemptNo,
      scheduledDate: d.scheduledDate,
      routeId: d.routeId,
      routeName: route
        ? (route.name ?? `Route ${route.id}`)
        : `Route ${d.routeId}`,
      agentId,
      agentName:
        agentId !== null ? (ctx.agentNames.get(agentId) ?? null) : null,
      covering,
      pinned: d.pickupAgentId !== null,
      handoverQtyKg: num(d.handoverQtyKg),
      handoverBy: d.handoverBy,
      handoverAt: iso(d.handoverAt),
      agentConfirmQtyKg: num(d.agentConfirmQtyKg),
      agentConfirmedAt: iso(d.agentConfirmedAt),
      pickupMismatch: d.pickupMismatch,
      outForDeliveryAt: iso(d.outForDeliveryAt),
      outcome: d.outcome,
      deliveredQtyKg: num(d.deliveredQtyKg),
      shortfallReason: d.shortfallReason,
      ownerName: d.ownerName,
      ownerConfirmedAt: iso(d.ownerConfirmedAt),
      photos: d.photos ?? [],
      failReason: d.failReason,
      failReasonLabel: d.failReason ? FAIL_REASON_LABEL[d.failReason] : null,
      failNote: d.failNote,
      recordedAt: iso(d.recordedAt),
      checkedInQtyKg: num(d.checkedInQtyKg),
      checkedInBy: d.checkedInBy,
      checkedInAt: iso(d.checkedInAt),
      cancelled: d.cancelledAt !== null,
    };
  }
}
