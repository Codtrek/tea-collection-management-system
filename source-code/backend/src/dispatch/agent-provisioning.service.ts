import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { DataSource } from 'typeorm';
import { EmployeeEntity } from '../employees/employee.entity';
import { Factory } from '../users/factory.entity';
import { User } from '../users/user.entity';
import { CollectionAgentEntity } from './collection-agent.entity';
import { localDate } from './dispatch-map';
import { RouteAssignmentEntity } from './route-assignment.entity';

/**
 * Turns an Employee into (or out of) a dispatchable collection agent. Registration creates
 * the mobile login in ONE transaction — users → factory_employees → collection_agents →
 * employees.user_id — so a half-provisioned agent can never exist.
 */
@Injectable()
export class AgentProvisioningService {
  constructor(private readonly dataSource: DataSource) {}

  /** The contact number becomes the agent's mobile sign-in; it must not already belong to a login. */
  async assertContactFree(
    contact: string,
    exceptUserId?: number | null,
  ): Promise<void> {
    const clash = await this.dataSource
      .getRepository(User)
      .findOne({ where: { phone: contact } });
    if (clash && clash.id !== exceptUserId) {
      throw new ConflictException(
        `The contact number ${contact} already has a login. Use a different number for this agent.`,
      );
    }
  }

  /**
   * Creates (or re-enables) the agent's dispatch identity + mobile login.
   * Returns the one-time temporary password, or null when an existing login was simply re-enabled.
   */
  async provision(
    employee: EmployeeEntity,
  ): Promise<{ initialPassword: string | null }> {
    return this.dataSource.transaction(async (m) => {
      const existing = await m
        .getRepository(CollectionAgentEntity)
        .findOne({ where: { hrEmployeeId: employee.id } });

      if (existing) {
        // Returning to the agent role: bring the same identity (and history) back.
        if (employee.userId !== null) {
          await m
            .getRepository(User)
            .update({ id: employee.userId }, { status: 'active' });
        }
        return { initialPassword: null };
      }

      await this.assertContactFreeIn(m, employee.contact ?? '');
      const factory = await m
        .getRepository(Factory)
        .find({ take: 1, order: { id: 'ASC' } });
      if (!factory[0]) throw new ConflictException('No factory is set up yet.');

      const initialPassword = randomBytes(9).toString('base64url');
      const user = await m.getRepository(User).save(
        m.getRepository(User).create({
          phone: employee.contact ?? '',
          password_hash: await bcrypt.hash(initialPassword, 10),
          role: 'collection_agent',
          status: 'active',
          must_change_password: true,
        }),
      );
      // factory_employees carries columns (nic, role) the lightweight entity doesn't map.
      const fe = await m.query<{ id: number }[]>(
        `INSERT INTO factory_employees (user_id, factory_id, name, nic, role)
         VALUES ($1, $2, $3, $4, 'collection_agent') RETURNING id`,
        [user.id, factory[0].id, employee.name, employee.nic],
      );
      await m.getRepository(CollectionAgentEntity).save(
        m.getRepository(CollectionAgentEntity).create({
          employeeId: fe[0].id,
          factoryId: factory[0].id,
          hrEmployeeId: employee.id,
          isAvailable: true,
        }),
      );
      employee.userId = user.id;
      employee.hasLogin = true;
      await m.getRepository(EmployeeEntity).save(employee);
      return { initialPassword };
    });
  }

  /**
   * The employee is no longer an active agent (deactivated, or role changed away). Their open
   * permanent route ends — the route shows "Unassigned" until an officer reassigns it — their
   * covers are cancelled, and the mobile login is suspended. History is kept untouched.
   * Returns the names of route ids freed.
   */
  async deprovision(
    employee: EmployeeEntity,
    now: Date = new Date(),
  ): Promise<number[]> {
    return this.dataSource.transaction(async (m) => {
      const agent = await m
        .getRepository(CollectionAgentEntity)
        .findOne({ where: { hrEmployeeId: employee.id } });
      if (!agent) return [];

      const today = localDate(now);
      const yesterday = new Date(`${today}T00:00:00Z`);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const rows = await m
        .getRepository(RouteAssignmentEntity)
        .find({ where: { agentId: agent.id } });
      const freed: number[] = [];
      for (const a of rows) {
        const live = a.status === 'ACTIVE' || a.status === 'PENDING';
        if (
          a.type === 'PERMANENT' &&
          a.status === 'ACTIVE' &&
          a.validTo === null
        ) {
          if (a.validFrom >= today) a.status = 'CANCELLED';
          else a.validTo = yesterday.toISOString().slice(0, 10);
          a.respondedAt = now;
          freed.push(a.routeId);
          await m.getRepository(RouteAssignmentEntity).save(a);
        } else if (
          a.type === 'COVER' &&
          live &&
          a.validTo !== null &&
          a.validTo >= today
        ) {
          a.status = 'CANCELLED';
          a.respondedAt = now;
          a.reason = `${a.reason ? `${a.reason} · ` : ''}Agent is no longer active`;
          await m.getRepository(RouteAssignmentEntity).save(a);
        }
      }
      if (employee.userId !== null) {
        await m
          .getRepository(User)
          .update({ id: employee.userId }, { status: 'suspended' });
      }
      return freed;
    });
  }

  /** The agent's contact number is their sign-in — keep `users.phone` in step with the HR record. */
  async syncContact(employee: EmployeeEntity): Promise<void> {
    if (employee.userId === null || !employee.contact) return;
    const users = this.dataSource.getRepository(User);
    const user = await users.findOne({ where: { id: employee.userId } });
    if (!user || user.phone === employee.contact) return;
    await this.assertContactFree(employee.contact, user.id);
    await users.update({ id: user.id }, { phone: employee.contact });
  }

  private async assertContactFreeIn(
    m: import('typeorm').EntityManager,
    contact: string,
  ): Promise<void> {
    const clash = await m
      .getRepository(User)
      .findOne({ where: { phone: contact } });
    if (clash) {
      throw new ConflictException(
        `The contact number ${contact} already has a login. Use a different number for this agent.`,
      );
    }
  }
}
