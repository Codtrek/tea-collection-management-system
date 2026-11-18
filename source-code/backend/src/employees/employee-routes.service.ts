import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { localDate } from '../dispatch/dispatch-map';
import { AgentDirectoryService } from '../dispatch/agent-directory.service';
import { RouteResolverService } from '../dispatch/route-resolver.service';
import { RouteEntity } from '../estates/route.entity';

export interface RouteRef {
  id: number;
  name: string;
}

/**
 * Which routes each Tea Collecting Agent is responsible for today — for the "route" filter on
 * Salary Advances and Payroll. Reads RouteResolverService (the one place route responsibility
 * is decided), so a cover or a reassignment shows up here too.
 */
@Injectable()
export class EmployeeRoutesService {
  constructor(
    private readonly agents: AgentDirectoryService,
    private readonly resolver: RouteResolverService,
    @InjectRepository(RouteEntity)
    private readonly routeRepo: Repository<RouteEntity>,
  ) {}

  /** every route, by name — the filter's options */
  async routes(): Promise<RouteRef[]> {
    return (await this.routeRepo.find())
      .map((r) => ({ id: r.id, name: r.name ?? `Route ${r.id}` }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /** HR employee id → the routes they're responsible for today */
  async routesByEmployee(
    now: Date = new Date(),
  ): Promise<Map<number, RouteRef[]>> {
    const [routes, agents] = await Promise.all([
      this.routes(),
      this.agents.all(),
    ]);
    const responsible = await this.resolver.getAgentsForRoutes(
      routes.map((r) => r.id),
      localDate(now),
    );
    const byAgent = new Map(agents.map((a) => [a.agentId, a.hrEmployeeId]));
    const out = new Map<number, RouteRef[]>();
    for (const r of routes) {
      const agentId = responsible.get(r.id)?.agentId;
      const employeeId =
        agentId !== undefined ? byAgent.get(agentId) : undefined;
      if (employeeId === undefined) continue;
      out.set(employeeId, [...(out.get(employeeId) ?? []), r]);
    }
    return out;
  }
}
