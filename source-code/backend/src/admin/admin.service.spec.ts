import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { AuditService } from '../audit/audit.service';
import { AdminService, type Actor } from './admin.service';
import type { GradeRateEntity } from './grade-rate.entity';
import type { RolePermissionEntity } from './role-permission.entity';
import type { SystemSettingEntity } from './system-setting.entity';

/** Flexible in-memory Repository stand-in, keyed by a caller-supplied function. */
class FakeRepository<T extends object> {
  readonly store = new Map<unknown, T>();

  constructor(private readonly keyOf: (row: T) => unknown) {}

  /** `manager.transaction(fn)` hands fn an EntityManager-like whose save writes here. */
  readonly manager = {
    transaction: <R>(
      fn: (m: { save: (_e: unknown, row: T) => Promise<T> }) => Promise<R>,
    ): Promise<R> => fn({ save: (_e, row) => this.save(row) }),
  };

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

const admin: Actor = { name: 'A. Bandara', role: 'Administrator', sub: 1 };
const officer: Actor = { name: 'S. Fernando', role: 'Officer', sub: 2 };

function build() {
  const gradeRepo = new FakeRepository<GradeRateEntity>((r) => r.id);
  const permRepo = new FakeRepository<RolePermissionEntity>(
    (r) => `${r.role}:${r.module}`,
  );
  const settingRepo = new FakeRepository<SystemSettingEntity>((r) => r.key);
  const audit = { record: jest.fn().mockResolvedValue(undefined) };

  const service = new AdminService(
    gradeRepo as unknown as Repository<GradeRateEntity>,
    permRepo as unknown as Repository<RolePermissionEntity>,
    settingRepo as unknown as Repository<SystemSettingEntity>,
    audit as unknown as AuditService,
  );

  return {
    service,
    gradeRepo,
    permRepo,
    settingRepo,
    audit,
  };
}

describe('AdminService — grade rates (ADM-01)', () => {
  // Colombo 2026-03-15 09:30 — every version below is "today or later" when published
  const MARCH = new Date('2026-03-15T04:00:00Z');
  const rate = (
    superRate: number,
    normalRate: number,
    effectiveDate: string,
  ) => ({ superRate, normalRate, effectiveDate, reason: 'Board decision' });

  it('refuses a version that would start in the past — it would reprice leaf already delivered', async () => {
    const { service, gradeRepo } = build();
    await expect(
      service.createGradeRate(rate(190, 98, '2026-03-14'), admin, MARCH),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(await gradeRepo.count()).toBe(0);
    // today itself is allowed
    await expect(
      service.createGradeRate(rate(190, 98, '2026-03-15'), admin, MARCH),
    ).resolves.toMatchObject({ current: true });
  });

  it('refuses a second version on the same date (versions are never edited)', async () => {
    const { service } = build();
    await service.createGradeRate(rate(180, 92, '2026-04-01'), admin, MARCH);
    await expect(
      service.createGradeRate(rate(181, 93, '2026-04-01'), admin, MARCH),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('"current" is the version in force today; a later one is scheduled, not current', async () => {
    const { service, audit } = build();
    await service.createGradeRate(rate(172, 88, '2026-03-15'), admin, MARCH);
    const later = await service.createGradeRate(
      rate(180, 92, '2026-04-01'),
      admin,
      MARCH,
    );
    expect(later).toMatchObject({
      id: 'GR-2026-0002',
      current: false,
      scheduled: true,
    });

    const inMarch = await service.listGradeRates(MARCH);
    expect(
      inMarch.filter((r) => r.current).map((r) => r.effectiveDate),
    ).toEqual(['2026-03-15']);

    const inApril = await service.listGradeRates(
      new Date('2026-04-02T04:00:00Z'),
    );
    expect(inApril.find((r) => r.current)?.effectiveDate).toBe('2026-04-01');
    expect(inApril.some((r) => r.scheduled)).toBe(false);
    expect(audit.record).toHaveBeenCalledTimes(2);
  });
});

describe('AdminService — grade rates: reason, identical, cancel (Administration-Addendum §3)', () => {
  const MARCH = new Date('2026-03-15T04:00:00Z');
  const rate = (
    superRate: number,
    normalRate: number,
    effectiveDate: string,
    reason = 'Board decision',
  ) => ({
    superRate,
    normalRate,
    effectiveDate,
    reason,
  });

  it('a reason is required', async () => {
    const { service } = build();
    await expect(
      service.createGradeRate(rate(190, 98, '2026-04-01', '  '), admin, MARCH),
    ).rejects.toThrow(/reason/);
  });

  it('refuses a version identical to the one it would follow', async () => {
    const { service } = build();
    await service.createGradeRate(rate(180, 92, '2026-03-15'), admin, MARCH);
    await expect(
      service.createGradeRate(rate(180, 92, '2026-04-01'), admin, MARCH),
    ).rejects.toThrow(/same as the grade rate in force from 2026-03-15/);
    await expect(
      service.createGradeRate(rate(181, 92, '2026-04-01'), admin, MARCH),
    ).resolves.toMatchObject({ scheduled: true });
  });

  it('a scheduled version can be cancelled before it starts: kept, audited, ignored', async () => {
    const { service, audit } = build();
    await service.createGradeRate(rate(180, 92, '2026-03-15'), admin, MARCH);
    const next = await service.createGradeRate(
      rate(190, 98, '2026-04-01'),
      admin,
      MARCH,
    );
    const list = await service.cancelGradeRate(
      next.id,
      'Wrong figure',
      admin,
      MARCH,
    );
    expect(list.find((r) => r.id === next.id)).toMatchObject({
      status: 'cancelled',
      scheduled: false,
      cancelled: { by: 'A. Bandara', reason: 'Wrong figure' },
    });
    expect(audit.record).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'Cancelled scheduled grade rates' }),
    );
    // in April the cancelled version never took over: March's rates are still current
    const april = await service.listGradeRates(
      new Date('2026-04-02T04:00:00Z'),
    );
    expect(april.find((r) => r.current)?.effectiveDate).toBe('2026-03-15');
    // and its date is free again
    await expect(
      service.createGradeRate(rate(191, 99, '2026-04-01'), admin, MARCH),
    ).resolves.toMatchObject({ scheduled: true });
  });

  it('a version that has started can’t be cancelled', async () => {
    const { service } = build();
    const now = await service.createGradeRate(
      rate(180, 92, '2026-03-15'),
      admin,
      MARCH,
    );
    await expect(
      service.cancelGradeRate(now.id, 'x y z', admin, MARCH),
    ).rejects.toThrow(/already started/);
  });

  it('the audit line shows old → new rates', async () => {
    const { service, audit } = build();
    await service.createGradeRate(rate(180, 92, '2026-03-15'), admin, MARCH);
    await service.createGradeRate(
      rate(185, 95, '2026-04-01', 'Market price'),
      admin,
      MARCH,
    );
    expect(audit.record).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        details:
          'Super Rs. 180 → 185/kg · Normal Rs. 92 → 95/kg — Market price',
      }),
    );
  });
});

describe('AdminService — factory profile (Administration-Addendum §2)', () => {
  const profile = {
    name: 'Nuwara Eliya Tea Factory',
    registrationNo: 'REG-1',
    address: 'Kandapola',
    contact: '0522223344',
    email: 'info@harboost.lk',
    bank: 'BOC',
    branch: 'Nuwara Eliya',
    accountName: 'NETF Ltd',
    accountNumber: '0071 2345 6789',
  };

  it('stores the account number but only ever returns its last 4 digits; audit is masked too', async () => {
    const { service, audit, settingRepo } = build();
    const saved = await service.updateFactoryProfile(profile, admin);
    expect(saved.bank).toEqual({
      bank: 'BOC',
      branch: 'Nuwara Eliya',
      accountName: 'NETF Ltd',
      accountNumberMasked: '••••6789',
    });
    expect(
      JSON.stringify(await service.getFactoryProfile(admin)),
    ).not.toContain('0071');
    expect(JSON.stringify(audit.record.mock.calls)).not.toContain('00712345');
    expect(
      (await settingRepo.findOne({ where: { key: 'factoryProfile' } }))?.value,
    ).toMatchObject({ bank: { accountNumber: '007123456789' } });
  });

  it('omitting the account number keeps the one on record', async () => {
    const { service } = build();
    await service.updateFactoryProfile(profile, admin);
    const { accountNumber: _omit, ...rest } = profile;
    void _omit;
    const saved = await service.updateFactoryProfile(
      { ...rest, branch: 'Kandy' },
      admin,
    );
    expect(saved.bank).toMatchObject({
      branch: 'Kandy',
      accountNumberMasked: '••••6789',
    });
  });

  it('is kept out of the generic settings map, and can’t be written through it', async () => {
    const { service } = build();
    await service.updateFactoryProfile(profile, admin);
    expect(await service.getSettings()).not.toHaveProperty('factoryProfile');
    await expect(
      service.updateSettings({ settings: { factoryProfile: {} } }, admin),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('Administrator only, and the number must be digits', async () => {
    const { service } = build();
    await expect(service.getFactoryProfile(officer)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(
      service.updateFactoryProfile({ ...profile, accountNumber: 'abc' }, admin),
    ).rejects.toThrow(/6 to 20 digits/);
  });
});

describe('AdminService — permission matrix (ADM-02, Users-Roles-Addendum §4)', () => {
  const cell = (
    role: string,
    module: string,
    level: string,
  ): RolePermissionEntity => ({ role, module, level });

  it('round-trips rows into the nested matrix', async () => {
    const { service, permRepo } = build();
    permRepo.seed(cell('Officer', 'reports', 'edit'));
    permRepo.seed(cell('Manager', 'reports', 'view'));

    const matrix = await service.getPermissionMatrix();
    expect(matrix.Officer.reports).toBe('edit');
    expect(matrix.Manager.reports).toBe('view');
  });

  it('saves a changed Officer cell and audits before → after with the reason', async () => {
    const { service, permRepo, audit } = build();
    permRepo.seed(cell('Officer', 'dispatch', 'view'));
    const matrix = await service.updatePermissions(
      { entries: [{ role: 'Officer', module: 'dispatch', level: 'edit' }] },
      admin,
    );
    expect(matrix.Officer.dispatch).toBe('edit');
    expect(audit.record).toHaveBeenCalledTimes(1);
    const [, entry] = audit.record.mock.calls[0] as [
      unknown,
      Record<string, unknown>,
    ];
    expect(entry).toMatchObject({
      action: 'Updated role permissions',
      before: { 'Officer · dispatch': 'view' },
      after: { 'Officer · dispatch': 'edit' },
      details: 'Officer · dispatch: view → edit',
    });
  });

  it('an unchanged cell is not written or audited', async () => {
    const { service, permRepo, audit } = build();
    permRepo.seed(cell('Officer', 'dispatch', 'edit'));
    await service.updatePermissions(
      { entries: [{ role: 'Officer', module: 'dispatch', level: 'edit' }] },
      admin,
    );
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('requires a reason when a change touches an approval level or a finance key', async () => {
    const { service, permRepo, audit } = build();
    permRepo.seed(cell('Officer', 'expenses', 'edit'));
    permRepo.seed(cell('Manager', 'dispatch', 'approve'));
    // finance key
    await expect(
      service.updatePermissions(
        { entries: [{ role: 'Officer', module: 'expenses', level: 'view' }] },
        admin,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    // approval level (from approve)
    await expect(
      service.updatePermissions(
        {
          entries: [{ role: 'Manager', module: 'dispatch', level: 'edit' }],
          reason: '  ',
        },
        admin,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(permRepo.store.get('Officer:expenses')?.level).toBe('edit');
    // with a reason it goes through and the reason is audited
    await service.updatePermissions(
      {
        entries: [{ role: 'Manager', module: 'dispatch', level: 'edit' }],
        reason: 'Dispatch moves to the Officer',
      },
      admin,
    );
    expect(permRepo.store.get('Manager:dispatch')?.level).toBe('edit');
    const [, entry] = audit.record.mock.calls[0] as [
      unknown,
      Record<string, unknown>,
    ];
    expect(entry.reason).toBe('Dispatch moves to the Officer');
  });

  it('a locked Administrator cell is refused even when unchanged (pinned to full access)', async () => {
    const { service } = build();
    for (const level of ['approve', 'view'] as const) {
      for (const module of [
        'collection',
        'dispatch',
        'administration',
      ] as const) {
        await expect(
          service.updatePermissions(
            {
              entries: [{ role: 'Administrator', module, level }],
              reason: 'x',
            },
            admin,
          ),
        ).rejects.toBeInstanceOf(ForbiddenException);
      }
    }
  });

  it('caps the Administrator at None / View on the separated keys: it can never grant itself the duty it audits', async () => {
    const { service, permRepo } = build();
    for (const module of [
      'grading',
      'gradingApproval',
      'fertilizerApproval',
      'fertilizerManagerApproval',
      'expenses',
    ] as const) {
      for (const level of ['edit', 'approve'] as const) {
        await expect(
          service.updatePermissions(
            {
              entries: [{ role: 'Administrator', module, level }],
              reason: 'x',
            },
            admin,
          ),
        ).rejects.toBeInstanceOf(ForbiddenException);
      }
    }
    const matrix = await service.updatePermissions(
      {
        entries: [
          { role: 'Administrator', module: 'grading', level: 'none' },
          { role: 'Administrator', module: 'gradingApproval', level: 'view' },
          { role: 'Manager', module: 'gradingApproval', level: 'approve' },
        ],
        reason: 'Corrections move to the Manager',
      },
      admin,
    );
    expect(matrix.Administrator.grading).toBe('none');
    expect(matrix.Administrator.gradingApproval).toBe('view');
    expect(matrix.Manager.gradingApproval).toBe('approve');
    expect(permRepo.store.size).toBe(3);
  });

  it('refuses the same cell twice in one save', async () => {
    const { service } = build();
    await expect(
      service.updatePermissions(
        {
          entries: [
            { role: 'Officer', module: 'dispatch', level: 'edit' },
            { role: 'Officer', module: 'dispatch', level: 'view' },
          ],
        },
        admin,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
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

describe('AdminService — system settings (ADM-03)', () => {
  it('upserts settings and reads them back as a map', async () => {
    const { service, audit } = build();
    const saved = await service.updateSettings(
      {
        settings: {
          sessionTimeout: '30',
          notifications: { 'route-assigned': true },
        },
      },
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
