import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { HistoryQuery } from '../dispatch/agent-history.service';
import { CollectionAgentEntity } from '../dispatch/collection-agent.entity';
import { localDate, windowIncludes } from '../dispatch/dispatch-map';
import { RouteAssignmentEntity } from '../dispatch/route-assignment.entity';
import type { PaginatedResult } from '../estates/estate-lifetime-map';
import { EstateEntity } from '../estates/estate.entity';
import { RouteEntity } from '../estates/route.entity';
import { FertilizerDeliveryEntity } from './fertilizer-delivery.entity';
import {
  FAIL_REASON_LABEL,
  formatRequestId,
  type AgentDeliveryOutcome,
  type PublicAgentFertilizerRow,
} from './fertilizer-map';
import { FertilizerRequestEntity } from './fertilizer-request.entity';

const OUTCOME_LABEL: Record<
  NonNullable<FertilizerDeliveryEntity['outcome']>,
  AgentDeliveryOutcome
> = {
  delivered: 'Delivered',
  partial: 'Partially delivered',
  failed: 'Failed',
};

/**
 * The fertilizer an agent took out, for the Employee detail page's "Fertilizer deliveries" tab —
 * beside the Collections tab, with the same paging contract (server-side, default window the
 * last 90 days, 25 per page). A row is a finished attempt the agent was handed: delivered,
 * partly delivered or failed. Attempts still with him, or never handed over, aren't history yet.
 */
@Injectable()
export class AgentFertilizerHistoryService {
  constructor(
    @InjectRepository(CollectionAgentEntity)
    private readonly agents: Repository<CollectionAgentEntity>,
    @InjectRepository(FertilizerDeliveryEntity)
    private readonly deliveries: Repository<FertilizerDeliveryEntity>,
    @InjectRepository(FertilizerRequestEntity)
    private readonly requests: Repository<FertilizerRequestEntity>,
    @InjectRepository(EstateEntity)
    private readonly estates: Repository<EstateEntity>,
    @InjectRepository(RouteEntity)
    private readonly routes: Repository<RouteEntity>,
    @InjectRepository(RouteAssignmentEntity)
    private readonly assignments: Repository<RouteAssignmentEntity>,
  ) {}

  async history(
    hrEmployeeId: number,
    q: HistoryQuery,
    now: Date = new Date(),
  ): Promise<PaginatedResult<PublicAgentFertilizerRow>> {
    const page = Math.max(0, q.page ?? 0);
    const limit = Math.min(100, Math.max(1, q.limit ?? 25));
    const empty = { rows: [], page, limit, total: 0, hasMore: false };

    // Not a collection agent (or never linked): nothing to show — not an error.
    const agent = await this.agents.findOne({ where: { hrEmployeeId } });
    if (!agent) return empty;

    const ninetyAgo = new Date(now.getTime() - 90 * 86_400_000);
    const from = q.from ?? (q.to ? undefined : localDate(ninetyAgo));

    const [mine, covers] = await Promise.all([
      this.deliveries.find({ where: { pickupAgentId: agent.id } }),
      this.assignments.find({ where: { agentId: agent.id, type: 'COVER' } }),
    ]);
    // a cover only counts if the agent actually accepted it (it may have been cancelled later)
    const accepted = covers.filter((c) => c.acceptedAt !== null);

    const filtered = mine
      .filter(
        (d) =>
          d.outcome !== null &&
          d.cancelledAt === null &&
          (!from || d.scheduledDate >= from) &&
          (!q.to || d.scheduledDate <= q.to),
      )
      .sort(
        (a, b) => b.scheduledDate.localeCompare(a.scheduledDate) || b.id - a.id,
      );

    const start = page * limit;
    const rows: PublicAgentFertilizerRow[] = [];
    for (const d of filtered.slice(start, start + limit)) {
      const [request, estate, route] = await Promise.all([
        this.requests.findOne({ where: { id: d.requestId } }),
        this.estates.findOne({ where: { id: d.estateId } }),
        this.routes.findOne({ where: { id: d.routeId } }),
      ]);
      const routeName = route?.name ?? `Route ${d.routeId}`;
      const cover = accepted.find(
        (c) => c.routeId === d.routeId && windowIncludes(c, d.scheduledDate),
      );
      rows.push({
        deliveryId: d.id,
        date: d.scheduledDate,
        requestId: request
          ? formatRequestId(request.id, request.createdAt)
          : null,
        estateName: estate?.name ?? 'Unknown estate',
        route: routeName,
        coveringRoute: cover ? routeName : null,
        item: request?.item ?? '—',
        handedOverKg: d.handoverQtyKg !== null ? Number(d.handoverQtyKg) : null,
        deliveredKg: d.deliveredQtyKg !== null ? Number(d.deliveredQtyKg) : 0,
        outcome: OUTCOME_LABEL[d.outcome!],
        failReason: d.failReason ? FAIL_REASON_LABEL[d.failReason] : null,
        note: d.failNote ?? d.shortfallReason ?? null,
      });
    }

    return {
      rows,
      page,
      limit,
      total: filtered.length,
      hasMore: start + limit < filtered.length,
    };
  }
}
