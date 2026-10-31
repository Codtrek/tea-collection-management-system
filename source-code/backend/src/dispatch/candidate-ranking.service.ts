import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RouteEntity } from '../estates/route.entity';
import { AgentDayStatusEntity } from './agent-day-status.entity';
import { AgentDirectoryService } from './agent-directory.service';
import { type PublicCandidate, windowIncludes } from './dispatch-map';
import { RouteAssignmentEntity } from './route-assignment.entity';
import { RouteLoadService } from './route-load.service';
import { RouteNeighbourEntity } from './route-neighbour.entity';

/**
 * Proximity seam. Today proximity is the factory-configured neighbour list; route
 * geometry (e.g. distance between stop sets) can slot in later by providing a
 * different implementation — ranking only asks "are these two routes close?".
 */
export interface ProximityProvider {
  neighbours(routeId: number): Promise<Set<number>>;
}

/** Ranks cover candidates for an absent agent's route. It never assigns anyone. */
@Injectable()
export class CandidateRankingService implements ProximityProvider {
  constructor(
    @InjectRepository(RouteAssignmentEntity)
    private readonly assignments: Repository<RouteAssignmentEntity>,
    @InjectRepository(AgentDayStatusEntity)
    private readonly dayStatus: Repository<AgentDayStatusEntity>,
    @InjectRepository(RouteNeighbourEntity)
    private readonly neighbourRepo: Repository<RouteNeighbourEntity>,
    @InjectRepository(RouteEntity)
    private readonly routes: Repository<RouteEntity>,
    private readonly directory: AgentDirectoryService,
    private readonly load: RouteLoadService,
  ) {}

  /** Configured neighbour routes (the primary proximity signal). */
  async neighbours(routeId: number): Promise<Set<number>> {
    const rows = await this.neighbourRepo.find({ where: { routeId } });
    return new Set(rows.map((r) => r.neighbourRouteId));
  }

  /**
   * Eligible candidates for covering `routeId` on `date`, best first.
   * Excluded: absent / unavailable agents, agents who finished their shift, agents
   * already holding (or being asked to hold) a cover that day — the one-cover rule —
   * and the route's own agent. Over-ceiling is a warning flag, never an exclusion.
   * Order: not-yet-asked first, then neighbouring routes, then fewest remaining
   * stops, then lowest expected own load.
   */
  async rank(routeId: number, date: string): Promise<PublicCandidate[]> {
    const [agents, active, pending, allForRoute, dayRows, routeRows] =
      await Promise.all([
        this.directory.all(),
        this.assignments.find({ where: { status: 'ACTIVE' } }),
        this.assignments.find({ where: { status: 'PENDING' } }),
        this.assignments.find({ where: { routeId } }),
        this.dayStatus.find({ where: { day: date } }),
        this.routes.find(),
      ]);

    const neighbourIds = await this.neighbours(routeId);
    const dayByAgent = new Map(dayRows.map((d) => [d.agentId, d]));
    const routeName = new Map(
      routeRows.map((r) => [r.id, r.name ?? `Route ${r.id}`]),
    );

    const ownRoute = new Map<number, number>(); // agentId → own permanent route today
    for (const a of active) {
      if (a.type === 'PERMANENT' && windowIncludes(a, date)) {
        ownRoute.set(a.agentId, a.routeId);
      }
    }
    const holdsCover = new Set<number>();
    for (const a of [...active, ...pending]) {
      if (a.type === 'COVER' && windowIncludes(a, date)) {
        holdsCover.add(a.agentId);
      }
    }
    const targetOwner = [...ownRoute.entries()].find(
      ([, r]) => r === routeId,
    )?.[0];
    const asked = new Set(
      allForRoute
        .filter(
          (a) =>
            a.type === 'COVER' &&
            a.validFrom === date &&
            (a.status === 'DECLINED' || a.status === 'EXPIRED'),
        )
        .map((a) => a.agentId),
    );

    const coverExpectedKg = await this.load.expectedRouteKg(routeId, date);
    const out: PublicCandidate[] = [];

    for (const agent of agents) {
      const day = dayByAgent.get(agent.agentId);
      if (!agent.isAvailable) continue;
      if (day?.status === 'ABSENT') continue;
      if (day?.shiftEndedAt) continue;
      if (holdsCover.has(agent.agentId)) continue;
      if (agent.agentId === targetOwner) continue;

      const own = ownRoute.get(agent.agentId) ?? null;
      const [stops, ownExpectedKg, ceilingKg] = await Promise.all([
        own ? this.load.stopCounts(own, date) : { remaining: 0 },
        own ? this.load.expectedRouteKg(own, date) : 0,
        this.load.agentDailyCeiling(agent.agentId, date),
      ]);

      out.push({
        agentId: agent.agentId,
        name: agent.name,
        ownRouteId: own,
        ownRouteName: own ? (routeName.get(own) ?? null) : null,
        neighbour: own !== null && neighbourIds.has(own),
        remainingStops: stops.remaining,
        ownExpectedKg,
        coverExpectedKg,
        ceilingKg,
        overCeiling:
          ceilingKg > 0 && ownExpectedKg + coverExpectedKg > ceilingKg,
        previouslyAsked: asked.has(agent.agentId),
      });
    }

    return out.sort(
      (a, b) =>
        Number(a.previouslyAsked) - Number(b.previouslyAsked) ||
        Number(b.neighbour) - Number(a.neighbour) ||
        a.remainingStops - b.remainingStops ||
        a.ownExpectedKg - b.ownExpectedKg ||
        a.agentId - b.agentId,
    );
  }
}
