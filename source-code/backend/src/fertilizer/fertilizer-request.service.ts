import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { EntityManager } from 'typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { DispatchAccessService } from '../dispatch/dispatch-access.service';
import { localDate } from '../dispatch/dispatch-map';
import { EstateEntity } from '../estates/estate.entity';
import { parseEstateId } from '../estates/estate-map';
import { fertilizerOutstanding } from './fertilizer-balance';
import { FertilizerChargeEntity } from './fertilizer-charge.entity';
import { FertilizerDeliveryEntity } from './fertilizer-delivery.entity';
import { CANCELLABLE, PAYMENT_METHOD_LOCKED } from './fertilizer-flow';
import { FertilizerItemPriceEntity } from './fertilizer-item-price.entity';
import { type FlowActor, logEvent, moveTo } from './fertilizer-journal';
import {
  formatOrderRef,
  formatRequestId,
  PAYMENT_METHOD_LABEL,
  type DbRequestOrigin,
  type NotificationKind,
  type PaymentMethod,
  type PublicPrice,
  type PublicRequestDetail,
} from './fertilizer-map';
import { FertilizerNotificationEntity } from './fertilizer-notification.entity';
import {
  enqueueNotice,
  type NoticePayload,
} from './fertilizer-notification.service';
import { FertilizerPaymentEntity } from './fertilizer-payment.entity';
import { FertilizerRequestEntity } from './fertilizer-request.entity';
import { FertilizerSettingsService } from './fertilizer-settings.service';
import {
  FertilizerStockLedger,
  round2,
} from './fertilizer-stock-ledger.service';
import { FertilizerViewService } from './fertilizer-view.service';

export interface CreateRequestsInput {
  /** 'EST-0001' or the numeric id */
  estateId: string | number;
  items: { item: string; quantityKg: number }[];
  paymentMethod: PaymentMethod;
  reason?: string;
}

const requireText = (v: string | undefined, what: string): string => {
  const t = (v ?? '').trim();
  if (!t) throw new BadRequestException(`${what} is required.`);
  return t;
};

/**
 * Fertilizer-Delivery-Addendum §4 — the request side: create (officer now, the owner app
 * later via the same method), the Officer's decision with FEFO commitment, the Manager's
 * second sign-off above the limit, cancel, payment method, cash/bank payments, prices.
 * Permissions are data-driven (`role_permissions`), never role names.
 */
@Injectable()
export class FertilizerRequestService {
  constructor(
    @InjectRepository(FertilizerRequestEntity)
    private readonly requests: Repository<FertilizerRequestEntity>,
    @InjectRepository(EstateEntity)
    private readonly estates: Repository<EstateEntity>,
    @InjectRepository(FertilizerItemPriceEntity)
    private readonly prices: Repository<FertilizerItemPriceEntity>,
    @InjectRepository(FertilizerChargeEntity)
    private readonly charges: Repository<FertilizerChargeEntity>,
    @InjectRepository(FertilizerPaymentEntity)
    private readonly payments: Repository<FertilizerPaymentEntity>,
    private readonly ledger: FertilizerStockLedger,
    private readonly settings: FertilizerSettingsService,
    private readonly access: DispatchAccessService,
    private readonly audit: AuditService,
    private readonly view: FertilizerViewService,
  ) {}

  /* ── Create ─────────────────────────────────────────────────────── */

  /**
   * One order → one request per item, sharing an `orderRef`. `origin: 'web'` is an officer
   * logging a phoned-in order (FERT-07, needs `fertilizer: edit`); `'mobile'` is reserved for
   * the owner app, which will call this same method once owner sign-in exists.
   */
  async createRequests(
    input: CreateRequestsInput,
    origin: DbRequestOrigin,
    actor: FlowActor,
    now: Date = new Date(),
  ): Promise<{ orderRef: string; requests: PublicRequestDetail[] }> {
    if (origin === 'web') {
      await this.access.require(
        actor.role,
        'edit',
        'log a fertilizer request',
        'fertilizer',
      );
    }
    const estateId =
      typeof input.estateId === 'number'
        ? input.estateId
        : /^\d+$/.test(input.estateId)
          ? Number(input.estateId)
          : parseEstateId(input.estateId);
    const estate = Number.isInteger(estateId)
      ? await this.estates.findOne({ where: { id: estateId } })
      : null;
    if (!estate) throw new NotFoundException(`No estate "${input.estateId}".`);
    if (estate.status !== 'active') {
      throw new BadRequestException(`${estate.name} is not active.`);
    }
    if (estate.routeId === null) {
      throw new BadRequestException(
        `${estate.name} has no route yet — fertilizer is delivered on the estate's route.`,
      );
    }
    if (input.items.length === 0) {
      throw new BadRequestException('Add at least one item.');
    }
    const names = input.items.map((i) => i.item.trim());
    if (new Set(names).size !== names.length) {
      throw new BadRequestException(
        'Each item can appear only once in an order.',
      );
    }

    const ids = await this.requests.manager.transaction(async (em) => {
      const repo = em.getRepository(FertilizerRequestEntity);
      const saved: FertilizerRequestEntity[] = [];
      for (const line of input.items) {
        const request = await repo.save(
          repo.create({
            requestedBy: null,
            estateId: estate.id,
            ownerId: estate.ownerId,
            item: line.item.trim(),
            quantityKg: String(round2(line.quantityKg)),
            justification: input.reason?.trim() || null,
            factoryId: null,
            origin,
            status: 'Requested',
            approvedQtyKg: null,
            dispatchedQtyKg: '0',
            decidedBy: null,
            decidedOn: null,
            orderRef: null,
            routeId: estate.routeId,
            paymentMethod: input.paymentMethod,
            decisionReason: null,
            ratePerKg: null,
            priceId: null,
            deliveredQtyKg: '0',
            cycleFailures: 0,
            managerDecidedBy: null,
            managerDecidedOn: null,
            createdAt: now,
            updatedAt: now,
          }),
        );
        saved.push(request);
      }
      const orderRef = formatOrderRef(saved[0].id);
      for (const r of saved) {
        r.orderRef = orderRef;
        await repo.save(r);
        await logEvent(em, r.id, actor, now, {
          action:
            origin === 'web'
              ? 'Logged on the owner’s behalf'
              : 'Requested by the owner',
          to: 'Requested',
          note: `${r.item} ${Number(r.quantityKg)} kg · ${PAYMENT_METHOD_LABEL[input.paymentMethod]}${r.justification ? ` · ${r.justification}` : ''}`,
        });
      }
      return { orderRef, ids: saved.map((r) => r.id) };
    });

    await this.audit.record(actor as never, {
      action: 'Logged fertilizer order',
      module: 'Fertilizer',
      record: ids.orderRef,
      recordHref: '/fertilizer/requests',
      details: `${estate.name} — ${input.items.map((i) => `${i.item} ${i.quantityKg} kg`).join(', ')}`,
    });
    const requests: PublicRequestDetail[] = [];
    for (const id of ids.ids) requests.push(await this.view.detail(id));
    return { orderRef: ids.orderRef, requests };
  }

  /* ── Officer decision (FERT-06) ─────────────────────────────────── */

  /**
   * Approve fully, approve partially (reason required, shown to the owner) or reject (reason
   * required). Approval snapshots today's price and commits stock FEFO inside a transaction
   * that locks the item's batches. Above `managerApprovalAboveKg` (approved kg) the request
   * waits for a Factory Manager — the stock is already committed.
   */
  async decide(
    formattedId: string,
    input: {
      decision: 'approve' | 'reject';
      approvedQtyKg?: number;
      reason?: string;
    },
    actor: FlowActor,
    now: Date = new Date(),
  ): Promise<PublicRequestDetail> {
    await this.access.require(
      actor.role,
      'approve',
      'decide a fertilizer request',
      'fertilizerApproval',
    );
    const request = await this.view.find(formattedId);
    if (request.status !== 'Requested') {
      throw new ConflictException(
        `This request is "${request.status}" — it has already been decided.`,
      );
    }
    const requested = Number(request.quantityKg);

    if (input.decision === 'reject') {
      const reason = requireText(input.reason, 'A reason for the rejection');
      await this.requests.manager.transaction(async (em) => {
        request.decisionReason = reason;
        request.decidedBy = actor.name;
        request.decidedOn = now;
        await moveTo(em, request, 'Rejected', actor, now, {
          action: 'Rejected',
          note: reason,
        });
        await this.notify(em, request, 'rejected', now, {
          requestedKg: requested,
          reason,
        });
      });
      await this.auditDecision(
        actor,
        request,
        'Rejected fertilizer request',
        reason,
      );
      return this.view.detail(request.id);
    }

    const qty = round2(input.approvedQtyKg ?? requested);
    if (qty <= 0 || qty > requested) {
      throw new BadRequestException(
        `Approve between 0 and the ${requested} kg requested.`,
      );
    }
    const partial = qty < requested;
    const reason = partial
      ? requireText(input.reason, 'A reason for the partial approval')
      : input.reason?.trim() || null;
    const price = await this.currentPrice(request.item, localDate(now));
    if (!price) {
      throw new ConflictException(
        `No price is set for ${request.item}. An Administrator must set one before it can be approved.`,
      );
    }
    const { managerApprovalAboveKg } = await this.settings.get();

    await this.requests.manager.transaction(async (em) => {
      await this.ledger.allocate(em, request, qty, now);
      request.approvedQtyKg = String(qty);
      request.ratePerKg = price.ratePerKg;
      request.priceId = price.id;
      request.decisionReason = reason;
      request.decidedBy = actor.name;
      request.decidedOn = now;
      const committedNote = `${qty} kg committed (FEFO) at Rs. ${Number(price.ratePerKg)}/kg${reason ? ` · ${reason}` : ''}`;
      if (qty > managerApprovalAboveKg) {
        await moveTo(em, request, 'Awaiting manager approval', actor, now, {
          action: 'Approved — waiting for a Factory Manager',
          note: `${committedNote} · over the ${managerApprovalAboveKg} kg limit, so a Factory Manager must also approve`,
        });
        return;
      }
      await moveTo(
        em,
        request,
        partial ? 'Partially approved' : 'Approved',
        actor,
        now,
        {
          action: partial ? 'Partially approved' : 'Approved',
          note: committedNote,
        },
      );
      await this.notify(
        em,
        request,
        partial ? 'partially_approved' : 'approved',
        now,
        {
          requestedKg: requested,
          approvedKg: qty,
          reason,
        },
      );
    });
    await this.auditDecision(
      actor,
      request,
      partial
        ? 'Partially approved fertilizer request'
        : 'Approved fertilizer request',
      `${qty} of ${requested} kg${reason ? ` — ${reason}` : ''}`,
    );
    return this.view.detail(request.id);
  }

  /** The Factory Manager's sign-off on an approval above the limit. Rejecting releases the stock. */
  async managerDecide(
    formattedId: string,
    input: { decision: 'approve' | 'reject'; reason?: string },
    actor: FlowActor,
    now: Date = new Date(),
  ): Promise<PublicRequestDetail> {
    await this.access.require(
      actor.role,
      'approve',
      'give the manager approval for fertilizer',
      'fertilizerManagerApproval',
    );
    const request = await this.view.find(formattedId);
    if (request.status !== 'Awaiting manager approval') {
      throw new ConflictException(
        `This request is "${request.status}" — it isn't waiting for a manager.`,
      );
    }
    const requested = Number(request.quantityKg);
    const approved = Number(request.approvedQtyKg ?? requested);

    if (input.decision === 'reject') {
      const reason = requireText(input.reason, 'A reason for the rejection');
      await this.requests.manager.transaction(async (em) => {
        const released = await this.ledger.release(em, request.id, now);
        request.decisionReason = reason;
        request.managerDecidedBy = actor.name;
        request.managerDecidedOn = now;
        await moveTo(em, request, 'Rejected', actor, now, {
          action: 'Rejected by the Factory Manager',
          note: `${reason} · ${released} kg released back to stock`,
        });
        await this.notify(em, request, 'rejected', now, {
          requestedKg: requested,
          reason,
        });
      });
      await this.auditDecision(
        actor,
        request,
        'Manager rejected fertilizer request',
        reason,
      );
      return this.view.detail(request.id);
    }

    const partial = approved < requested;
    await this.requests.manager.transaction(async (em) => {
      request.managerDecidedBy = actor.name;
      request.managerDecidedOn = now;
      await moveTo(
        em,
        request,
        partial ? 'Partially approved' : 'Approved',
        actor,
        now,
        {
          action: 'Approved by the Factory Manager',
          note: input.reason?.trim() || null,
        },
      );
      await this.notify(
        em,
        request,
        partial ? 'partially_approved' : 'approved',
        now,
        {
          requestedKg: requested,
          approvedKg: approved,
          reason: request.decisionReason,
        },
      );
    });
    await this.auditDecision(
      actor,
      request,
      'Manager approved fertilizer request',
      `${approved} kg`,
    );
    return this.view.detail(request.id);
  }

  /* ── Cancel ─────────────────────────────────────────────────────── */

  /** Cancel anything not yet with an agent: committed stock goes back to Available, the owner is told. */
  async cancel(
    formattedId: string,
    reasonText: string,
    actor: FlowActor,
    now: Date = new Date(),
  ): Promise<PublicRequestDetail> {
    await this.access.require(
      actor.role,
      'edit',
      'cancel a fertilizer request',
      'fertilizer',
    );
    const reason = requireText(reasonText, 'A reason');
    const request = await this.view.find(formattedId);
    if (!CANCELLABLE.includes(request.status)) {
      throw new ConflictException(
        request.status === 'Picked up' || request.status === 'Out for delivery'
          ? 'The agent has this fertilizer. Record the delivery or the failure, then check it back in.'
          : `A request that is "${request.status}" can't be cancelled.`,
      );
    }
    await this.requests.manager.transaction(async (em) => {
      const released = await this.ledger.release(em, request.id, now);
      await this.cancelOpenAttempt(em, request.id, now);
      await moveTo(em, request, 'Cancelled', actor, now, {
        action: 'Cancelled',
        note: `${reason}${released > 0 ? ` · ${released} kg released back to stock` : ''}`,
      });
      await this.notify(em, request, 'cancelled', now, { reason });
    });
    await this.auditDecision(
      actor,
      request,
      'Cancelled fertilizer request',
      reason,
    );
    return this.view.detail(request.id);
  }

  /* ── Payment ────────────────────────────────────────────────────── */

  /** The owner's choice may change until the request is delivered. */
  async setPaymentMethod(
    formattedId: string,
    method: PaymentMethod,
    actor: FlowActor,
    now: Date = new Date(),
  ): Promise<PublicRequestDetail> {
    await this.access.require(
      actor.role,
      'edit',
      'change the payment method',
      'fertilizer',
    );
    const request = await this.view.find(formattedId);
    if (PAYMENT_METHOD_LOCKED.includes(request.status)) {
      throw new ConflictException(
        `The payment method can't change once a request is "${request.status}".`,
      );
    }
    if (request.paymentMethod === method) return this.view.detail(request.id);
    const before = request.paymentMethod;
    await this.requests.manager.transaction(async (em) => {
      request.paymentMethod = method;
      request.updatedAt = now;
      await em.getRepository(FertilizerRequestEntity).save(request);
      await logEvent(em, request.id, actor, now, {
        action: 'Payment method changed',
        note: `${PAYMENT_METHOD_LABEL[before]} → ${PAYMENT_METHOD_LABEL[method]}`,
      });
    });
    await this.auditDecision(
      actor,
      request,
      'Changed fertilizer payment method',
      `${PAYMENT_METHOD_LABEL[before]} → ${PAYMENT_METHOD_LABEL[method]}`,
    );
    return this.view.detail(request.id);
  }

  /** An officer records cash / bank money received. Never more than what is outstanding. */
  async recordPayment(
    formattedId: string,
    input: {
      amount: number;
      paidOn: string;
      method: 'cash' | 'bank';
      reference?: string;
    },
    actor: FlowActor,
    now: Date = new Date(),
  ): Promise<PublicRequestDetail> {
    await this.access.require(
      actor.role,
      'edit',
      'record a fertilizer payment',
      'fertilizer',
    );
    const request = await this.view.find(formattedId);
    const reference = input.reference?.trim() || null;
    if (input.method === 'bank' && !reference) {
      throw new BadRequestException(
        'A bank transfer needs its reference number.',
      );
    }
    if (input.paidOn > localDate(now)) {
      throw new BadRequestException('The payment date can’t be in the future.');
    }
    const [charges, payments] = await Promise.all([
      this.charges.find({ where: { fertilizerRequestId: request.id } }),
      this.payments.find({ where: { requestId: request.id } }),
    ]);
    const { outstandingRs } = fertilizerOutstanding(charges, payments);
    const amount = round2(input.amount);
    if (outstandingRs <= 0) {
      throw new ConflictException('Nothing is outstanding on this request.');
    }
    if (amount > outstandingRs) {
      throw new ConflictException(`Only Rs. ${outstandingRs} is outstanding.`);
    }
    await this.requests.manager.transaction(async (em) => {
      const repo = em.getRepository(FertilizerPaymentEntity);
      await repo.save(
        repo.create({
          requestId: request.id,
          estateId: request.estateId,
          amount: String(amount),
          paidOn: input.paidOn,
          method: input.method,
          reference,
          recordedBy: actor.name,
        }),
      );
      await logEvent(em, request.id, actor, now, {
        action: 'Payment recorded',
        note: `Rs. ${amount} by ${PAYMENT_METHOD_LABEL[input.method]} on ${input.paidOn}${reference ? ` (ref ${reference})` : ''}`,
      });
    });
    await this.auditDecision(
      actor,
      request,
      'Recorded fertilizer payment',
      `Rs. ${amount} (${input.method})`,
    );
    return this.view.detail(request.id);
  }

  /* ── Prices (Administrator) ─────────────────────────────────────── */

  async listPrices(now: Date = new Date()): Promise<PublicPrice[]> {
    const today = localDate(now);
    const rows = await this.prices.find();
    const currentId = new Map<string, number>();
    for (const item of new Set(rows.map((r) => r.item))) {
      const cur = pickPrice(
        rows.filter((r) => r.item === item),
        today,
      );
      if (cur) currentId.set(item, cur.id);
    }
    return [...rows]
      .sort(
        (a, b) =>
          a.item.localeCompare(b.item) ||
          b.effectiveDate.localeCompare(a.effectiveDate),
      )
      .map((r) => ({
        id: r.id,
        item: r.item,
        ratePerKg: Number(r.ratePerKg),
        effectiveDate: r.effectiveDate,
        setBy: r.setBy,
        current: currentId.get(r.item) === r.id,
      }));
  }

  /** A new price version. Past versions are never edited, so approved requests keep their price. */
  async setPrice(
    input: { item: string; ratePerKg: number; effectiveDate: string },
    actor: FlowActor,
    now: Date = new Date(),
  ): Promise<PublicPrice[]> {
    await this.access.require(
      actor.role,
      'approve',
      'set fertilizer prices',
      'administration',
    );
    const item = requireText(input.item, 'The item');
    if (input.effectiveDate < localDate(now)) {
      throw new BadRequestException(
        'A new price can’t take effect in the past.',
      );
    }
    const clash = await this.prices.findOne({
      where: { item, effectiveDate: input.effectiveDate },
    });
    if (clash) {
      throw new ConflictException(
        `${item} already has a price taking effect on ${input.effectiveDate}.`,
      );
    }
    await this.prices.save(
      this.prices.create({
        item,
        ratePerKg: String(round2(input.ratePerKg)),
        effectiveDate: input.effectiveDate,
        setBy: actor.name,
      }),
    );
    await this.audit.record(actor as never, {
      action: 'Set fertilizer price',
      module: 'Fertilizer',
      record: item,
      details: `Rs. ${input.ratePerKg}/kg from ${input.effectiveDate}`,
    });
    return this.listPrices(now);
  }

  /** The price version in force on `date` (latest effective date ≤ date), or null. */
  async currentPrice(
    item: string,
    date: string,
  ): Promise<FertilizerItemPriceEntity | null> {
    return pickPrice(await this.prices.find({ where: { item } }), date);
  }

  /* ── internals ──────────────────────────────────────────────────── */

  private async cancelOpenAttempt(
    em: EntityManager,
    requestId: number,
    now: Date,
  ): Promise<void> {
    const repo = em.getRepository(FertilizerDeliveryEntity);
    for (const d of await repo.find({ where: { requestId } })) {
      if (
        d.outcome === null &&
        d.cancelledAt === null &&
        d.pickupAgentId === null
      ) {
        d.cancelledAt = now;
        await repo.save(d);
      }
    }
  }

  private async notify(
    em: EntityManager,
    request: FertilizerRequestEntity,
    kind: NotificationKind,
    now: Date,
    extra: NoticePayload,
  ): Promise<void> {
    await enqueueNotice(em.getRepository(FertilizerNotificationEntity), {
      requestId: request.id,
      kind,
      dedupeKey: `${kind}:${request.id}`,
      now,
      payload: {
        requestRef: formatRequestId(request.id, request.createdAt),
        item: request.item,
        method: PAYMENT_METHOD_LABEL[request.paymentMethod],
        ...extra,
      },
    });
  }

  private async auditDecision(
    actor: FlowActor,
    request: FertilizerRequestEntity,
    action: string,
    details: string,
  ): Promise<void> {
    const ref = formatRequestId(request.id, request.createdAt);
    await this.audit.record(actor as never, {
      action,
      module: 'Fertilizer',
      record: ref,
      recordHref: `/fertilizer/requests/${ref}`,
      details,
    });
  }
}

/** Latest price version whose effective date is on or before `date`. */
export function pickPrice(
  rows: readonly FertilizerItemPriceEntity[],
  date: string,
): FertilizerItemPriceEntity | null {
  return (
    rows
      .filter((r) => r.effectiveDate <= date)
      .sort(
        (a, b) => b.effectiveDate.localeCompare(a.effectiveDate) || b.id - a.id,
      )[0] ?? null
  );
}
