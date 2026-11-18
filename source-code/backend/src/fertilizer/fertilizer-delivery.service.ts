import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { EntityManager } from 'typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AgentDayStatusEntity } from '../dispatch/agent-day-status.entity';
import { AgentDirectoryService } from '../dispatch/agent-directory.service';
import { AgentSelfService } from '../dispatch/agent-self.service';
import {
  AgentTaskHooks,
  type ExtraStopTask,
} from '../dispatch/agent-task-hooks.service';
import { DispatchAccessService } from '../dispatch/dispatch-access.service';
import { addDays, localDate } from '../dispatch/dispatch-map';
import { RouteResolverService } from '../dispatch/route-resolver.service';
import { RouteScheduleService } from '../dispatch/route-schedule.service';
import { EstateEntity } from '../estates/estate.entity';
import { RouteEntity } from '../estates/route.entity';
import { FertilizerChargeEntity } from './fertilizer-charge.entity';
import { FertilizerDeliveryEntity } from './fertilizer-delivery.entity';
import { PRE_PICKUP, WITH_AGENT } from './fertilizer-flow';
import { type FlowActor, logEvent, moveTo, SYSTEM } from './fertilizer-journal';
import {
  FAIL_REASON_LABEL,
  formatRequestId,
  PAYMENT_METHOD_LABEL,
  type DeliveryPhoto,
  type FailReason,
  type NotificationKind,
  type PublicAgentTask,
  type PublicRequestDetail,
} from './fertilizer-map';
import { FertilizerNotificationEntity } from './fertilizer-notification.entity';
import {
  enqueueNotice,
  type NoticePayload,
} from './fertilizer-notification.service';
import { FertilizerRequestEntity } from './fertilizer-request.entity';
import { FertilizerRequestService } from './fertilizer-request.service';
import { FertilizerSettingsService } from './fertilizer-settings.service';
import {
  FertilizerStockLedger,
  round2,
} from './fertilizer-stock-ledger.service';
import { FertilizerViewService } from './fertilizer-view.service';

/** Device timestamps further ahead of the server than this are refused (clock skew). */
const MAX_FUTURE_SKEW_MS = 5 * 60_000;

const requireText = (v: string | undefined, what: string): string => {
  const t = (v ?? '').trim();
  if (!t) throw new BadRequestException(`${what} is required.`);
  return t;
};

/**
 * Fertilizer-Delivery-Addendum §5–§7 — the delivery side. A delivery attempt is a flag on the
 * estate's stop on the route's next collection day; nobody is stored as its agent until the
 * officer's handover, so a cover or reassignment that day moves the task with the route.
 */
@Injectable()
export class FertilizerDeliveryService implements OnModuleInit {
  constructor(
    @InjectRepository(FertilizerRequestEntity)
    private readonly requests: Repository<FertilizerRequestEntity>,
    @InjectRepository(FertilizerDeliveryEntity)
    private readonly deliveries: Repository<FertilizerDeliveryEntity>,
    @InjectRepository(EstateEntity)
    private readonly estates: Repository<EstateEntity>,
    @InjectRepository(RouteEntity)
    private readonly routes: Repository<RouteEntity>,
    @InjectRepository(AgentDayStatusEntity)
    private readonly dayStatus: Repository<AgentDayStatusEntity>,
    private readonly ledger: FertilizerStockLedger,
    private readonly schedule: RouteScheduleService,
    private readonly resolver: RouteResolverService,
    private readonly directory: AgentDirectoryService,
    private readonly agents: AgentSelfService,
    private readonly hooks: AgentTaskHooks,
    private readonly settings: FertilizerSettingsService,
    private readonly access: DispatchAccessService,
    private readonly audit: AuditService,
    private readonly requestService: FertilizerRequestService,
    private readonly view: FertilizerViewService,
  ) {}

  /** Fertilizer rides on the agent's stops and goes "Out for delivery" when he starts the route. */
  onModuleInit(): void {
    this.hooks.registerStopContributor((agentId, date, now) =>
      this.stopTasks(agentId, date, now),
    );
    this.hooks.onShiftStarted((agentId, date, now) =>
      this.routeStarted(agentId, date, now),
    );
  }

  /* ── Officer: ready / date / handover / check-in / retry / release ── */

  /** Attach to the estate's stop on the route's next collection day (strictly after today). */
  async markReady(
    formattedId: string,
    actor: FlowActor,
    now: Date = new Date(),
  ): Promise<PublicRequestDetail> {
    await this.access.require(
      actor.role,
      'edit',
      'dispatch fertilizer',
      'fertilizer',
    );
    const request = await this.view.find(formattedId);
    if (
      request.status !== 'Approved' &&
      request.status !== 'Partially approved'
    ) {
      throw new ConflictException(
        `Only an approved request can be marked ready (this one is "${request.status}").`,
      );
    }
    const route = await this.routeFor(request);
    const today = localDate(now);
    const date = await this.schedule.nextCollectionDay(route.id, today);
    if (!date) {
      throw new ConflictException(
        `${this.label(route)} has no collection day scheduled. Set its schedule first.`,
      );
    }
    await this.requests.manager.transaction(async (em) => {
      await this.commitForDispatch(em, request, actor, now);
      const attempt = await this.newAttempt(em, request, route.id, date, now);
      await moveTo(em, request, 'Ready for dispatch', actor, now, {
        action: 'Ready for dispatch',
        note: `On ${this.label(route)}'s stop on ${date} (attempt ${attempt.attemptNo})`,
      });
      await this.notify(
        em,
        request,
        'dispatched',
        `dispatched:${attempt.id}:${date}`,
        now,
        {
          qtyKg: this.remaining(request),
          date,
          routeName: this.label(route),
        },
      );
    });
    await this.auditAction(
      actor,
      request,
      'Marked fertilizer ready for dispatch',
      `Delivery on ${date}`,
    );
    return this.view.detail(request.id);
  }

  /** An officer moves the delivery to another SCHEDULED date of the route (today allowed). */
  async changeDate(
    formattedId: string,
    date: string,
    reasonText: string,
    actor: FlowActor,
    now: Date = new Date(),
  ): Promise<PublicRequestDetail> {
    await this.access.require(
      actor.role,
      'edit',
      'change a delivery date',
      'fertilizer',
    );
    const reason = requireText(reasonText, 'A reason');
    const request = await this.view.find(formattedId);
    if (!PRE_PICKUP.includes(request.status)) {
      throw new ConflictException(
        `The date can only change before pickup (this request is "${request.status}").`,
      );
    }
    if (date < localDate(now)) {
      throw new BadRequestException('Pick today or a later date.');
    }
    const attempt = await this.openAttempt(request.id);
    if (!attempt)
      throw new ConflictException('This request has no open delivery.');
    if (!(await this.schedule.isScheduled(attempt.routeId, date))) {
      const route = await this.routes.findOne({
        where: { id: attempt.routeId },
      });
      throw new ConflictException(
        `${route ? this.label(route) : 'The route'} doesn't run on ${date}. Add that date to the route's schedule first.`,
      );
    }
    if (date === attempt.scheduledDate) return this.view.detail(request.id);
    const before = attempt.scheduledDate;
    await this.requests.manager.transaction(async (em) => {
      attempt.scheduledDate = date;
      await em.getRepository(FertilizerDeliveryEntity).save(attempt);
      await logEvent(em, request.id, actor, now, {
        action: 'Delivery date changed',
        note: `${before} → ${date}: ${reason}`,
      });
      await this.notify(
        em,
        request,
        'dispatched',
        `dispatched:${attempt.id}:${date}`,
        now,
        {
          qtyKg: this.remaining(request),
          date,
          routeName: await this.routeName(attempt.routeId),
        },
      );
    });
    await this.auditAction(
      actor,
      request,
      'Changed fertilizer delivery date',
      `${before} → ${date}: ${reason}`,
    );
    return this.view.detail(request.id);
  }

  /**
   * The officer hands the fertilizer to the agent running the route TODAY. This moves the
   * stock (On Hand ↓, Committed ↓) and pins the task to that agent. The quantity must be
   * exactly what's committed; the agent's own confirmation comes later as evidence.
   */
  async handover(
    formattedId: string,
    qtyKg: number,
    actor: FlowActor,
    now: Date = new Date(),
  ): Promise<PublicRequestDetail> {
    await this.access.require(
      actor.role,
      'edit',
      'record a fertilizer handover',
      'fertilizer',
    );
    const request = await this.view.find(formattedId);
    await this.reconcile(now, request.id);
    if (!PRE_PICKUP.includes(request.status)) {
      throw new ConflictException(
        `Only a request waiting for pickup can be handed over (this one is "${request.status}").`,
      );
    }
    const attempt = await this.openAttempt(request.id);
    if (!attempt)
      throw new ConflictException('This request has no open delivery.');
    const today = localDate(now);
    if (attempt.scheduledDate !== today) {
      throw new ConflictException(
        `This delivery is on ${attempt.scheduledDate}. Change the date to today first if it's going out now.`,
      );
    }
    const routeName = await this.routeName(attempt.routeId);
    const resolved = (await this.schedule.isScheduled(attempt.routeId, today))
      ? await this.resolver.getAgentForRoute(attempt.routeId, today)
      : null;
    if (!resolved) {
      throw new ConflictException(
        `Nobody runs ${routeName} today. Assign an agent or a cover on the dispatch board first.`,
      );
    }
    const agentName =
      (await this.directory.names()).get(resolved.agentId) ??
      `Agent ${resolved.agentId}`;
    const qty = round2(qtyKg);

    await this.requests.manager.transaction(async (em) => {
      const committed = await this.ledger.committedFor(em, request.id);
      if (qty !== committed) {
        throw new ConflictException(
          `${committed} kg is committed to this request — hand over exactly that.`,
        );
      }
      await this.ledger.pick(
        em,
        request,
        qty,
        actor,
        now,
        `${agentName} — ${routeName}`,
      );
      attempt.pickupAgentId = resolved.agentId;
      attempt.handoverQtyKg = String(qty);
      attempt.handoverBy = actor.name;
      attempt.handoverAt = now;
      await em.getRepository(FertilizerDeliveryEntity).save(attempt);
      await moveTo(em, request, 'Picked up', actor, now, {
        action: 'Handed to the agent',
        note: `${qty} kg to ${agentName}${resolved.covering ? ' (covering)' : ''} for ${routeName}`,
      });
      // If he has already started his route, it is on its way now.
      if (await this.shiftActive(resolved.agentId, today)) {
        attempt.outForDeliveryAt = now;
        await em.getRepository(FertilizerDeliveryEntity).save(attempt);
        await moveTo(em, request, 'Out for delivery', SYSTEM, now, {
          action: 'Out for delivery',
          note: `${agentName} had already started the route`,
        });
      }
    });
    await this.auditAction(
      actor,
      request,
      'Recorded fertilizer handover',
      `${qty} kg to ${agentName}`,
    );
    return this.view.detail(request.id);
  }

  /**
   * What the agent brought back is checked into the store and stays committed to this owner.
   * Then: the route's next collection day (Rescheduled), or Needs review after the Nth failure.
   * The quantity must match exactly what he took minus what he delivered.
   */
  async checkIn(
    formattedId: string,
    qtyKg: number,
    actor: FlowActor,
    now: Date = new Date(),
  ): Promise<PublicRequestDetail> {
    await this.access.require(
      actor.role,
      'edit',
      'check returned fertilizer in',
      'fertilizer',
    );
    const request = await this.view.find(formattedId);
    if (
      request.status !== 'Failed' &&
      request.status !== 'Partially delivered'
    ) {
      throw new ConflictException(
        `Only a failed or partly delivered request comes back to the factory (this one is "${request.status}").`,
      );
    }
    const attempt = (
      await this.deliveries.find({ where: { requestId: request.id } })
    )
      .filter(
        (d) =>
          d.outcome !== null &&
          d.checkedInAt === null &&
          d.outcome !== 'delivered',
      )
      .sort((a, b) => b.attemptNo - a.attemptNo)[0];
    if (!attempt)
      throw new ConflictException(
        'There is nothing out with an agent to check in.',
      );
    const expected = round2(
      Number(attempt.handoverQtyKg ?? 0) - Number(attempt.deliveredQtyKg ?? 0),
    );
    const qty = round2(qtyKg);
    if (qty !== expected) {
      throw new ConflictException(
        `The agent should bring back ${expected} kg. Check in exactly that (recording a loss isn't supported yet).`,
      );
    }
    const failed = request.status === 'Failed';
    const { maxDeliveryAttempts } = await this.settings.get();
    const today = localDate(now);
    const route = await this.routeFor(request);
    const reason = failed
      ? `${FAIL_REASON_LABEL[attempt.failReason ?? 'other']}${attempt.failNote ? ` — ${attempt.failNote}` : ''}`
      : (attempt.shortfallReason ?? 'Part of the delivery was not taken');

    await this.requests.manager.transaction(async (em) => {
      await this.ledger.giveBack(em, request, qty, actor, now);
      attempt.checkedInQtyKg = String(qty);
      attempt.checkedInBy = actor.name;
      attempt.checkedInAt = now;
      await em.getRepository(FertilizerDeliveryEntity).save(attempt);
      await moveTo(em, request, 'Returned to factory', actor, now, {
        action: 'Checked back in',
        note: `${qty} kg back in the store — still committed to this owner`,
      });

      const next =
        failed && request.cycleFailures >= maxDeliveryAttempts
          ? null
          : await this.schedule.nextCollectionDay(route.id, today);
      if (!next) {
        await moveTo(em, request, 'Needs review', SYSTEM, now, {
          action: 'Needs review',
          note:
            failed && request.cycleFailures >= maxDeliveryAttempts
              ? `${request.cycleFailures} failed delivery attempts — an officer decides to retry or cancel`
              : `${this.label(route)} has no collection day scheduled`,
        });
        if (failed) {
          await this.notify(
            em,
            request,
            'failed',
            `failed:${attempt.id}`,
            now,
            {
              date: attempt.scheduledDate,
              reason,
              newDate: null,
            },
          );
        }
        return;
      }
      const nextAttempt = await this.newAttempt(
        em,
        request,
        route.id,
        next,
        now,
      );
      await moveTo(em, request, 'Rescheduled', SYSTEM, now, {
        action: 'Rescheduled',
        note: `Next delivery on ${next} (attempt ${nextAttempt.attemptNo})`,
      });
      if (failed) {
        await this.notify(em, request, 'failed', `failed:${attempt.id}`, now, {
          date: attempt.scheduledDate,
          reason,
          newDate: next,
        });
      } else {
        await this.notify(
          em,
          request,
          'dispatched',
          `dispatched:${nextAttempt.id}:${next}`,
          now,
          {
            qtyKg: qty,
            date: next,
            routeName: this.label(route),
          },
        );
      }
    });
    await this.auditAction(
      actor,
      request,
      'Checked returned fertilizer in',
      `${qty} kg`,
    );
    return this.view.detail(request.id);
  }

  /** After Needs review: try again on the next collection day (or a chosen scheduled date). */
  async retry(
    formattedId: string,
    chosenDate: string | undefined,
    actor: FlowActor,
    now: Date = new Date(),
  ): Promise<PublicRequestDetail> {
    await this.access.require(
      actor.role,
      'edit',
      'retry a fertilizer delivery',
      'fertilizer',
    );
    const request = await this.view.find(formattedId);
    if (request.status !== 'Needs review') {
      throw new ConflictException(
        `Only a request in review can be retried (this one is "${request.status}").`,
      );
    }
    const route = await this.routeFor(request);
    const today = localDate(now);
    let date: string | null;
    if (chosenDate) {
      if (chosenDate < today)
        throw new BadRequestException('Pick today or a later date.');
      if (!(await this.schedule.isScheduled(route.id, chosenDate))) {
        throw new ConflictException(
          `${this.label(route)} doesn't run on ${chosenDate}. Add that date to the route's schedule first.`,
        );
      }
      date = chosenDate;
    } else {
      date = await this.schedule.nextCollectionDay(route.id, today);
    }
    if (!date) {
      throw new ConflictException(
        `${this.label(route)} has no collection day scheduled.`,
      );
    }
    await this.requests.manager.transaction(async (em) => {
      await this.commitForDispatch(em, request, actor, now);
      request.cycleFailures = 0;
      const attempt = await this.newAttempt(em, request, route.id, date, now);
      await moveTo(em, request, 'Rescheduled', actor, now, {
        action: 'Retry',
        note: `New delivery on ${date} (attempt ${attempt.attemptNo})`,
      });
      await this.notify(
        em,
        request,
        'dispatched',
        `dispatched:${attempt.id}:${date}`,
        now,
        {
          qtyKg: this.remaining(request),
          date,
          routeName: this.label(route),
        },
      );
    });
    await this.auditAction(
      actor,
      request,
      'Retried fertilizer delivery',
      `Delivery on ${date}`,
    );
    return this.view.detail(request.id);
  }

  /** The owner refused the rest: release what wasn't delivered; the request ends Delivered. */
  async releaseShortfall(
    formattedId: string,
    reasonText: string,
    actor: FlowActor,
    now: Date = new Date(),
  ): Promise<PublicRequestDetail> {
    await this.access.require(
      actor.role,
      'edit',
      'release undelivered fertilizer',
      'fertilizer',
    );
    const reason = requireText(reasonText, 'A reason');
    const request = await this.view.find(formattedId);
    if (request.status !== 'Rescheduled' && request.status !== 'Needs review') {
      throw new ConflictException(
        `Release applies to an undelivered remainder waiting at the factory (this request is "${request.status}").`,
      );
    }
    if (Number(request.deliveredQtyKg) <= 0) {
      throw new ConflictException(
        'Nothing has been delivered yet — cancel the request instead.',
      );
    }
    await this.requests.manager.transaction(async (em) => {
      const released = await this.ledger.release(em, request.id, now);
      const open = await this.openAttempt(request.id, em);
      if (open) {
        open.cancelledAt = now;
        await em.getRepository(FertilizerDeliveryEntity).save(open);
      }
      await moveTo(em, request, 'Delivered', actor, now, {
        action: 'Undelivered remainder released',
        note: `${released} kg back to general stock: ${reason}`,
      });
    });
    await this.auditAction(
      actor,
      request,
      'Released undelivered fertilizer',
      reason,
    );
    return this.view.detail(request.id);
  }

  /**
   * Keep pre-pickup deliveries on a real collection day: a date the route no longer runs
   * (cancelled / moved in the route schedule) or a day that passed without a handover moves
   * to the first scheduled date on or after it (never earlier than today). Logged, and the
   * owner gets the new date.
   */
  async reconcile(now: Date = new Date(), requestId?: number): Promise<void> {
    const today = localDate(now);
    const open = (
      await this.deliveries.find(
        requestId !== undefined ? { where: { requestId } } : undefined,
      )
    ).filter(
      (d) =>
        d.outcome === null &&
        d.cancelledAt === null &&
        d.pickupAgentId === null,
    );
    for (const d of open) {
      const request = await this.requests.findOne({
        where: { id: d.requestId },
      });
      if (!request || !PRE_PICKUP.includes(request.status)) continue;
      const missed = d.scheduledDate < today;
      if (
        !missed &&
        (await this.schedule.isScheduled(d.routeId, d.scheduledDate))
      )
        continue;
      const from = d.scheduledDate < today ? today : d.scheduledDate;
      const next = await this.schedule.nextCollectionDay(
        d.routeId,
        addDays(from, -1),
      );
      if (!next || next === d.scheduledDate) continue;
      const before = d.scheduledDate;
      await this.requests.manager.transaction(async (em) => {
        d.scheduledDate = next;
        await em.getRepository(FertilizerDeliveryEntity).save(d);
        await logEvent(em, request.id, SYSTEM, now, {
          action: 'Delivery date moved',
          note: missed
            ? `Not handed over on ${before} — carried to the next collection day, ${next}`
            : `${before} was taken off the route's schedule — moved to ${next}`,
        });
        await this.notify(
          em,
          request,
          'dispatched',
          `dispatched:${d.id}:${next}`,
          now,
          {
            qtyKg: this.remaining(request),
            date: next,
            routeName: await this.routeName(d.routeId),
          },
        );
      });
    }
  }

  /* ── Agent (mobile, own tasks only) ─────────────────────────────── */

  async agentTasks(
    userId: number,
    now: Date = new Date(),
  ): Promise<PublicAgentTask[]> {
    const agent = await this.agents.me(userId);
    return this.tasksFor(agent.agentId, localDate(now), now);
  }

  /** The agent confirms what he received. Evidence only — the officer's handover moved the stock. */
  async agentPickup(
    userId: number,
    deliveryId: number,
    input: { qtyKg: number; recordedAt: string; syncKey: string },
    now: Date = new Date(),
  ): Promise<PublicAgentTask> {
    const agent = await this.agents.me(userId);
    const attempt = await this.ownAttempt(agent.agentId, deliveryId);
    const request = await this.view.find(attempt.requestId);
    if (attempt.pickupSyncKey === input.syncKey)
      return this.task(attempt, request, false);
    if (attempt.agentConfirmQtyKg !== null) {
      throw new ConflictException('You have already confirmed this pickup.');
    }
    const at = this.deviceTime(input.recordedAt, now);
    const qty = round2(input.qtyKg);
    const handed = Number(attempt.handoverQtyKg);
    await this.requests.manager.transaction(async (em) => {
      attempt.agentConfirmQtyKg = String(qty);
      attempt.agentConfirmedAt = at;
      attempt.pickupSyncKey = input.syncKey;
      attempt.pickupMismatch = qty !== handed;
      await em.getRepository(FertilizerDeliveryEntity).save(attempt);
      await logEvent(em, request.id, this.agentActor(agent.name), now, {
        action: attempt.pickupMismatch
          ? 'Agent confirmed pickup — quantity differs'
          : 'Agent confirmed pickup',
        note: attempt.pickupMismatch
          ? `Agent says ${qty} kg; the factory recorded ${handed} kg`
          : `${qty} kg`,
        deviceAt: at,
      });
    });
    if (attempt.pickupMismatch) {
      await this.audit.record(this.agentActor(agent.name) as never, {
        action: 'Fertilizer pickup quantity mismatch',
        module: 'Fertilizer',
        record: formatRequestId(request.id, request.createdAt),
        recordHref: `/fertilizer/requests/${formatRequestId(request.id, request.createdAt)}`,
        details: `Agent ${qty} kg vs handover ${handed} kg`,
      });
    }
    return this.task(attempt, request, false);
  }

  /**
   * Delivered at the estate: a photo plus the owner's name and confirm tap on the agent's
   * phone (no OTP). Offline-safe: the device time is kept, and a re-sent sync key is applied
   * once. Less than he carried → "Partially delivered" (reason required); the rest comes back.
   * The charge is written now, for the delivered quantity × the approval-time price.
   */
  async agentDelivered(
    userId: number,
    deliveryId: number,
    input: {
      deliveredQtyKg: number;
      ownerName: string;
      ownerConfirmed: boolean;
      photo: { takenAt: string; photoUrl?: string };
      shortfallReason?: string;
      recordedAt: string;
      syncKey: string;
    },
    now: Date = new Date(),
  ): Promise<PublicAgentTask> {
    const agent = await this.agents.me(userId);
    const attempt = await this.ownAttempt(agent.agentId, deliveryId);
    const request = await this.view.find(attempt.requestId);
    if (attempt.outcomeSyncKey === input.syncKey)
      return this.task(attempt, request, false);
    if (attempt.outcome !== null) {
      throw new ConflictException(
        'An outcome is already recorded for this delivery.',
      );
    }
    if (!WITH_AGENT.includes(request.status)) {
      throw new ConflictException(`This request is "${request.status}".`);
    }
    if (input.ownerConfirmed !== true || !input.ownerName?.trim()) {
      throw new BadRequestException(
        'The owner must give his name and confirm receipt.',
      );
    }
    const at = this.deviceTime(input.recordedAt, now);
    const held = Number(attempt.handoverQtyKg);
    const qty = round2(input.deliveredQtyKg);
    if (qty <= 0 || qty > held) {
      throw new BadRequestException(
        `Deliver between 0 and the ${held} kg you carry.`,
      );
    }
    const partial = qty < held;
    const shortfall = partial
      ? requireText(input.shortfallReason, 'Why the rest was not delivered')
      : null;
    if (request.ratePerKg === null) {
      throw new ConflictException('This request has no price snapshot.');
    }
    const rate = Number(request.ratePerKg);
    const total = round2(qty * rate);
    const photo: DeliveryPhoto = {
      label: 'Delivery photo',
      takenAt: this.deviceTime(input.photo.takenAt, now).toISOString(),
      takenBy: agent.name,
      ...(input.photo.photoUrl ? { photoUrl: input.photo.photoUrl } : {}),
    };

    await this.requests.manager.transaction(async (em) => {
      attempt.outcome = partial ? 'partial' : 'delivered';
      attempt.deliveredQtyKg = String(qty);
      attempt.shortfallReason = shortfall;
      attempt.ownerName = input.ownerName.trim();
      attempt.ownerConfirmedAt = at;
      attempt.photos = [...(attempt.photos ?? []), photo];
      attempt.recordedAt = at;
      attempt.syncedAt = now;
      attempt.outcomeSyncKey = input.syncKey;
      await em.getRepository(FertilizerDeliveryEntity).save(attempt);
      request.deliveredQtyKg = String(
        round2(Number(request.deliveredQtyKg) + qty),
      );
      const chargeRepo = em.getRepository(FertilizerChargeEntity);
      await chargeRepo.save(
        chargeRepo.create({
          stockMovementId: null,
          deliveryId: attempt.id,
          estateId: request.estateId,
          fertilizerRequestId: request.id,
          ratePerKg: String(rate),
          quantityKg: String(qty),
          totalCharge: String(total),
          paymentMethod: request.paymentMethod,
          settlementId: null,
          calculatedAt: now,
        }),
      );
      await moveTo(
        em,
        request,
        partial ? 'Partially delivered' : 'Delivered',
        this.agentActor(agent.name),
        now,
        {
          action: partial
            ? 'Partly delivered — owner confirmed'
            : 'Delivered — owner confirmed',
          note: `${qty} of ${held} kg; confirmed by ${attempt.ownerName}; photo taken${shortfall ? ` · not delivered: ${shortfall}` : ''}`,
          deviceAt: at,
        },
      );
      await this.notify(
        em,
        request,
        'delivered',
        `delivered:${attempt.id}`,
        now,
        {
          qtyKg: qty,
          date: localDate(at),
          amountRs: total,
          method: PAYMENT_METHOD_LABEL[request.paymentMethod],
        },
      );
    });
    return this.task(attempt, request, false);
  }

  /** Not delivered: a reason from the list (other = note), optional photo. Comes back for check-in. */
  async agentFailed(
    userId: number,
    deliveryId: number,
    input: {
      reason: FailReason;
      note?: string;
      photo?: { takenAt: string; photoUrl?: string };
      recordedAt: string;
      syncKey: string;
    },
    now: Date = new Date(),
  ): Promise<PublicAgentTask> {
    const agent = await this.agents.me(userId);
    const attempt = await this.ownAttempt(agent.agentId, deliveryId);
    const request = await this.view.find(attempt.requestId);
    if (attempt.outcomeSyncKey === input.syncKey)
      return this.task(attempt, request, false);
    if (attempt.outcome !== null) {
      throw new ConflictException(
        'An outcome is already recorded for this delivery.',
      );
    }
    if (!WITH_AGENT.includes(request.status)) {
      throw new ConflictException(`This request is "${request.status}".`);
    }
    const note = input.note?.trim() || null;
    if (input.reason === 'other' && !note) {
      throw new BadRequestException(
        'Say what happened when the reason is "Other".',
      );
    }
    const at = this.deviceTime(input.recordedAt, now);
    await this.requests.manager.transaction(async (em) => {
      attempt.outcome = 'failed';
      attempt.failReason = input.reason;
      attempt.failNote = note;
      if (input.photo) {
        attempt.photos = [
          ...(attempt.photos ?? []),
          {
            label: 'Failed delivery photo',
            takenAt: this.deviceTime(input.photo.takenAt, now).toISOString(),
            takenBy: agent.name,
            ...(input.photo.photoUrl ? { photoUrl: input.photo.photoUrl } : {}),
          },
        ];
      }
      attempt.recordedAt = at;
      attempt.syncedAt = now;
      attempt.outcomeSyncKey = input.syncKey;
      await em.getRepository(FertilizerDeliveryEntity).save(attempt);
      request.cycleFailures += 1;
      await moveTo(em, request, 'Failed', this.agentActor(agent.name), now, {
        action: 'Delivery failed',
        note: `${FAIL_REASON_LABEL[input.reason]}${note ? ` — ${note}` : ''}. The agent brings it back.`,
        deviceAt: at,
      });
    });
    return this.task(attempt, request, false);
  }

  /* ── internals ──────────────────────────────────────────────────── */

  /** The agent's fertilizer for `date`: waiting at the factory for him, or already with him. */
  private async tasksFor(
    agentId: number,
    date: string,
    now: Date,
  ): Promise<PublicAgentTask[]> {
    await this.reconcile(now);
    const out: PublicAgentTask[] = [];
    for (const d of await this.deliveries.find()) {
      if (d.outcome !== null || d.cancelledAt !== null) continue;
      const request = await this.requests.findOne({
        where: { id: d.requestId },
      });
      if (!request) continue;
      if (d.pickupAgentId !== null) {
        // after pickup the task stays with whoever took it, whatever the cover does
        if (
          d.pickupAgentId === agentId &&
          WITH_AGENT.includes(request.status)
        ) {
          out.push(await this.task(d, request, false));
        }
        continue;
      }
      if (!PRE_PICKUP.includes(request.status) || d.scheduledDate !== date)
        continue;
      if (!(await this.schedule.isScheduled(d.routeId, date))) continue;
      const res = await this.resolver.getAgentForRoute(d.routeId, date);
      if (res?.agentId === agentId)
        out.push(await this.task(d, request, res.covering));
    }
    return out;
  }

  private async stopTasks(
    agentId: number,
    date: string,
    now: Date,
  ): Promise<ExtraStopTask[]> {
    return (await this.tasksFor(agentId, date, now)).map((t) => ({
      kind: 'fertilizer' as const,
      estateId: t.estateId,
      estateName: t.estateName,
      routeId: t.routeId,
      routeName: t.routeName,
      date: t.scheduledDate,
      covering: t.covering,
      deliveryId: t.deliveryId,
      requestId: t.requestId,
      item: t.item,
      qtyKg: t.qtyKg,
      status: t.status,
      stage: t.stage,
    }));
  }

  /** He started his route: fertilizer he picked up for today is now on its way. */
  private async routeStarted(
    agentId: number,
    date: string,
    now: Date,
  ): Promise<void> {
    const name =
      (await this.directory.names()).get(agentId) ?? `Agent ${agentId}`;
    for (const d of await this.deliveries.find({
      where: { pickupAgentId: agentId },
    })) {
      if (
        d.outcome !== null ||
        d.cancelledAt !== null ||
        d.scheduledDate !== date
      )
        continue;
      const request = await this.requests.findOne({
        where: { id: d.requestId },
      });
      if (!request || request.status !== 'Picked up') continue;
      await this.requests.manager.transaction(async (em) => {
        d.outForDeliveryAt = now;
        await em.getRepository(FertilizerDeliveryEntity).save(d);
        await moveTo(
          em,
          request,
          'Out for delivery',
          this.agentActor(name),
          now,
          {
            action: 'Out for delivery',
            note: 'The agent started the route',
          },
        );
      });
    }
  }

  private async task(
    d: FertilizerDeliveryEntity,
    request: FertilizerRequestEntity,
    covering: boolean,
  ): Promise<PublicAgentTask> {
    const estate = await this.estates.findOne({ where: { id: d.estateId } });
    const carrying = d.pickupAgentId !== null;
    return {
      deliveryId: d.id,
      requestId: formatRequestId(request.id, request.createdAt),
      orderRef: request.orderRef,
      estateId: d.estateId,
      estateName: estate?.name ?? 'Unknown estate',
      routeId: d.routeId,
      routeName: await this.routeName(d.routeId),
      scheduledDate: d.scheduledDate,
      item: request.item,
      qtyKg: carrying ? Number(d.handoverQtyKg) : this.remaining(request),
      status: request.status,
      stage: carrying ? 'carrying' : 'awaiting_handover',
      covering,
      handoverQtyKg: d.handoverQtyKg !== null ? Number(d.handoverQtyKg) : null,
      agentConfirmQtyKg:
        d.agentConfirmQtyKg !== null ? Number(d.agentConfirmQtyKg) : null,
    };
  }

  /** Only the agent the fertilizer was handed to may act on it. 404 otherwise (no leaking others' tasks). */
  private async ownAttempt(
    agentId: number,
    deliveryId: number,
  ): Promise<FertilizerDeliveryEntity> {
    const d = await this.deliveries.findOne({ where: { id: deliveryId } });
    if (!d || (d.pickupAgentId !== null && d.pickupAgentId !== agentId)) {
      throw new NotFoundException(
        `No fertilizer delivery ${deliveryId} for you.`,
      );
    }
    if (d.pickupAgentId === null) {
      throw new ConflictException(
        'The factory hasn’t recorded the handover yet — collect the fertilizer at the store first.',
      );
    }
    return d;
  }

  /** Commit what still has to go out (approved − delivered), FEFO, and snapshot a price if missing. */
  private async commitForDispatch(
    em: EntityManager,
    request: FertilizerRequestEntity,
    actor: FlowActor,
    now: Date,
  ): Promise<void> {
    await this.ledger.ensureCommitted(
      em,
      request,
      this.remaining(request),
      now,
    );
    if (request.ratePerKg === null) {
      // Legacy approvals (before prices existed) are priced when first dispatched.
      const price = await this.requestService.currentPrice(
        request.item,
        localDate(now),
      );
      if (!price) {
        throw new ConflictException(
          `No price is set for ${request.item}. An Administrator must set one first.`,
        );
      }
      request.ratePerKg = price.ratePerKg;
      request.priceId = price.id;
      await logEvent(em, request.id, actor, now, {
        action: 'Price set',
        note: `Approved before prices existed — priced at Rs. ${Number(price.ratePerKg)}/kg when dispatched`,
      });
    }
  }

  private async newAttempt(
    em: EntityManager,
    request: FertilizerRequestEntity,
    routeId: number,
    date: string,
    now: Date,
  ): Promise<FertilizerDeliveryEntity> {
    const repo = em.getRepository(FertilizerDeliveryEntity);
    const prior = await repo.find({ where: { requestId: request.id } });
    return repo.save(
      repo.create({
        requestId: request.id,
        attemptNo: prior.reduce((m, d) => Math.max(m, d.attemptNo), 0) + 1,
        estateId: request.estateId,
        routeId,
        scheduledDate: date,
        pickupAgentId: null,
        handoverQtyKg: null,
        handoverBy: null,
        handoverAt: null,
        agentConfirmQtyKg: null,
        agentConfirmedAt: null,
        pickupMismatch: false,
        pickupSyncKey: null,
        outForDeliveryAt: null,
        outcome: null,
        deliveredQtyKg: null,
        shortfallReason: null,
        ownerName: null,
        ownerConfirmedAt: null,
        photos: [],
        failReason: null,
        failNote: null,
        recordedAt: null,
        syncedAt: null,
        outcomeSyncKey: null,
        checkedInQtyKg: null,
        checkedInBy: null,
        checkedInAt: null,
        cancelledAt: null,
        createdAt: now,
      }),
    );
  }

  private async openAttempt(
    requestId: number,
    em?: EntityManager,
  ): Promise<FertilizerDeliveryEntity | null> {
    const repo = em
      ? em.getRepository(FertilizerDeliveryEntity)
      : this.deliveries;
    return (
      (await repo.find({ where: { requestId } }))
        .filter((d) => d.outcome === null && d.cancelledAt === null)
        .sort((a, b) => b.attemptNo - a.attemptNo)[0] ?? null
    );
  }

  /** The estate's current route (auto-filled; each estate belongs to exactly one route). */
  private async routeFor(
    request: FertilizerRequestEntity,
  ): Promise<RouteEntity> {
    const estate = await this.estates.findOne({
      where: { id: request.estateId },
    });
    if (!estate)
      throw new NotFoundException('The estate for this request is missing.');
    if (estate.selfDelivery) {
      throw new ConflictException(
        `${estate.name} delivers its own tea, so no agent visits it. Hand the fertilizer over at the factory instead (not supported in this flow yet).`,
      );
    }
    if (estate.routeId === null) {
      throw new ConflictException(`${estate.name} has no route.`);
    }
    request.routeId = estate.routeId;
    const route = await this.routes.findOne({ where: { id: estate.routeId } });
    if (!route) throw new NotFoundException(`No route ${estate.routeId}.`);
    return route;
  }

  private remaining(request: FertilizerRequestEntity): number {
    const approved = Number(request.approvedQtyKg ?? request.quantityKg);
    return round2(approved - Number(request.deliveredQtyKg ?? 0));
  }

  private async shiftActive(agentId: number, date: string): Promise<boolean> {
    const day = await this.dayStatus.findOne({ where: { agentId, day: date } });
    return !!day?.shiftStartedAt && !day.shiftEndedAt;
  }

  private deviceTime(value: string, now: Date): Date {
    const at = new Date(value);
    if (Number.isNaN(at.getTime()))
      throw new BadRequestException('Invalid device time.');
    if (at.getTime() > now.getTime() + MAX_FUTURE_SKEW_MS) {
      throw new BadRequestException(
        'The device clock is ahead of the server — check the phone’s time.',
      );
    }
    return at;
  }

  private agentActor(name: string): FlowActor {
    return { name, role: 'CollectionAgent' };
  }

  private async routeName(routeId: number): Promise<string> {
    const route = await this.routes.findOne({ where: { id: routeId } });
    return route ? this.label(route) : `Route ${routeId}`;
  }

  private label(route: RouteEntity): string {
    return route.name ?? `Route ${route.id}`;
  }

  private async notify(
    em: EntityManager,
    request: FertilizerRequestEntity,
    kind: NotificationKind,
    dedupeKey: string,
    now: Date,
    extra: NoticePayload,
  ): Promise<void> {
    await enqueueNotice(em.getRepository(FertilizerNotificationEntity), {
      requestId: request.id,
      kind,
      dedupeKey,
      now,
      payload: {
        requestRef: formatRequestId(request.id, request.createdAt),
        item: request.item,
        method: PAYMENT_METHOD_LABEL[request.paymentMethod],
        ...extra,
      },
    });
  }

  private async auditAction(
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
