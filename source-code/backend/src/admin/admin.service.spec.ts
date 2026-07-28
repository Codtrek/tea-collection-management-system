import { ForbiddenException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { AuditService } from '../audit/audit.service';
import type { FactoryEmployee } from '../users/factory-employee.entity';
import type { User } from '../users/user.entity';
import { AdminService, type Actor } from './admin.service';
import type { GradeRateEntity } from './grade-rate.entity';
import type { RolePermissionEntity } from './role-permission.entity';
import type { SystemSettingEntity } from './system-setting.entity';

/** Flexible in-memory Repository stand-in, keyed by a caller-supplied function. */
class FakeRepository<T extends object> {
  private readonly store = new Map<unknown, T>();

  constructor(private readonly keyOf: (row: T) => unknown) {}

  seed(row: T): void {
    this.store.set(this.keyOf(row), row);
  }

  find(opts?: {
    order?: Record<string, 'ASC' | 'DESC'>;
    where?: Partial<T>;
  }): Promise<T[]> {
    let rows = [...this.store.values()];
    if (opts?.where) {
      const [k, v] = Object.entries(opts.where)[0] as [keyof T, unknown];
      rows = rows.filter((r) => r[k] === v);
    }
    if (opts?.order) {
      const [field, dir] = Object.entries(opts.order)[0];
      rows = rows.sort((a, b) => {
        const av = String((a as Record<string, unknown>)[field]);
        const bv = String((b as Record<string, unknown>)[field]);
        return dir === 'DESC' ? bv.localeCompare(av) : av.localeCompare(bv);
      });
    }
    return Promise.resolve(rows);
  }

  findOne(opts: { where: Partial<T> }): Promise<T | null> {
    const [k, v] = Object.entries(opts.where)[0] as [keyof T, unknown];
    return Promise.resolve(
      [...this.store.values()].find((r) => r[k] === v) ?? null,
    );
  }

  count(): Promise<number> {
    return Promise.resolve(this.store.size);
  }

  create(partial: Partial<T>): T {
    return partial as T;
  }

  save(row: T): Promise<T> {
    this.store.set(this.keyOf(row), row);
    return Promise.resolve(row);
  }
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 2,
    phone: '0771234568',
    password_hash: 'x',
    role: 'factory_officer',
    status: 'active',
    last_login_at: null,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  } as User;
}

const admin: Actor = { name: 'A. Bandara', role: 'Administrator', sub: 1 };
const officer: Actor = { name: 'S. Fernando', role: 'Officer', sub: 2 };

function build() {
  const gradeRepo = new FakeRepository<GradeRateEntity>((r) => r.id);
  const permRepo = new FakeRepository<RolePermissionEntity>(
    (r) => `${r.role}:${r.module}`,
  );
  const settingRepo = new FakeRepository<SystemSettingEntity>((r) => r.key);
  const userRepo = new FakeRepository<User>((r) => r.id);
  const feRepo = new FakeRepository<FactoryEmployee>((r) => r.user_id);
  const audit = { record: jest.fn().mockResolvedValue(undefined) };

  const service = new AdminService(
    gradeRepo as unknown as Repository<GradeRateEntity>,
    permRepo as unknown as Repository<RolePermissionEntity>,
    settingRepo as unknown as Repository<SystemSettingEntity>,
    userRepo as unknown as Repository<User>,
    feRepo as unknown as Repository<FactoryEmployee>,
    audit as unknown as AuditService,
  );

  return { service, gradeRepo, permRepo, settingRepo, userRepo, feRepo, audit };
}

describe('AdminService — grade rates (ADM-01)', () => {
  it('rejects a non-Administrator', async () => {
    const { service } = build();
    await expect(
      service.createGradeRate(
        { superRate: 190, normalRate: 98, effectiveDate: '2026-08-01' },
        officer,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates a version and marks only the newest effective date current', async () => {
    const { service, audit } = build();
    await service.createGradeRate(
      { superRate: 180, normalRate: 92, effectiveDate: '2026-04-01' },
      admin,
    );
    const newer = await service.createGradeRate(
      { superRate: 185, normalRate: 95, effectiveDate: '2026-07-01' },
      admin,
    );

    expect(newer.id).toBe('GR-2026-0002');
    expect(newer.current).toBe(true);

    const list = await service.listGradeRates();
    expect(list.filter((r) => r.current)).toHaveLength(1);
    expect(list.find((r) => r.current)?.effectiveDate).toBe('2026-07-01');
    expect(audit.record).toHaveBeenCalledTimes(2);
  });

  it('an older-dated version does NOT become current', async () => {
    const { service } = build();
    await service.createGradeRate(
      { superRate: 185, normalRate: 95, effectiveDate: '2026-07-01' },
      admin,
    );
    const older = await service.createGradeRate(
      { superRate: 172, normalRate: 88, effectiveDate: '2026-01-01' },
      admin,
    );
    expect(older.current).toBe(false);
  });
});

describe('AdminService — permission matrix (ADM-02)', () => {
  it('round-trips rows into the nested matrix', async () => {
    const { service, permRepo } = build();
    permRepo.seed({ role: 'Officer', module: 'reports', level: 'edit' } as RolePermissionEntity);
    permRepo.seed({ role: 'Manager', module: 'reports', level: 'view' } as RolePermissionEntity);

    const matrix = await service.getPermissionMatrix();
    expect(matrix.Officer.reports).toBe('edit');
    expect(matrix.Manager.reports).toBe('view');
  });

  it('updates an Officer cell and records an audit entry', async () => {
    const { service, audit } = build();
    const matrix = await service.updatePermissions(
      { entries: [{ role: 'Officer', module: 'reports', level: 'view' }] },
      admin,
    );
    expect(matrix.Officer.reports).toBe('view');
    expect(audit.record).toHaveBeenCalledTimes(1);
  });

  it('rejects downgrading the immutable Administrator role', async () => {
    const { service } = build();
    await expect(
      service.updatePermissions(
        { entries: [{ role: 'Administrator', module: 'reports', level: 'view' }] },
        admin,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a non-Administrator', async () => {
    const { service } = build();
    await expect(
      service.updatePermissions(
        { entries: [{ role: 'Officer', module: 'reports', level: 'view' }] },
        officer,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('AdminService — system users (ADM-02)', () => {
  it('lists only factory-role users with mapped status', async () => {
    const { service, userRepo, feRepo } = build();
    userRepo.seed(makeUser({ id: 1, role: 'factory_admin', status: 'active' }));
    userRepo.seed(makeUser({ id: 2, role: 'factory_officer', status: 'suspended' }));
    userRepo.seed(makeUser({ id: 9, role: 'estate_owner' })); // must be excluded
    feRepo.seed({ user_id: 1, name: 'A. Bandara' } as FactoryEmployee);
    feRepo.seed({ user_id: 2, name: 'S. Fernando' } as FactoryEmployee);

    const users = await service.listUsers();
    expect(users).toHaveLength(2);
    expect(users.find((u) => u.id === 'USR-0002')?.status).toBe('Suspended');
    expect(users.find((u) => u.id === 'USR-0001')?.role).toBe('Administrator');
  });

  it('suspends a user and records an audit entry', async () => {
    const { service, userRepo, feRepo, audit } = build();
    userRepo.seed(makeUser({ id: 2, role: 'factory_officer' }));
    feRepo.seed({ user_id: 2, name: 'S. Fernando' } as FactoryEmployee);

    const result = await service.suspendUser('USR-0002', admin);
    expect(result.status).toBe('Suspended');
    expect(audit.record).toHaveBeenCalledTimes(1);
  });

  it('blocks suspending your own account', async () => {
    const { service, userRepo } = build();
    userRepo.seed(makeUser({ id: 1, role: 'factory_admin' }));
    await expect(service.suspendUser('USR-0001', admin)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

describe('AdminService — system settings (ADM-03)', () => {
  it('upserts settings and reads them back as a map', async () => {
    const { service, audit } = build();
    const saved = await service.updateSettings(
      { settings: { sessionTimeout: '30', notifications: { 'route-assigned': true } } },
      admin,
    );
    expect(saved.sessionTimeout).toBe('30');
    expect(await service.getSettings()).toEqual(saved);
    expect(audit.record).toHaveBeenCalledTimes(1);
  });

  it('rejects a non-Administrator', async () => {
    const { service } = build();
    await expect(
      service.updateSettings({ settings: { x: 1 } }, officer),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
