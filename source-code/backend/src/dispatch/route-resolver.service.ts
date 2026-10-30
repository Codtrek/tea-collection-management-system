import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { windowIncludes } from './dispatch-map';
import {
  type AssignmentType,
  RouteAssignmentEntity,
} from './route-assignment.entity';

export interface ResolvedAgent {
  agentId: number;
  assignmentId: number;
  type: AssignmentType;
  /** true when a COVER (not the permanent owner) is responsible today */
  covering: boolean;
}

/**
 * THE one place that answers "who is responsible for route R on date D". Every
 * request-routing path (exception entry, collection agent display, mobile stops,
 * the dispatch board) goes through here, so reassigning a route or covering for an
 * absent agent only ever changes `route_assignments` rows:
 *   1. an ACTIVE COVER whose window includes the date wins;
 *   2. otherwise the ACTIVE PERMANENT whose window includes the date;
 *   3. otherwise nobody (null).
 * PENDING / DECLINED / EXPIRED / CANCELLED rows never resolve.
 */
@Injectable()
export class RouteResolverService {
  constructor(
    @InjectRepository(RouteAssignmentEntity)
    private readonly repo: Repository<RouteAssignmentEntity>,
  ) {}

  async getAgentForRoute(
    routeId: number,
    date: string,
  ): Promise<ResolvedAgent | null> {
    const rows = await this.repo.find({ where: { routeId, status: 'ACTIVE' } });
    return pickResponsible(rows, date);
  }

  /** Resolve many routes at once (one query) — used by lists and the board. */
  async getAgentsForRoutes(
    routeIds: number[],
    date: string,
  ): Promise<Map<number, ResolvedAgent | null>> {
    const rows = await this.repo.find({ where: { status: 'ACTIVE' } });
    const out = new Map<number, ResolvedAgent | null>();
    for (const routeId of routeIds) {
      out.set(
        routeId,
        pickResponsible(
          rows.filter((r) => r.routeId === routeId),
          date,
        ),
      );
    }
    return out;
  }

  /**
   * PENDING covers past `expiresAt` become EXPIRED. Called wherever pending covers are
   * listed or acted on, plus by the per-minute sweep — never needed for resolution
   * itself, since PENDING rows don't resolve.
   */
  async expireStale(now: Date = new Date()): Promise<RouteAssignmentEntity[]> {
    const pending = await this.repo.find({ where: { status: 'PENDING' } });
    const stale = pending.filter((p) => p.expiresAt && p.expiresAt < now);
    for (const p of stale) {
      p.status = 'EXPIRED';
      p.respondedAt = now;
      await this.repo.save(p);
    }
    return stale;
  }
}

/** Pure selection rule — exported for tests. */
export function pickResponsible(
  activeRows: Pick<
    RouteAssignmentEntity,
    'id' | 'agentId' | 'type' | 'validFrom' | 'validTo'
  >[],
  date: string,
): ResolvedAgent | null {
  const inWindow = activeRows.filter((r) => windowIncludes(r, date));
  // Latest-starting wins within a type (a replaced permanent is closed by valid_to,
  // but be defensive about overlapping rows).
  const latest = (type: AssignmentType) =>
    inWindow
      .filter((r) => r.type === type)
      .sort((a, b) => b.validFrom.localeCompare(a.validFrom) || b.id - a.id)[0];
  const cover = latest('COVER');
  if (cover) {
    return {
      agentId: cover.agentId,
      assignmentId: cover.id,
      type: 'COVER',
      covering: true,
    };
  }
  const permanent = latest('PERMANENT');
  if (permanent) {
    return {
      agentId: permanent.agentId,
      assignmentId: permanent.id,
      type: 'PERMANENT',
      covering: false,
    };
  }
  return null;
}
