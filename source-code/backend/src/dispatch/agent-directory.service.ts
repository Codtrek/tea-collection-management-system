import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FactoryEmployee } from '../users/factory-employee.entity';
import { CollectionAgentEntity } from './collection-agent.entity';

export interface AgentInfo {
  agentId: number;
  employeeId: number;
  userId: number;
  name: string;
  factoryId: number;
  isAvailable: boolean;
}

/** agent id ↔ name / login user. The agent's identity lives on factory_employees. */
@Injectable()
export class AgentDirectoryService {
  constructor(
    @InjectRepository(CollectionAgentEntity)
    private readonly agentRepo: Repository<CollectionAgentEntity>,
    @InjectRepository(FactoryEmployee)
    private readonly employeeRepo: Repository<FactoryEmployee>,
  ) {}

  async all(): Promise<AgentInfo[]> {
    const [agents, employees] = await Promise.all([
      this.agentRepo.find(),
      this.employeeRepo.find(),
    ]);
    const byId = new Map(employees.map((e) => [e.id, e]));
    return agents
      .map((a) => {
        const e = byId.get(a.employeeId);
        return {
          agentId: a.id,
          employeeId: a.employeeId,
          userId: e?.user_id ?? 0,
          name: e?.name ?? `Agent ${a.id}`,
          factoryId: a.factoryId,
          isAvailable: a.isAvailable,
        };
      })
      .sort((a, b) => a.agentId - b.agentId);
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
}
