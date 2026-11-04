import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { formatEmployeeId } from '../employees/employee-map';
import { EmployeeEntity } from '../employees/employee.entity';
import { AGENT_JOB_ROLE } from '../employees/employee-roles';
import { User } from '../users/user.entity';
import { CollectionAgentEntity } from './collection-agent.entity';

export interface AgentInfo {
  /** collection_agents.id — what route assignments, pings and day status are keyed on */
  agentId: number;
  /** 'EMP-0012' — the HR record this agent is (deep-link target for their history) */
  employeeId: string;
  hrEmployeeId: number;
  userId: number;
  name: string;
  factoryId: number;
  isAvailable: boolean;
}

/**
 * Who is a collection agent. Driven by EMPLOYEES: an agent is an Active employee whose job
 * title is the agent role (AGENT_JOB_ROLE) and who is linked to a dispatch identity. Suspended
 * or Inactive employees, and anyone whose role changed, drop off the board and can no longer
 * use the agent API — no separate agent list to keep in sync.
 */
@Injectable()
export class AgentDirectoryService {
  constructor(
    @InjectRepository(CollectionAgentEntity)
    private readonly agentRepo: Repository<CollectionAgentEntity>,
    @InjectRepository(EmployeeEntity)
    private readonly employeeRepo: Repository<EmployeeEntity>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async all(): Promise<AgentInfo[]> {
    const [agents, employees] = await Promise.all([
      this.agentRepo.find(),
      this.employeeRepo.find(),
    ]);
    const byId = new Map(employees.map((e) => [e.id, e]));
    const out: AgentInfo[] = [];
    for (const a of agents) {
      const e = a.hrEmployeeId !== null ? byId.get(a.hrEmployeeId) : undefined;
      if (!e || e.status !== 'Active' || e.role !== AGENT_JOB_ROLE) continue;
      if (e.userId === null) continue; // no login provisioned yet — can't be dispatched
      out.push({
        agentId: a.id,
        employeeId: formatEmployeeId(e.id),
        hrEmployeeId: e.id,
        userId: e.userId,
        name: e.name,
        factoryId: a.factoryId,
        isAvailable: a.isAvailable,
      });
    }
    return out.sort((a, b) => a.agentId - b.agentId);
  }

  async byId(agentId: number): Promise<AgentInfo | null> {
    return (await this.all()).find((a) => a.agentId === agentId) ?? null;
  }

  async byUserId(userId: number): Promise<AgentInfo | null> {
    return (await this.all()).find((a) => a.userId === userId) ?? null;
  }

  async names(): Promise<Map<number, string>> {
    return new Map((await this.all()).map((a) => [a.agentId, a.name]));
  }

  /** Login state the agent API enforces on every call (a suspended login or a still-temporary password). */
  async credentials(userId: number): Promise<{
    status: 'active' | 'suspended';
    mustChangePassword: boolean;
  } | null> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    return user
      ? { status: user.status, mustChangePassword: user.must_change_password }
      : null;
  }
}
