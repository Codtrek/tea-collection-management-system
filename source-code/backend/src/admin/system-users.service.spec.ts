import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { Repository } from 'typeorm';
import type { AuditService } from '../audit/audit.service';
import { FakeManager, FakeRepo } from '../collections/testing/fake-repo';
import { EmployeeEntity } from '../employees/employee.entity';
import { AGENT_JOB_ROLE } from '../employees/employee-roles';
import { FactoryEmployee } from '../users/factory-employee.entity';
import { Factory } from '../users/factory.entity';
import { User } from '../users/user.entity';
import type { Actor } from './admin.service';
import { SystemUsersService } from './system-users.service';

const admin: Actor = { name: 'A. Bandara', role: 'Administrator', sub: 1 };

function user(p: Partial<User>): User {
  return {
    phone: '0770000000',
    name: 'X',
    password_hash: 'old-hash',
    role: 'factory_officer',
    status: 'active',
    must_change_password: false,
    last_login_at: null,
    created_at: new Date('2026-01-01'),
    nic: null,
    email: null,
    token_version: 0,
    failed_login_count: 0,
    locked_until: null,
    ...p,
  } as User;
}

function employee(p: Partial<EmployeeEntity>): EmployeeEntity {
  return {
    userId: null,
    name: 'Employee',
    nic: '199900000000',
    contact: '0779999999',
    role: 'Factory Officer',
    status: 'Active',
    hasLogin: false,
    ...p,
  } as EmployeeEntity;
}

function build() {
  const users = new FakeRepo<User>();
  const fes = new FakeRepo<FactoryEmployee>();
  const employees = new FakeRepo<EmployeeEntity>();
  const factories = new FakeRepo<Factory>();
  const m = new FakeManager();
  m.register(User, users as unknown as FakeRepo<object>);
  m.register(FactoryEmployee, fes as unknown as FakeRepo<object>);
  m.register(EmployeeEntity, employees as unknown as FakeRepo<object>);
  m.register(Factory, factories as unknown as FakeRepo<object>);
  factories.seed({ id: 1, name: 'Factory', location: null });

  users.seed(
    user({
      id: 1,
      name: 'A. Bandara',
      phone: '0771234567',
      role: 'factory_admin',
    }),
    user({
      id: 2,
      name: 'S. Fernando',
      phone: '0771234568',
      role: 'factory_officer',
    }),
    user({
      id: 3,
      name: 'R. Jayasuriya',
      phone: '0771234569',
      role: 'factory_manager',
    }),
    user({
      id: 9,
      name: 'Agent',
      phone: '0777000001',
      role: 'collection_agent',
    }),
  );
  fes.seed(
    {
      id: 1,
      user_id: 1,
      factory_id: 1,
      name: 'A. Bandara',
      nic: '198512345601',
      role: 'factory_admin',
    } as FactoryEmployee,
    {
      id: 2,
      user_id: 2,
      factory_id: 1,
      name: 'S. Fernando',
      nic: '199012345602',
      role: 'factory_officer',
    } as FactoryEmployee,
    {
      id: 3,
      user_id: 3,
      factory_id: 1,
      name: 'R. Jayasuriya',
      nic: '198812345603',
      role: 'factory_manager',
    } as FactoryEmployee,
  );
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const svc = new SystemUsersService(
    users as unknown as Repository<User>,
    fes as unknown as Repository<FactoryEmployee>,
    employees as unknown as Repository<EmployeeEntity>,
    audit as unknown as AuditService,
  );
  return { svc, users, fes, employees, audit };
}

const lastAudit = (audit: { record: jest.Mock }) =>
  (audit.record.mock.calls.at(-1) as [unknown, Record<string, unknown>])[1];

describe('SystemUsersService — list', () => {
  it('lists the three portal roles only (agents and estate users are elsewhere), with status and link', async () => {
    const { svc, users, employees } = build();
    users.rows.find((u) => u.id === 2)!.status = 'suspended';
    users.rows.find((u) => u.id === 3)!.locked_until = new Date(
      Date.now() + 60_000,
    );
    employees.seed(employee({ id: 50, userId: 3, name: 'R. Jayasuriya (HR)' }));
    const list = await svc.list(admin);
    expect(list.map((u) => u.id)).toEqual(['USR-0001', 'USR-0003', 'USR-0002']);
    const byId = Object.fromEntries(list.map((u) => [u.id, u]));
    expect(byId['USR-0002'].status).toBe('Inactive');
    expect(byId['USR-0003'].status).toBe('Locked');
    expect(byId['USR-0003'].linkedEmployee).toEqual({
      id: 50,
      name: 'R. Jayasuriya (HR)',
    });
    expect(byId['USR-0001'].linkedEmployee).toBeNull();
    expect(byId['USR-0001'].lastLogin).toBeNull();
  });

  it('own row: every status / role action is disabled with a reason', async () => {
    const { svc } = build();
    const me = (await svc.list(admin)).find((u) => u.isSelf)!;
    expect(me.id).toBe('USR-0001');
    expect(me.actions.deactivate).toMatch(/your own/);
    expect(me.actions.changeRole).toMatch(/your own role/);
    expect(me.actions.resetPassword).toMatch(/own password/);
    expect(me.actions.edit).toBeNull(); // name / phone are fine
  });
});

describe('SystemUsersService — safety rules (server-side)', () => {
  it('you can’t deactivate yourself or change your own role', async () => {
    const { svc } = build();
    await expect(
      svc.deactivate('USR-0001', undefined, admin),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      svc.update('USR-0001', { role: 'Manager' }, admin),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('the last active Administrator can’t be deactivated or demoted', async () => {
    const { svc, users } = build();
    // a second admin acts; target admin #1 is then the only other one
    users.seed(
      user({
        id: 4,
        name: 'Second',
        phone: '0771111111',
        role: 'factory_admin',
        status: 'suspended',
      }),
    );
    const other: Actor = { name: 'Second', role: 'Administrator', sub: 4 };
    // only one ACTIVE admin (id 1) → both refused, 409
    await expect(
      svc.deactivate('USR-0001', undefined, other),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      svc.update('USR-0001', { role: 'Officer' }, other),
    ).rejects.toBeInstanceOf(ConflictException);
    // with two active admins it is allowed
    users.rows.find((u) => u.id === 4)!.status = 'active';
    const res = await svc.update('USR-0001', { role: 'Manager' }, other);
    expect(res.role).toBe('Manager');
  });

  it('only an Administrator manages users or assigns the Administrator role', async () => {
    const { svc } = build();
    const manager: Actor = { name: 'R. Jayasuriya', role: 'Manager', sub: 3 };
    await expect(
      svc.update('USR-0002', { role: 'Administrator' }, manager),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      svc.deactivate('USR-0002', undefined, manager),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.eligibleEmployees(manager)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(
      svc.create({ employeeId: 1, role: 'Officer' }, manager),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('a role change or deactivation bumps the token version (the old token dies on its next request)', async () => {
    const { svc, users, fes, audit } = build();
    await svc.update(
      'USR-0002',
      { role: 'Manager', reason: 'Promoted' },
      admin,
    );
    const u = users.rows.find((x) => x.id === 2)!;
    expect(u.role).toBe('factory_manager');
    expect(fes.rows.find((x) => x.user_id === 2)!.role).toBe('factory_manager');
    expect(u.token_version).toBe(1);
    expect(lastAudit(audit)).toMatchObject({
      action: 'Changed user role',
      before: { role: 'Officer' },
      after: { role: 'Manager' },
      reason: 'Promoted',
    });
    await svc.deactivate('USR-0002', 'Left the factory', admin);
    expect(u.status).toBe('suspended');
    expect(u.token_version).toBe(2);
    expect(lastAudit(audit)).toMatchObject({
      action: 'Deactivated user',
      reason: 'Left the factory',
    });
    // a name edit alone does not sign the user out
    await svc.reactivate('USR-0002', admin);
    await svc.update('USR-0002', { name: 'S. Fernando-Perera' }, admin);
    expect(u.token_version).toBe(2);
    expect(u.status).toBe('active');
  });

  it('reactivate is refused for an active user; unknown ids are 404', async () => {
    const { svc } = build();
    await expect(svc.reactivate('USR-0002', admin)).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(
      svc.deactivate('USR-0009', undefined, admin),
    ).rejects.toBeInstanceOf(NotFoundException); // an agent
    await expect(
      svc.deactivate('USR-0404', undefined, admin),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('SystemUsersService — Add user (picks an HR employee)', () => {
  it('creates the login from the employee: hashed temporary password returned once, forced change, linked', async () => {
    const { svc, users, fes, employees, audit } = build();
    employees.seed(
      employee({
        id: 60,
        name: 'N. Perera',
        nic: '200012345678',
        contact: '0712345678',
      }),
    );
    const res = await svc.create(
      { employeeId: 60, role: 'Officer', email: 'NPerera@Example.com' },
      admin,
    );

    expect(res.temporaryPassword).toMatch(/^[A-Za-z0-9_-]{12}$/);
    const u = users.rows.find((x) => x.phone === '0712345678')!;
    expect(u.password_hash).not.toContain(res.temporaryPassword);
    expect(u.password_hash.startsWith('$2')).toBe(true);
    expect(await bcrypt.compare(res.temporaryPassword, u.password_hash)).toBe(
      true,
    );
    expect(u.must_change_password).toBe(true);
    expect(u.email).toBe('nperera@example.com');
    expect(fes.rows.find((x) => x.user_id === u.id)).toMatchObject({
      nic: '200012345678',
      role: 'factory_officer',
    });
    expect(employees.rows.find((x) => x.id === 60)!.userId).toBe(u.id);
    expect(res.user).toMatchObject({
      name: 'N. Perera',
      role: 'Officer',
      status: 'Active',
      linkedEmployee: { id: 60 },
    });
    // the password never reaches the audit trail
    expect(JSON.stringify(audit.record.mock.calls)).not.toContain(
      res.temporaryPassword,
    );
  });

  it('only lists active, unlinked, non-agent employees without a login', async () => {
    const { svc, employees } = build();
    employees.seed(
      employee({ id: 61, name: 'Eligible', nic: '200000000001' }),
      employee({
        id: 62,
        name: 'Agent',
        nic: '200000000002',
        role: AGENT_JOB_ROLE,
      }),
      employee({ id: 63, name: 'Linked', nic: '200000000003', userId: 2 }),
      employee({
        id: 64,
        name: 'Gone',
        nic: '200000000004',
        status: 'Inactive',
      }),
      employee({ id: 65, name: 'Admin HR record', nic: '198512345601' }), // NIC already has a login
    );
    const res = await svc.eligibleEmployees(admin);
    expect(res.employees.map((e) => e.id)).toEqual([61]);
    expect(res.assignableRoles).toEqual([
      'Administrator',
      'Manager',
      'Officer',
    ]);
  });

  it('one person, one login: an agent, a linked employee or a NIC that already has a login is refused (409)', async () => {
    const { svc, employees } = build();
    employees.seed(
      employee({ id: 62, nic: '200000000002', role: AGENT_JOB_ROLE }),
      employee({ id: 63, nic: '200000000003', userId: 2 }),
      // the Administrator's own NIC: they can't create themselves a Manager login to self-approve
      employee({ id: 65, nic: '198512345601', contact: '0715555555' }),
    );
    for (const employeeId of [62, 63, 65]) {
      await expect(
        svc.create({ employeeId, role: 'Manager' }, admin),
      ).rejects.toBeInstanceOf(ConflictException);
    }
  });

  it('a taken phone or email is refused', async () => {
    const { svc, employees, users } = build();
    users.rows.find((u) => u.id === 2)!.email = 'taken@example.com';
    employees.seed(
      employee({ id: 66, nic: '200000000006', contact: '0771234568' }),
    );
    await expect(
      svc.create({ employeeId: 66, role: 'Officer' }, admin),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      svc.create(
        {
          employeeId: 66,
          role: 'Officer',
          phone: '0716666666',
          email: 'TAKEN@example.com',
        },
        admin,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('SystemUsersService — reset password, unlock, links', () => {
  it('reset issues a new hashed temporary password once, forces a change and signs the user out', async () => {
    const { svc, users } = build();
    const u = users.rows.find((x) => x.id === 2)!;
    u.locked_until = new Date(Date.now() + 60_000);
    const res = await svc.resetPassword('USR-0002', admin);
    expect(await bcrypt.compare(res.temporaryPassword, u.password_hash)).toBe(
      true,
    );
    expect(u.must_change_password).toBe(true);
    expect(u.token_version).toBe(1);
    expect(u.locked_until).toBeNull();
  });

  it('unlock clears the lock early and is audited; refused when not locked', async () => {
    const { svc, users, audit } = build();
    await expect(svc.unlock('USR-0002', admin)).rejects.toBeInstanceOf(
      ConflictException,
    );
    const u = users.rows.find((x) => x.id === 2)!;
    u.locked_until = new Date(Date.now() + 10 * 60_000);
    u.failed_login_count = 0;
    const res = await svc.unlock('USR-0002', admin);
    expect(res.status).toBe('Active');
    expect(u.locked_until).toBeNull();
    expect(lastAudit(audit)).toMatchObject({ action: 'Unlocked user' });
  });

  it('proposes NIC matches but never links by itself; linking needs the matching NIC', async () => {
    const { svc, employees } = build();
    employees.seed(
      employee({ id: 70, name: 'S. Fernando (HR)', nic: '199012345602' }),
      employee({ id: 71, name: 'Someone else', nic: '201111111111' }),
    );
    const suggestions = await svc.linkSuggestions(admin);
    expect(suggestions).toEqual([
      expect.objectContaining({ userId: 'USR-0002', employeeId: 70 }),
    ]);
    expect(employees.rows.find((e) => e.id === 70)!.userId).toBeNull(); // not applied
    await expect(svc.link('USR-0002', 71, admin)).rejects.toBeInstanceOf(
      ConflictException,
    );
    const linked = await svc.link('USR-0002', 70, admin);
    expect(linked.linkedEmployee).toEqual({ id: 70, name: 'S. Fernando (HR)' });
    const unlinked = await svc.unlink('USR-0002', admin);
    expect(unlinked.linkedEmployee).toBeNull();
  });
});
