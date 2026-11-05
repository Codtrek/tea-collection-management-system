import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { DataSource } from 'typeorm';
import { EmployeeEntity } from '../employees/employee.entity';
import { Factory } from '../users/factory.entity';
import { User } from '../users/user.entity';
import { AgentProvisioningService } from './agent-provisioning.service';
import { CollectionAgentEntity } from './collection-agent.entity';
import { RouteAssignmentEntity } from './route-assignment.entity';
import { FakeRepository } from './testing/fake-repository';
import { NOW, TODAY } from './testing/harness';

/** A DataSource whose transaction() runs straight through over in-memory repositories. */
function setup() {
  const users = new FakeRepository<User>();
  const agents = new FakeRepository<CollectionAgentEntity>();
  const employees = new FakeRepository<EmployeeEntity>();
  const assignments = new FakeRepository<RouteAssignmentEntity>();
  const factories = new FakeRepository<Factory>();
  factories.seed({ id: 1, name: 'Harboost', location: 'NE' });
  const inserted: unknown[][] = [];

  // User.update isn't part of FakeRepository — add the bit provisioning needs
  const userRepo = Object.assign(users, {
    update: ({ id }: { id: number }, patch: Partial<User>) => {
      Object.assign(users.rows.find((u) => u.id === id)!, patch);
      return Promise.resolve();
    },
  });

  const repos = new Map<unknown, unknown>([
    [User, userRepo],
    [CollectionAgentEntity, agents],
    [EmployeeEntity, employees],
    [RouteAssignmentEntity, assignments],
    [
      Factory,
      Object.assign(factories, { find: () => Promise.resolve(factories.rows) }),
    ],
  ]);
  const manager = {
    getRepository: (e: unknown) => repos.get(e),
    query: (_sql: string, params: unknown[]) => {
      inserted.push(params);
      return Promise.resolve([{ id: 500 }]);
    },
  };
  const ds = {
    transaction: (fn: (m: typeof manager) => unknown) =>
      Promise.resolve(fn(manager)),
    getRepository: (e: unknown) => repos.get(e),
  } as unknown as DataSource;
  return {
    svc: new AgentProvisioningService(ds),
    users: userRepo,
    agents,
    employees,
    assignments,
    inserted,
  };
}

const employee = (o: Partial<EmployeeEntity> = {}) =>
  ({
    id: 20,
    userId: null,
    name: 'P. Fernando',
    nic: '199312345706',
    contact: '0777000016',
    role: 'Tea Collecting Agent',
    status: 'Active',
    hasLogin: false,
    ...o,
  }) as EmployeeEntity;

describe('AgentProvisioningService.provision — registering an agent', () => {
  it('creates login + dispatch identity together and returns a one-time password that works', async () => {
    const { svc, users, agents, employees, inserted } = setup();
    const emp = employee();
    const { initialPassword } = await svc.provision(emp);

    expect(initialPassword).toMatch(/^[\w-]{12}$/);
    const user = users.rows[0];
    expect(user).toMatchObject({
      phone: '0777000016',
      role: 'collection_agent',
      must_change_password: true,
    });
    expect(user.password_hash).not.toContain(initialPassword!); // never stored in plain text
    expect(await bcrypt.compare(initialPassword!, user.password_hash)).toBe(
      true,
    );
    expect(inserted[0]).toEqual([user.id, 1, 'P. Fernando', '199312345706']); // factory_employees row
    expect(agents.rows[0]).toMatchObject({
      employeeId: 500,
      hrEmployeeId: 20,
      isAvailable: true,
    });
    expect(emp).toMatchObject({ userId: user.id, hasLogin: true });
    expect(employees.rows).toContain(emp);
  });

  it('refuses a contact number that already belongs to a login (409) and creates nothing', async () => {
    const { svc, users, agents } = setup();
    users.seed({ id: 1, phone: '0777000016', role: 'estate_owner' } as User);
    await expect(svc.provision(employee())).rejects.toThrow(ConflictException);
    expect(agents.rows).toHaveLength(0);
    await expect(svc.assertContactFree('0777000016')).rejects.toThrow(
      ConflictException,
    );
    await expect(svc.assertContactFree('0777000099')).resolves.toBeUndefined();
  });

  it('re-enabling a former agent restores the SAME identity (history intact) with no new password', async () => {
    const { svc, users, agents } = setup();
    users.seed({
      id: 7,
      phone: '0777000016',
      role: 'collection_agent',
      status: 'suspended',
    } as User);
    agents.seed({
      id: 3,
      employeeId: 9,
      factoryId: 1,
      hrEmployeeId: 20,
      isAvailable: true,
    });
    const res = await svc.provision(employee({ userId: 7 }));
    expect(res.initialPassword).toBeNull();
    expect(users.rows[0].status).toBe('active');
    expect(agents.rows).toHaveLength(1);
  });
});

describe('AgentProvisioningService.deprovision — leaving dispatch', () => {
  function withAgent() {
    const ctx = setup();
    ctx.users.seed({
      id: 7,
      phone: '0777000016',
      role: 'collection_agent',
      status: 'active',
    } as User);
    ctx.agents.seed({
      id: 3,
      employeeId: 9,
      factoryId: 1,
      hrEmployeeId: 20,
      isAvailable: true,
    });
    return { ...ctx, emp: employee({ userId: 7 }) };
  }
  const row = (o: Partial<RouteAssignmentEntity>) =>
    ({
      routeId: 5,
      agentId: 3,
      type: 'PERMANENT',
      status: 'ACTIVE',
      validFrom: '2026-01-01',
      validTo: null,
      createdBy: 't',
      acceptedAt: null,
      respondedAt: null,
      expiresAt: null,
      reason: null,
      coversAssignmentId: null,
      stopScope: null,
      ...o,
    }) as RouteAssignmentEntity;

  it('ends the open permanent route (route becomes unassigned), keeps history, suspends the login', async () => {
    const { svc, users, assignments, emp } = withAgent();
    assignments.seed(row({}));
    const freed = await svc.deprovision(emp, NOW);
    expect(freed).toEqual([5]);
    expect(assignments.rows[0]).toMatchObject({
      status: 'ACTIVE',
      validTo: '2026-10-08',
    }); // ended yesterday
    expect(users.rows[0].status).toBe('suspended');
  });

  it('cancels a permanent route that only started today, and cancels live covers', async () => {
    const { svc, assignments, emp } = withAgent();
    assignments.seed(row({ validFrom: TODAY }));
    assignments.seed(
      row({
        routeId: 6,
        type: 'COVER',
        status: 'PENDING',
        validFrom: TODAY,
        validTo: TODAY,
      }),
    );
    await svc.deprovision(emp, NOW);
    expect(assignments.rows[0].status).toBe('CANCELLED');
    expect(assignments.rows[1].status).toBe('CANCELLED');
  });

  it('leaves other agents’ assignments alone, and is a no-op for someone who was never an agent', async () => {
    const { svc, assignments, emp } = withAgent();
    assignments.seed(row({ agentId: 99, routeId: 8 }));
    await svc.deprovision(emp, NOW);
    expect(assignments.rows[0].status).toBe('ACTIVE');
    expect(await svc.deprovision(employee({ id: 777 }), NOW)).toEqual([]);
  });
});
