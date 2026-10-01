import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import type { AppRole } from '../auth/role-map';
import { EstateEntity } from '../estates/estate.entity';
import { RouteEntity } from '../estates/route.entity';
import { AgentDayStatusEntity } from './agent-day-status.entity';
import { AgentLocationPingEntity } from './agent-location-ping.entity';
import {
  type AgentInfo,
  AgentDirectoryService,
} from './agent-directory.service';
import { CandidateRankingService } from './candidate-ranking.service';
import { DispatchNotifier } from './dispatch-notifier.service';
import { DispatchSettingsService } from './dispatch-settings.service';
import {
  boardStatusOf,
  freshnessOf,
  localDate,
  localTime,
  orderStops,
  round1,
  windowIncludes,
  type PublicAssignment,
  type PublicBoard,
  type PublicBoardAgent,
  type PublicBoardCoverRequest,
  type PublicBoardRoute,
  type PublicCandidate,
  type PublicMissedCheckin,
} from './dispatch-map';
import { PositionCacheService } from './position-cache.service';
import { RouteAssignmentEntity } from './route-assignment.entity';
import { RouteLoadService } from './route-load.service';
import {
  type ResolvedAgent,
  RouteResolverService,
} from './route-resolver.service';

export interface DispatchActor {
  name: string;
  role: AppRole;
  sub?: number | null;
}

const addDays = (date: string, days: number): string => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export function toPublicAssignment(a: RouteAssignmentEntity): PublicAssignment {
  return {
    id: a.id,
    routeId: a.routeId,
    agentId: a.agentId,
    type: a.type,
    status: a.status,
    validFrom: a.validFrom,
    validTo: a.validTo,
    expiresAt: a.expiresAt ? a.expiresAt.toISOString() : null,
  };
}

@Injectable()
export class DispatchService {
  constructor(
    @InjectRepository(RouteAssignmentEntity)
    private readonly assignments: Repository<RouteAssignmentEntity>,
    @InjectRepository(AgentDayStatusEntity)
    private readonly dayStatus: Repository<AgentDayStatusEntity>,
    @InjectRepository(AgentLocationPingEntity)
    private readonly pings: Repository<AgentLocationPingEntity>,
    @InjectRepository(RouteEntity)
    private readonly routes: Repository<RouteEntity>,
    @InjectRepository(EstateEntity)
    private readonly estates: Repository<EstateEntity>,
    private readonly resolver: RouteResolverService,
    private readonly load: RouteLoadService,
    private readonly ranking: CandidateRankingService,
    private readonly directory: AgentDirectoryService,
    private readonly cache: PositionCacheService,
    private readonly notifier: DispatchNotifier,
    private readonly settings: DispatchSettingsService,
    private readonly audit: AuditService,
  ) {}

  /* ── Board ─────────────────────────────────────────────────────── */

  async board(now: Date = new Date()): Promise<PublicBoard> {
    const date = localDate(now);
    await this.resolver.expireStale(now);

    const [agents, routeRows, estateRows, dayRows, allAssignments] =
      await Promise.all([
        this.directory.all(),
        this.routes.find(),
        this.estates.find(),
        this.dayStatus.find({ where: { day: date } }),
        this.assignments.find(),
      ]);
    const active = allAssignments.filter((a) => a.status === 'ACTIVE');
    const routeName = new Map(
      routeRows.map((r) => [r.id, r.name ?? `Route ${r.id}`]),
    );
    const dayByAgent = new Map(dayRows.map((d) => [d.agentId, d]));
    const resolved = await this.resolver.getAgentsForRoutes(
      routeRows.map((r) => r.id),
      date,
    );
    const agentName = new Map(agents.map((a) => [a.agentId, a.name]));

    // routes each agent is responsible for today (own + covered)
    const responsible = new Map<number, number[]>();
    for (const [routeId, r] of resolved) {
      if (!r) continue;
      responsible.set(r.agentId, [
        ...(responsible.get(r.agentId) ?? []),
        routeId,
      ]);
    }
    const ownRoute = new Map<number, number>();
    for (const a of active) {
      if (a.type === 'PERMANENT' && windowIncludes(a, date)) {
        ownRoute.set(a.agentId, a.routeId);
      }
    }

    const boardAgents: PublicBoardAgent[] = [];
    for (const agent of agents) {
      const day = dayByAgent.get(agent.agentId);
      const mine = responsible.get(agent.agentId) ?? [];
      const coverRoute =
        mine.find((rid) => resolved.get(rid)?.covering) ?? null;
      let done = 0;
      let total = 0;
      for (const rid of mine) {
        const c = await this.load.stopCounts(rid, date);
        done += c.done;
        total += c.total;
      }
      const kg = await this.load.kgCollectedToday(agent.agentId, date);
      const position = await this.lastKnownPosition(agent.agentId);
      const fresh = freshnessOf(
        position ? new Date(position.recordedAt) : null,
        now,
      );
      const own = ownRoute.get(agent.agentId) ?? null;
      boardAgents.push({
        agentId: agent.agentId,
        employeeId: agent.employeeId,
        name: agent.name,
        routeId: own,
        routeName: own ? (routeName.get(own) ?? null) : null,
        coveringRouteId: coverRoute,
        coveringRouteName: coverRoute
          ? (routeName.get(coverRoute) ?? null)
          : null,
        status: boardStatusOf({
          absent: day?.status === 'ABSENT',
          covering: coverRoute !== null,
          shiftStarted: !!day?.shiftStartedAt,
          shiftEnded: !!day?.shiftEndedAt,
          stopsDone: done,
          stopsTotal: total,
        }),
        absent: day?.status === 'ABSENT',
        stopsDone: done,
        stopsTotal: total,
        kgCollected: kg,
        shiftStartedAt: day?.shiftStartedAt?.toISOString() ?? null,
        lastSeen: position?.recordedAt ?? null,
        freshness: fresh.level,
        ageMin: fresh.ageMin,
        position: position ? { lat: position.lat, lng: position.lng } : null,
      });
    }

    const routeCounts = new Map(
      await Promise.all(
        routeRows.map(
          async (r) => [r.id, await this.load.stopCounts(r.id, date)] as const,
        ),
      ),
    );
    const boardRoutes: PublicBoardRoute[] = routeRows.map((r) => {
      const res = resolved.get(r.id) ?? null;
      const counts = routeCounts.get(r.id);
      const stops = orderStops(
        estateRows
          .filter((e) => e.routeId === r.id && e.lat !== null && e.lng !== null)
          .map((e) => ({
            estateId: e.id,
            name: e.name,
            lat: Number(e.lat),
            lng: Number(e.lng),
          })),
      );
      return {
        routeId: r.id,
        name: r.name ?? `Route ${r.id}`,
        agentId: res?.agentId ?? null,
        agentName: res ? (agentName.get(res.agentId) ?? null) : null,
        covered: res?.covering ?? false,
        stopsDone: counts?.done ?? 0,
        stopsTotal: counts?.total ?? 0,
        stops,
      };
    });

    const coverRequests: PublicBoardCoverRequest[] = allAssignments
      .filter(
        (a) =>
          a.type === 'COVER' &&
          a.validFrom === date &&
          (a.status === 'PENDING' ||
            a.status === 'DECLINED' ||
            a.status === 'EXPIRED'),
      )
      .map((a) => ({
        id: a.id,
        routeId: a.routeId,
        routeName: routeName.get(a.routeId) ?? `Route ${a.routeId}`,
        agentId: a.agentId,
        agentName: agentName.get(a.agentId) ?? `Agent ${a.agentId}`,
        status: a.status as PublicBoardCoverRequest['status'],
        expiresAt: a.expiresAt ? a.expiresAt.toISOString() : null,
        requestedBy: a.createdBy,
      }))
      .sort((x, y) => y.id - x.id);

    return {
      date,
      generatedAt: now.toISOString(),
      agents: boardAgents,
      routes: boardRoutes,
      coverRequests,
      missedCheckins: await this.missedCheckins(now, {
        agents,
        dayByAgent,
        resolved,
        routeName,
      }),
    };
  }

  /** Alert (never automatic absence): agents due on a route who haven't started a shift by the cutoff. */
  async missedCheckins(
    now: Date = new Date(),
    pre?: {
      agents: AgentInfo[];
      dayByAgent: Map<number, AgentDayStatusEntity>;
      resolved: Map<number, ResolvedAgent | null>;
      routeName: Map<number, string>;
    },
  ): Promise<PublicMissedCheckin[]> {
    const { shiftStartTime } = await this.settings.get();
    if (localTime(now) <= shiftStartTime) return [];
    const date = localDate(now);

    let agents = pre?.agents;
    let dayByAgent = pre?.dayByAgent;
    let resolved = pre?.resolved;
    let routeName = pre?.routeName;
    if (!agents || !dayByAgent || !resolved || !routeName) {
      const routeRows = await this.routes.find();
      agents = await this.directory.all();
      dayByAgent = new Map(
        (await this.dayStatus.find({ where: { day: date } })).map((d) => [
          d.agentId,
          d,
        ]),
      );
      resolved = await this.resolver.getAgentsForRoutes(
        routeRows.map((r) => r.id),
        date,
      );
      routeName = new Map(
        routeRows.map((r) => [r.id, r.name ?? `Route ${r.id}`]),
      );
    }

    const out: PublicMissedCheckin[] = [];
    for (const agent of agents) {
      const day = dayByAgent.get(agent.agentId);
      if (day?.status === 'ABSENT' || day?.shiftStartedAt) continue;
      const routeId = [...resolved.entries()].find(
        ([, r]) => r?.agentId === agent.agentId,
      )?.[0];
      if (routeId === undefined) continue;
      out.push({
        agentId: agent.agentId,
        name: agent.name,
        routeName: routeName.get(routeId) ?? null,
        shiftStartTime,
      });
    }
    return out;
  }

  /** Latest fix: cache first (Redis / in-process), else the newest ping in Postgres. */
  private async lastKnownPosition(
    agentId: number,
  ): Promise<{ lat: number; lng: number; recordedAt: string } | null> {
    const cached = await this.cache.getLatest(agentId);
    if (cached) return cached;
    const row = await this.pings.findOne({
      where: { agentId },
      order: { recordedAt: 'DESC' },
    });
    return row
      ? {
          lat: Number(row.lat),
          lng: Number(row.lng),
          recordedAt: row.recordedAt.toISOString(),
        }
      : null;
  }

  /* ── Absence ───────────────────────────────────────────────────── */

  async markAbsent(
    agentId: number,
    reason: string | undefined,
    actor: DispatchActor,
    now: Date = new Date(),
  ): Promise<{ agentId: number; date: string; status: 'ABSENT' }> {
    const agent = await this.requireAgent(agentId);
    const date = localDate(now);
    await this.upsertDay(agentId, date, {
      status: 'ABSENT',
      source: 'officer',
      reason: reason ?? null,
      markedBy: actor.name,
    });
    // An absent agent can't be covering someone else — hand that route back.
    await this.cancelCoversHeldBy(
      agentId,
      date,
      'Cover agent marked absent',
      now,
    );
    await this.audit.record(actor, {
      action: 'Marked agent absent',
      module: 'Dispatch',
      record: agent.name,
      details: reason ?? undefined,
    });
    return { agentId, date, status: 'ABSENT' };
  }

  async markAvailable(
    agentId: number,
    actor: DispatchActor,
    now: Date = new Date(),
  ): Promise<{ agentId: number; date: string; status: 'AVAILABLE' }> {
    const agent = await this.requireAgent(agentId);
    const date = localDate(now);
    await this.upsertDay(agentId, date, {
      status: 'AVAILABLE',
      source: null,
      reason: null,
      markedBy: actor.name,
    });
    await this.endCoversForReturningAgent(agentId, date, now);
    await this.audit.record(actor, {
      action: 'Marked agent available again',
      module: 'Dispatch',
      record: agent.name,
    });
    return { agentId, date, status: 'AVAILABLE' };
  }

  /** Covers on the returning agent's own route end early (no later than today). */
  async endCoversForReturningAgent(
    agentId: number,
    date: string,
    now: Date,
  ): Promise<number> {
    const all = await this.assignments.find();
    const ownRoutes = all
      .filter(
        (a) =>
          a.type === 'PERMANENT' &&
          a.status === 'ACTIVE' &&
          a.agentId === agentId &&
          windowIncludes(a, date),
      )
      .map((a) => a.routeId);
    const covers = all.filter(
      (a) =>
        a.type === 'COVER' &&
        ownRoutes.includes(a.routeId) &&
        (a.status === 'ACTIVE' || a.status === 'PENDING') &&
        windowIncludes(a, date),
    );
    for (const c of covers) {
      c.status = 'CANCELLED';
      c.respondedAt = now;
      c.reason = `${c.reason ? `${c.reason} · ` : ''}Original agent available again`;
      await this.assignments.save(c);
      await this.notifier.notifyAgent(c.agentId, {
        type: 'cover_response',
        title: 'Cover ended',
        body: 'The original agent is back — you no longer cover that route today.',
        referenceId: c.id,
        referenceType: 'route_assignments',
      });
    }
    return covers.length;
  }

  private async cancelCoversHeldBy(
    agentId: number,
    date: string,
    why: string,
    now: Date,
  ): Promise<void> {
    const held = (await this.assignments.find()).filter(
      (a) =>
        a.type === 'COVER' &&
        a.agentId === agentId &&
        (a.status === 'ACTIVE' || a.status === 'PENDING') &&
        windowIncludes(a, date),
    );
    for (const c of held) {
      c.status = 'CANCELLED';
      c.respondedAt = now;
      c.reason = `${c.reason ? `${c.reason} · ` : ''}${why}`;
      await this.assignments.save(c);
    }
  }

  /* ── Cover ─────────────────────────────────────────────────────── */

  async candidates(
    routeId: number,
    now: Date = new Date(),
  ): Promise<PublicCandidate[]> {
    await this.requireRoute(routeId);
    await this.resolver.expireStale(now);
    return this.ranking.rank(routeId, localDate(now));
  }

  async createCoverRequest(
    input: { routeId: number; agentId: number; reason?: string },
    actor: DispatchActor,
    now: Date = new Date(),
  ): Promise<PublicAssignment> {
    const route = await this.requireRoute(input.routeId);
    const target = await this.requireAgent(input.agentId);
    const date = localDate(now);
    await this.resolver.expireStale(now);

    const existing = (
      await this.assignments.find({ where: { routeId: route.id } })
    ).find(
      (a) =>
        a.type === 'COVER' &&
        (a.status === 'ACTIVE' || a.status === 'PENDING') &&
        windowIncludes(a, date),
    );
    if (existing) {
      throw new ConflictException(
        `${route.name ?? `Route ${route.id}`} already has a ${existing.status === 'PENDING' ? 'pending' : 'active'} cover today.`,
      );
    }

    const eligible = (await this.ranking.rank(route.id, date)).find(
      (c) => c.agentId === input.agentId,
    );
    if (!eligible) {
      throw new ConflictException(
        `${target.name} can't cover today — absent, finished their shift, or already covering a route (one cover per day).`,
      );
    }

    const { coverRequestTimeoutMin } = await this.settings.get();
    const permanent = (
      await this.assignments.find({
        where: { routeId: route.id, status: 'ACTIVE' },
      })
    ).find((a) => a.type === 'PERMANENT' && windowIncludes(a, date));

    const saved = await this.assignments.save(
      this.assignments.create({
        routeId: route.id,
        agentId: input.agentId,
        type: 'COVER',
        status: 'PENDING',
        validFrom: date,
        validTo: date,
        createdBy: actor.name,
        acceptedAt: null,
        respondedAt: null,
        expiresAt: new Date(now.getTime() + coverRequestTimeoutMin * 60_000),
        reason: input.reason ?? null,
        coversAssignmentId: permanent?.id ?? null,
        stopScope: null,
      }),
    );

    const stops = await this.load.stopCounts(route.id, date);
    const summary = coverSummary(
      route.name ?? `Route ${route.id}`,
      stops.total,
      eligible.coverExpectedKg,
    );
    await this.notifier.notifyAgent(input.agentId, {
      type: 'cover_request',
      title: `Cover request: ${route.name ?? `Route ${route.id}`}`,
      body: summary,
      referenceId: saved.id,
      referenceType: 'route_assignments',
    });
    await this.audit.record(actor, {
      action: 'Sent route cover request',
      module: 'Dispatch',
      record: `${route.name ?? `Route ${route.id}`} → ${target.name}`,
      details: `${summary}${eligible.overCeiling ? ' (over the agent’s recent daily ceiling)' : ''}`,
    });
    return toPublicAssignment(saved);
  }

  /* ── Reassignment ──────────────────────────────────────────────── */

  /**
   * "Today only" → an immediately-active COVER; "From now on" → ends the open PERMANENT
   * and starts a new one. Blocked once the route has started collecting today. Unlike an
   * absence cover, an officer's reassignment is an instruction, not a request — it takes
   * effect at once and the agent is notified (`route_reassigned`).
   */
  async reassign(
    routeId: number,
    input: { agentId: number; scope: 'today' | 'permanent' },
    actor: DispatchActor,
    now: Date = new Date(),
  ): Promise<PublicAssignment> {
    const route = await this.requireRoute(routeId);
    const target = await this.requireAgent(input.agentId);
    const date = localDate(now);
    const routeLabel = route.name ?? `Route ${route.id}`;

    if (await this.load.hasCollectionStarted(route.id, date)) {
      throw new ConflictException(
        `${routeLabel} has already started collecting today — reassigning it mid-route would orphan the stops already done. Try again tomorrow, or arrange a cover for the remaining stops.`,
      );
    }
    if (!target.isAvailable) {
      throw new ConflictException(
        `${target.name} is not available for assignments.`,
      );
    }
    const day = await this.dayStatus.findOne({
      where: { agentId: target.agentId, day: date },
    });
    if (day?.status === 'ABSENT') {
      throw new ConflictException(`${target.name} is marked absent today.`);
    }

    const rows = await this.assignments.find({ where: { routeId: route.id } });
    const live = rows.filter(
      (a) =>
        (a.status === 'ACTIVE' || a.status === 'PENDING') &&
        windowIncludes(a, date),
    );
    const currentPermanent = live.find(
      (a) => a.type === 'PERMANENT' && a.status === 'ACTIVE',
    );

    if (input.scope === 'today') {
      const current = await this.resolver.getAgentForRoute(route.id, date);
      if (current?.agentId === target.agentId) {
        throw new ConflictException(
          `${target.name} already handles ${routeLabel} today.`,
        );
      }
      // one cover per agent per day
      const others = await this.assignments.find({
        where: { agentId: target.agentId },
      });
      if (
        others.some(
          (a) =>
            a.type === 'COVER' &&
            (a.status === 'ACTIVE' || a.status === 'PENDING') &&
            windowIncludes(a, date),
        )
      ) {
        throw new ConflictException(
          `${target.name} already covers a route today (one cover per day).`,
        );
      }
      for (const c of live.filter((a) => a.type === 'COVER')) {
        c.status = 'CANCELLED';
        c.respondedAt = now;
        c.reason = `${c.reason ? `${c.reason} · ` : ''}Replaced by an officer reassignment`;
        await this.assignments.save(c);
      }
      const saved = await this.assignments.save(
        this.assignments.create({
          routeId: route.id,
          agentId: target.agentId,
          type: 'COVER',
          status: 'ACTIVE',
          validFrom: date,
          validTo: date,
          createdBy: actor.name,
          acceptedAt: now,
          respondedAt: now,
          expiresAt: null,
          reason: 'Reassigned for today only',
          coversAssignmentId: currentPermanent?.id ?? null,
          stopScope: null,
        }),
      );
      await this.notifier.notifyAgent(target.agentId, {
        type: 'route_reassigned',
        title: `${routeLabel} is yours today`,
        body: `${actor.name} assigned you ${routeLabel} for today.`,
        referenceId: saved.id,
        referenceType: 'route_assignments',
      });
      await this.audit.record(actor, {
        action: 'Reassigned route (today only)',
        module: 'Dispatch',
        record: `${routeLabel} → ${target.name}`,
      });
      return toPublicAssignment(saved);
    }

    // scope === 'permanent'
    if (currentPermanent?.agentId === target.agentId) {
      throw new ConflictException(`${target.name} already owns ${routeLabel}.`);
    }
    const targetOwns = (
      await this.assignments.find({
        where: { agentId: target.agentId, status: 'ACTIVE' },
      })
    ).find(
      (a) =>
        a.type === 'PERMANENT' && a.validTo === null && a.routeId !== route.id,
    );
    if (targetOwns) {
      throw new ConflictException(
        `${target.name} already owns another route permanently — reassign that route first.`,
      );
    }

    if (currentPermanent) {
      if (currentPermanent.validFrom >= date) {
        currentPermanent.status = 'CANCELLED';
      } else {
        currentPermanent.validTo = addDays(date, -1);
      }
      currentPermanent.respondedAt = now;
      await this.assignments.save(currentPermanent);
    }
    // covers that were standing in for the old owner no longer apply
    for (const c of live.filter((a) => a.type === 'COVER')) {
      c.status = 'CANCELLED';
      c.respondedAt = now;
      c.reason = `${c.reason ? `${c.reason} · ` : ''}Route permanently reassigned`;
      await this.assignments.save(c);
    }
    const saved = await this.assignments.save(
      this.assignments.create({
        routeId: route.id,
        agentId: target.agentId,
        type: 'PERMANENT',
        status: 'ACTIVE',
        validFrom: date,
        validTo: null,
        createdBy: actor.name,
        acceptedAt: now,
        respondedAt: now,
        expiresAt: null,
        reason: 'Permanent reassignment',
        coversAssignmentId: null,
        stopScope: null,
      }),
    );
    await this.notifier.notifyAgent(target.agentId, {
      type: 'route_reassigned',
      title: `You now own ${routeLabel}`,
      body: `${actor.name} assigned ${routeLabel} to you from now on.`,
      referenceId: saved.id,
      referenceType: 'route_assignments',
    });
    if (currentPermanent) {
      await this.notifier.notifyAgent(currentPermanent.agentId, {
        type: 'route_reassigned',
        title: `${routeLabel} reassigned`,
        body: `${routeLabel} is no longer yours — it now belongs to ${target.name}.`,
        referenceId: saved.id,
        referenceType: 'route_assignments',
      });
    }
    await this.audit.record(actor, {
      action: 'Reassigned route (permanent)',
      module: 'Dispatch',
      record: `${routeLabel} → ${target.name}`,
    });
    return toPublicAssignment(saved);
  }

  /** Who handles a route on a date — powers COL-02's "Today's agent: <name> (covering)". */
  async agentForRoute(
    routeId: number,
    date: string,
  ): Promise<{ agentId: number; name: string; covering: boolean } | null> {
    const res = await this.resolver.getAgentForRoute(routeId, date);
    if (!res) return null;
    const name = (await this.directory.names()).get(res.agentId) ?? 'Unknown';
    return { agentId: res.agentId, name, covering: res.covering };
  }

  /**
   * COL-02 estate-first form: the picked estate's route (read-only, never chosen by the
   * user) and who handles it on `date` — with `covering` when a cover is active.
   */
  async routeAgentForEstate(
    estateId: number,
    date: string,
  ): Promise<{
    estateId: number;
    estateName: string;
    selfDelivery: boolean;
    routeId: number | null;
    routeName: string | null;
    agent: { agentId: number; name: string; covering: boolean } | null;
  }> {
    const estate = await this.estates.findOne({ where: { id: estateId } });
    if (!estate) throw new NotFoundException(`No estate ${estateId}.`);
    const base = {
      estateId: estate.id,
      estateName: estate.name,
      selfDelivery: estate.selfDelivery,
      routeId: estate.routeId,
      routeName: estate.routeName,
    };
    if (estate.routeId === null || estate.selfDelivery) {
      return { ...base, agent: null };
    }
    return { ...base, agent: await this.agentForRoute(estate.routeId, date) };
  }

  /* ── internals ─────────────────────────────────────────────────── */

  private async requireRoute(routeId: number): Promise<RouteEntity> {
    const route = await this.routes.findOne({ where: { id: routeId } });
    if (!route) throw new NotFoundException(`No route ${routeId}.`);
    return route;
  }

  private async requireAgent(agentId: number): Promise<AgentInfo> {
    const agent = await this.directory.byId(agentId);
    if (!agent) throw new NotFoundException(`No collection agent ${agentId}.`);
    return agent;
  }

  async upsertDay(
    agentId: number,
    day: string,
    patch: Partial<AgentDayStatusEntity>,
  ): Promise<AgentDayStatusEntity> {
    const existing = await this.dayStatus.findOne({ where: { agentId, day } });
    const row =
      existing ??
      this.dayStatus.create({
        agentId,
        day,
        status: 'AVAILABLE',
        source: null,
        reason: null,
        markedBy: null,
        shiftStartedAt: null,
        shiftEndedAt: null,
      });
    Object.assign(row, patch);
    return this.dayStatus.save(row);
  }
}

/** "Route 7, 14 stops, ~380 kg expected" */
export function coverSummary(
  routeName: string,
  stops: number,
  expectedKg: number,
): string {
  const kg =
    expectedKg > 0
      ? `~${Math.round(expectedKg)} kg expected`
      : 'no recent load history';
  return `${routeName}, ${stops} stop${stops === 1 ? '' : 's'}, ${kg}`;
}

export { round1 };
