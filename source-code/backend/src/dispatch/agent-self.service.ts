import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { CollectionRecordEntity } from '../collections/collection-record.entity';
import { RouteEntity } from '../estates/route.entity';
import { AgentDayStatusEntity } from './agent-day-status.entity';
import { AgentLocationPingEntity } from './agent-location-ping.entity';
import {
  AgentDirectoryService,
  type AgentInfo,
} from './agent-directory.service';
import { DevicePushTokenEntity } from './device-push-token.entity';
import { DispatchNotifier } from './dispatch-notifier.service';
import { DispatchService } from './dispatch.service';
import { coverSummary, toPublicAssignment } from './dispatch.service';
import {
  localDate,
  windowIncludes,
  type PublicAssignment,
  type PublicCoverRequest,
} from './dispatch-map';
import { PositionCacheService } from './position-cache.service';
import { RouteAssignmentEntity } from './route-assignment.entity';
import { RouteLoadService } from './route-load.service';
import { RouteResolverService } from './route-resolver.service';

export interface PingInput {
  /** device clock, ISO — when the fix was taken */
  recordedAt: string;
  lat: number;
  lng: number;
  accuracyM?: number;
  source?: 'ping' | 'checkin';
}

export interface PingResult {
  accepted: number;
  rejected: number;
  /** why items were rejected (counts) — helps the device decide whether to retry */
  reasons: Record<string, number>;
}

/** Pings stamped further in the future than this (device clock skew) are rejected. */
const MAX_FUTURE_SKEW_MS = 5 * 60_000;

/** Everything the collection agent's phone does against the dispatch API. */
@Injectable()
export class AgentSelfService {
  constructor(
    @InjectRepository(RouteAssignmentEntity)
    private readonly assignments: Repository<RouteAssignmentEntity>,
    @InjectRepository(AgentDayStatusEntity)
    private readonly dayStatus: Repository<AgentDayStatusEntity>,
    @InjectRepository(AgentLocationPingEntity)
    private readonly pings: Repository<AgentLocationPingEntity>,
    @InjectRepository(DevicePushTokenEntity)
    private readonly tokens: Repository<DevicePushTokenEntity>,
    @InjectRepository(CollectionRecordEntity)
    private readonly records: Repository<CollectionRecordEntity>,
    @InjectRepository(RouteEntity)
    private readonly routes: Repository<RouteEntity>,
    private readonly directory: AgentDirectoryService,
    private readonly dispatch: DispatchService,
    private readonly resolver: RouteResolverService,
    private readonly load: RouteLoadService,
    private readonly cache: PositionCacheService,
    private readonly notifier: DispatchNotifier,
    private readonly audit: AuditService,
  ) {}

  /** The calling agent, from the JWT's user id. */
  async me(userId: number): Promise<AgentInfo> {
    const agent = await this.directory.byUserId(userId);
    if (!agent)
      throw new ForbiddenException('This account is not a collection agent.');
    // Enforced on EVERY agent call (not just at sign-in), so a deactivated agent's token stops
    // working at once and a still-temporary password blocks everything until it is changed.
    const cred = await this.directory.credentials(userId);
    if (!cred || cred.status === 'suspended') {
      throw new ForbiddenException(
        'This login has been suspended. Contact your factory.',
      );
    }
    if (cred.mustChangePassword) {
      throw new ForbiddenException('Change your temporary password first.');
    }
    return agent;
  }

  /* ── Shift ── */

  async startShift(userId: number, now: Date = new Date()) {
    const agent = await this.me(userId);
    const date = localDate(now);
    const day = await this.dayStatus.findOne({
      where: { agentId: agent.agentId, day: date },
    });
    if (day?.status === 'ABSENT') {
      throw new ConflictException(
        'You are marked absent today. Mark yourself available before starting a shift.',
      );
    }
    if (day?.shiftStartedAt && !day.shiftEndedAt) {
      return shiftState(day); // idempotent
    }
    if (day?.shiftEndedAt) {
      throw new ConflictException('Your shift for today has already ended.');
    }
    const saved = await this.dispatch.upsertDay(agent.agentId, date, {
      status: 'AVAILABLE',
      shiftStartedAt: now,
      shiftEndedAt: null,
    });
    return shiftState(saved);
  }

  async endShift(userId: number, now: Date = new Date()) {
    const agent = await this.me(userId);
    const date = localDate(now);
    const day = await this.dayStatus.findOne({
      where: { agentId: agent.agentId, day: date },
    });
    if (!day?.shiftStartedAt)
      throw new ConflictException('No shift is active.');
    if (day.shiftEndedAt) return shiftState(day);
    day.shiftEndedAt = now;
    return shiftState(await this.dayStatus.save(day));
  }

  /* ── Absence (self-reported) ── */

  async reportAbsence(
    userId: number,
    reason: string | undefined,
    now: Date = new Date(),
  ) {
    const agent = await this.me(userId);
    const date = localDate(now);
    await this.dispatch.upsertDay(agent.agentId, date, {
      status: 'ABSENT',
      source: 'self',
      reason: reason ?? null,
      markedBy: agent.name,
    });
    // the agent can't also be covering someone else
    const held = (
      await this.assignments.find({ where: { agentId: agent.agentId } })
    ).filter(
      (a) =>
        a.type === 'COVER' &&
        (a.status === 'ACTIVE' || a.status === 'PENDING') &&
        windowIncludes(a, date),
    );
    for (const c of held) {
      c.status = 'CANCELLED';
      c.respondedAt = now;
      c.reason = `${c.reason ? `${c.reason} · ` : ''}Cover agent reported absent`;
      await this.assignments.save(c);
    }
    await this.audit.record(
      { name: agent.name, role: 'Officer', sub: agent.userId },
      {
        action: 'Agent reported own absence',
        module: 'Dispatch',
        record: agent.name,
        details: reason,
      },
    );
    return { agentId: agent.agentId, date, status: 'ABSENT' as const };
  }

  /** Agent marks themselves available again; covers on their route end early. */
  async reportAvailable(userId: number, now: Date = new Date()) {
    const agent = await this.me(userId);
    const date = localDate(now);
    await this.dispatch.upsertDay(agent.agentId, date, {
      status: 'AVAILABLE',
      source: null,
      reason: null,
      markedBy: agent.name,
    });
    await this.dispatch.endCoversForReturningAgent(agent.agentId, date, now);
    return { agentId: agent.agentId, date, status: 'AVAILABLE' as const };
  }

  /* ── Location pings (shift-only, batch upload) ── */

  /**
   * A fix is accepted only if it was recorded inside one of the agent's shifts
   * (start ≤ recordedAt ≤ end-or-open). A batch queued offline and uploaded after the
   * shift ended is still accepted; anything recorded off-shift is rejected — there is
   * no tracking off-shift. Times are the DEVICE's, never rewritten.
   */
  async ingestPings(
    userId: number,
    items: PingInput[],
    now: Date = new Date(),
  ): Promise<PingResult> {
    const agent = await this.me(userId);
    const reasons: Record<string, number> = {};
    const reject = (why: string) => {
      reasons[why] = (reasons[why] ?? 0) + 1;
    };

    const parsed = items.map((p) => ({ ...p, at: new Date(p.recordedAt) }));
    const days = [
      ...new Set(
        parsed
          .filter((p) => !Number.isNaN(p.at.getTime()))
          .map((p) => localDate(p.at)),
      ),
    ];
    const dayRows = new Map<string, AgentDayStatusEntity>();
    for (const day of days) {
      const row = await this.dayStatus.findOne({
        where: { agentId: agent.agentId, day },
      });
      if (row) dayRows.set(day, row);
    }

    const toInsert: AgentLocationPingEntity[] = [];
    let newest: (typeof parsed)[number] | null = null;
    for (const p of parsed) {
      if (Number.isNaN(p.at.getTime())) {
        reject('invalid_time');
        continue;
      }
      if (p.at.getTime() > now.getTime() + MAX_FUTURE_SKEW_MS) {
        reject('in_future');
        continue;
      }
      const row = dayRows.get(localDate(p.at));
      const started = row?.shiftStartedAt;
      if (
        !started ||
        p.at < started ||
        (row?.shiftEndedAt && p.at > row.shiftEndedAt)
      ) {
        reject('outside_shift');
        continue;
      }
      toInsert.push(
        this.pings.create({
          agentId: agent.agentId,
          recordedAt: p.at,
          receivedAt: now,
          lat: String(p.lat),
          lng: String(p.lng),
          accuracyM: p.accuracyM !== undefined ? String(p.accuracyM) : null,
          source: p.source ?? 'ping',
        }),
      );
      if (!newest || p.at > newest.at) newest = p;
    }

    if (toInsert.length > 0) await this.pings.save(toInsert);
    if (newest) {
      await this.cache.setLatest(agent.agentId, {
        lat: newest.lat,
        lng: newest.lng,
        recordedAt: newest.at.toISOString(),
        source: newest.source ?? 'ping',
      });
    }
    return {
      accepted: toInsert.length,
      rejected: items.length - toInsert.length,
      reasons,
    };
  }

  /* ── Cover requests ── */

  async myCoverRequests(
    userId: number,
    now: Date = new Date(),
  ): Promise<PublicCoverRequest[]> {
    const agent = await this.me(userId);
    await this.resolver.expireStale(now);
    const date = localDate(now);
    const pending = (
      await this.assignments.find({
        where: { agentId: agent.agentId, status: 'PENDING' },
      })
    ).filter((a) => a.type === 'COVER' && windowIncludes(a, date));
    const out: PublicCoverRequest[] = [];
    for (const a of pending) {
      const route = await this.routes.findOne({ where: { id: a.routeId } });
      const name = route?.name ?? `Route ${a.routeId}`;
      const stops = await this.load.stopCounts(a.routeId, date);
      const expectedKg = await this.load.expectedRouteKg(a.routeId, date);
      out.push({
        id: a.id,
        routeId: a.routeId,
        routeName: name,
        type: a.type,
        status: a.status,
        validFrom: a.validFrom,
        stops: stops.total,
        expectedKg,
        summary: coverSummary(name, stops.total, expectedKg),
        expiresAt: a.expiresAt ? a.expiresAt.toISOString() : null,
        requestedBy: a.createdBy,
      });
    }
    return out;
  }

  async respondToCover(
    userId: number,
    assignmentId: number,
    decision: 'accept' | 'decline',
    now: Date = new Date(),
  ): Promise<PublicAssignment> {
    const agent = await this.me(userId);
    await this.resolver.expireStale(now);
    const a = await this.assignments.findOne({ where: { id: assignmentId } });
    if (!a || a.agentId !== agent.agentId || a.type !== 'COVER') {
      throw new NotFoundException('No such cover request for you.');
    }
    if (a.status === 'EXPIRED') {
      throw new ConflictException('This cover request has expired.');
    }
    if (a.status !== 'PENDING') {
      throw new ConflictException(
        `This request was already ${a.status.toLowerCase()}.`,
      );
    }
    if (decision === 'accept') {
      const date = localDate(now);
      // one cover per day: accepting while already covering elsewhere is refused
      const others = (
        await this.assignments.find({
          where: { agentId: agent.agentId, status: 'ACTIVE' },
        })
      ).filter((x) => x.type === 'COVER' && windowIncludes(x, date));
      if (others.length > 0) {
        throw new ConflictException(
          'You already cover a route today (one cover per day).',
        );
      }
      const day = await this.dayStatus.findOne({
        where: { agentId: agent.agentId, day: date },
      });
      if (day?.status === 'ABSENT') {
        throw new BadRequestException('You are marked absent today.');
      }
      a.status = 'ACTIVE';
      a.acceptedAt = now;
    } else {
      a.status = 'DECLINED';
    }
    a.respondedAt = now;
    const saved = await this.assignments.save(a);
    const route = await this.routes.findOne({ where: { id: a.routeId } });
    await this.audit.record(
      { name: agent.name, role: 'Officer', sub: agent.userId },
      {
        action:
          decision === 'accept'
            ? 'Accepted route cover'
            : 'Declined route cover',
        module: 'Dispatch',
        record: `${route?.name ?? `Route ${a.routeId}`} ← ${agent.name}`,
      },
    );
    return toPublicAssignment(saved);
  }

  /* ── Stops & push token ── */

  /** Today's stops on every route this agent is responsible for (own + covered), via the resolver. */
  async myStops(userId: number, now: Date = new Date()) {
    const agent = await this.me(userId);
    const date = localDate(now);
    const routeRows = await this.routes.find();
    const resolved = await this.resolver.getAgentsForRoutes(
      routeRows.map((r) => r.id),
      date,
    );
    const mine = routeRows.filter(
      (r) => resolved.get(r.id)?.agentId === agent.agentId,
    );
    const stops: {
      id: string;
      routeId: number;
      routeName: string;
      covering: boolean;
      estateName: string;
      estateWeightKg: number;
      status: string;
    }[] = [];
    for (const r of mine) {
      const rows = (
        await this.records.find({ where: { routeId: r.id } })
      ).filter((x) => x.collectionDate === date);
      for (const x of rows) {
        stops.push({
          id: x.id,
          routeId: r.id,
          routeName: r.name ?? `Route ${r.id}`,
          covering: resolved.get(r.id)?.covering ?? false,
          estateName: x.estateName,
          estateWeightKg: Number(x.weightKg),
          status: x.status,
        });
      }
    }
    return {
      date,
      routes: mine.map((r) => ({ id: r.id, name: r.name })),
      stops,
    };
  }

  async savePushToken(
    userId: number,
    token: string,
    platform?: string,
  ): Promise<void> {
    await this.me(userId);
    await this.tokens.save(
      this.tokens.create({ token, userId, platform: platform ?? null }),
    );
  }
}

function shiftState(day: AgentDayStatusEntity) {
  return {
    date: day.day,
    status: day.status,
    shiftStartedAt: day.shiftStartedAt?.toISOString() ?? null,
    shiftEndedAt: day.shiftEndedAt?.toISOString() ?? null,
    active: !!day.shiftStartedAt && !day.shiftEndedAt,
  };
}
