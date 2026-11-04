import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { toAppStatus, weightSummary } from '../collections/collection-map';
import { CollectionRecordEntity } from '../collections/collection-record.entity';
import type { PaginatedResult } from '../estates/estate-lifetime-map';
import { CollectionAgentEntity } from './collection-agent.entity';
import {
  localDate,
  windowIncludes,
  type PublicAgentHistoryRow,
} from './dispatch-map';
import { RouteAssignmentEntity } from './route-assignment.entity';

export interface HistoryQuery {
  from?: string;
  to?: string;
  /** 0-based, like the Estate Owner tabs */
  page?: number;
  limit?: number;
}

const DELIVERED = new Set(['collected', 'confirmed']);

/**
 * An agent's collection history for the Employee detail page. Same paging contract as the
 * Estate Owner tabs: server-side, default window the last 90 days, 25 per page. Records are
 * matched through the agent's dispatch identity; a record on a route that is not the agent's
 * own, collected under an accepted cover, carries `coveringRoute`.
 */
@Injectable()
export class AgentHistoryService {
  constructor(
    @InjectRepository(CollectionAgentEntity)
    private readonly agents: Repository<CollectionAgentEntity>,
    @InjectRepository(CollectionRecordEntity)
    private readonly records: Repository<CollectionRecordEntity>,
    @InjectRepository(RouteAssignmentEntity)
    private readonly assignments: Repository<RouteAssignmentEntity>,
  ) {}

  async history(
    hrEmployeeId: number,
    q: HistoryQuery,
    now: Date = new Date(),
  ): Promise<PaginatedResult<PublicAgentHistoryRow>> {
    const page = Math.max(0, q.page ?? 0);
    const limit = Math.min(100, Math.max(1, q.limit ?? 25));
    const empty = { rows: [], page, limit, total: 0, hasMore: false };

    // Not a collection agent (or never linked): nothing to show — not an error.
    const agent = await this.agents.findOne({ where: { hrEmployeeId } });
    if (!agent) return empty;

    // default window: last 90 days unless an explicit range is given
    const ninetyAgo = new Date(now.getTime() - 90 * 86_400_000);
    const from = q.from ?? (q.to ? undefined : localDate(ninetyAgo));

    const [mine, covers] = await Promise.all([
      this.records.find({ where: { agentId: agent.id } }),
      this.assignments.find({ where: { agentId: agent.id, type: 'COVER' } }),
    ]);
    // a cover only counts if the agent actually accepted it (it may have been cancelled later)
    const accepted = covers.filter((c) => c.acceptedAt !== null);

    const filtered = mine
      .filter(
        (r) =>
          DELIVERED.has(r.status) &&
          (!from || r.collectionDate >= from) &&
          (!q.to || r.collectionDate <= q.to),
      )
      .sort((a, b) => b.collectionDate.localeCompare(a.collectionDate));

    const start = page * limit;
    const rows = filtered
      .slice(start, start + limit)
      .map((r): PublicAgentHistoryRow => {
        const cover = accepted.find(
          (c) => c.routeId === r.routeId && windowIncludes(c, r.collectionDate),
        );
        return {
          id: r.id,
          date: r.collectionDate,
          route: r.routeName,
          coveringRoute: cover ? r.routeName : null,
          estateName: r.estateName,
          status: toAppStatus(r.status),
          ...weightSummary(r),
        };
      });

    return {
      rows,
      page,
      limit,
      total: filtered.length,
      hasMore: start + limit < filtered.length,
    };
  }
}
