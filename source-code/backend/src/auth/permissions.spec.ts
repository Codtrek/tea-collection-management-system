import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { DataSource } from 'typeorm';
import { JwtAuthGuard } from './jwt-auth.guard';
import {
  levelAtLeast,
  PERMISSION_META,
  permissionRefusal,
  PortalOnly,
  RequirePermission,
} from './permissions';

describe('levelAtLeast', () => {
  it('orders none < view < edit < approve; unknown/missing = none', () => {
    expect(levelAtLeast('approve', 'view')).toBe(true);
    expect(levelAtLeast('view', 'view')).toBe(true);
    expect(levelAtLeast('view', 'edit')).toBe(false);
    expect(levelAtLeast('none', 'view')).toBe(false);
    expect(levelAtLeast(undefined, 'view')).toBe(false);
    expect(levelAtLeast('bogus', 'view')).toBe(false);
  });
});

describe('permissionRefusal', () => {
  const need = { keys: ['payroll' as const], level: 'view' as const };
  it('allows view or higher, refuses none / no row with a readable message', () => {
    expect(permissionRefusal(need, { payroll: 'view' })).toBeNull();
    expect(permissionRefusal(need, { payroll: 'approve' })).toBeNull();
    expect(permissionRefusal(need, { payroll: 'none' })).toBe(
      "Your role can't view Payroll. Ask your Factory Administrator if you need access.",
    );
    expect(permissionRefusal(need, {})).not.toBeNull();
  });
  it('several keys = any one is enough', () => {
    const shared = {
      keys: ['holidayCalendar' as const, 'attendance' as const],
      level: 'view' as const,
    };
    expect(
      permissionRefusal(shared, {
        holidayCalendar: 'none',
        attendance: 'edit',
      }),
    ).toBeNull();
    expect(
      permissionRefusal(shared, {
        holidayCalendar: 'none',
        attendance: 'none',
      }),
    ).toMatch(/Holiday calendar or Attendance and leave/);
  });
  it('no keys (PortalOnly) is always allowed', () => {
    expect(permissionRefusal({ keys: [], level: 'view' }, {})).toBeNull();
  });
});

describe('JwtAuthGuard permission check', () => {
  class Ctl {
    @RequirePermission('payroll')
    payroll() {}
    @PortalOnly()
    me() {}
    unlabelled() {}
  }

  /** The matrix as stored; `find` is called on every request (no cache). */
  const matrix: Array<{ role: string; module: string; level: string }> = [];
  const find = jest.fn(
    ({ where }: { where: { role: string; module: { _value: string[] } } }) =>
      Promise.resolve(
        matrix.filter(
          (r) =>
            r.role === where.role && where.module._value.includes(r.module),
        ),
      ),
  );
  const dataSource = {
    getRepository: () => ({ find }),
  } as unknown as DataSource;
  const guard = new JwtAuthGuard(new Reflector(), dataSource);

  const ctx = (handler: keyof Ctl, role = 'Officer') =>
    ({
      getHandler: () => Ctl.prototype[handler],
      getClass: () => Ctl,
      switchToHttp: () => ({
        getRequest: () => ({ user: { sub: '1', role } }),
      }),
    }) as unknown as ExecutionContext;

  beforeAll(() => {
    // Authentication itself (passport) is tested elsewhere; here it always succeeds.
    jest
      .spyOn(
        Object.getPrototypeOf(JwtAuthGuard.prototype) as InstanceType<
          ReturnType<typeof AuthGuard>
        >,
        'canActivate',
      )
      .mockResolvedValue(true);
  });
  beforeEach(() => {
    matrix.length = 0;
    find.mockClear();
  });

  it('refuses a role with none, allows one with view', async () => {
    matrix.push(
      { role: 'Officer', module: 'payroll', level: 'none' },
      { role: 'Manager', module: 'payroll', level: 'view' },
    );
    await expect(
      guard.canActivate(ctx('payroll', 'Officer')),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(guard.canActivate(ctx('payroll', 'Manager'))).resolves.toBe(
      true,
    );
  });

  it('a matrix change applies to the very next request (no cache)', async () => {
    matrix.push({ role: 'Officer', module: 'payroll', level: 'view' });
    await expect(guard.canActivate(ctx('payroll'))).resolves.toBe(true);
    matrix[0].level = 'none';
    await expect(guard.canActivate(ctx('payroll'))).rejects.toThrow(
      /can't view Payroll/,
    );
    expect(find).toHaveBeenCalledTimes(2);
  });

  it('PortalOnly and unlabelled routes skip the matrix', async () => {
    await expect(guard.canActivate(ctx('me'))).resolves.toBe(true);
    await expect(guard.canActivate(ctx('unlabelled'))).resolves.toBe(true);
    expect(find).not.toHaveBeenCalled();
  });

  it('stores the requirement as metadata', () => {
    expect(
      Reflect.getMetadata(
        PERMISSION_META,
        Object.getOwnPropertyDescriptor(Ctl.prototype, 'payroll')!
          .value as object,
      ),
    ).toEqual({ keys: ['payroll'], level: 'view' });
  });
});
