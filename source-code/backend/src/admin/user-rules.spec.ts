import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  cellLock,
  MODULE_KEYS,
  needsReason,
  SEPARATED_KEYS,
} from './admin-map';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';
import {
  assignRoleRefusal,
  deactivateRefusal,
  roleChangeRefusal,
} from './user-rules';

const admin = { id: 1, role: 'Administrator' as const };
const manager = { id: 3, role: 'Manager' as const };
const t = (
  p: Partial<{
    id: number;
    role: 'Administrator' | 'Officer' | 'Manager';
    active: boolean;
  }> = {},
) => ({
  id: 2,
  role: 'Officer' as const,
  active: true,
  locked: false,
  ...p,
});

describe('user rules', () => {
  it('self, last Administrator and who may assign Administrator', () => {
    expect(
      deactivateRefusal(admin, t({ id: 1, role: 'Administrator' }), 2),
    ).toMatch(/your own/);
    expect(
      deactivateRefusal(
        { id: 5, role: 'Administrator' },
        t({ id: 1, role: 'Administrator' }),
        1,
      ),
    ).toMatch(/last active Administrator/);
    expect(
      deactivateRefusal(
        { id: 5, role: 'Administrator' },
        t({ id: 1, role: 'Administrator' }),
        2,
      ),
    ).toBeNull();
    expect(
      roleChangeRefusal(
        admin,
        t({ id: 1, role: 'Administrator' }),
        'Officer',
        3,
      ),
    ).toMatch(/own role/);
    expect(
      roleChangeRefusal(
        { id: 5, role: 'Administrator' },
        t({ id: 1, role: 'Administrator' }),
        'Officer',
        1,
      ),
    ).toMatch(/last active/);
    expect(assignRoleRefusal(manager, 'Administrator')).toMatch(
      /Only an Administrator/,
    );
    expect(assignRoleRefusal(admin, 'Administrator')).toBeNull();
  });
});

describe('matrix locks and the reason rule', () => {
  it('Administrator: pinned everywhere except the separated keys, which are capped', () => {
    for (const k of MODULE_KEYS) {
      expect(cellLock('Administrator', k)).toBe(
        SEPARATED_KEYS.includes(k) ? 'capped' : 'pinned',
      );
      expect(cellLock('Officer', k)).toBeNull();
      expect(cellLock('Manager', k)).toBeNull();
    }
  });

  it('a reason is needed for approve (either side) or a finance key, not otherwise', () => {
    expect(
      needsReason([
        { role: 'Officer', module: 'dispatch', from: 'view', to: 'edit' },
      ]),
    ).toBe(false);
    expect(
      needsReason([
        { role: 'Officer', module: 'dispatch', from: 'edit', to: 'approve' },
      ]),
    ).toBe(true);
    expect(
      needsReason([
        { role: 'Manager', module: 'dispatch', from: 'approve', to: 'edit' },
      ]),
    ).toBe(true);
    expect(
      needsReason([
        { role: 'Officer', module: 'payroll', from: 'view', to: 'none' },
      ]),
    ).toBe(true);
  });

  it('an unknown permission key is rejected by the request DTO (400)', async () => {
    const bad = plainToInstance(UpdatePermissionsDto, {
      entries: [{ role: 'Officer', module: 'superPowers', level: 'approve' }],
    });
    const errors = await validate(bad);
    expect(JSON.stringify(errors)).toMatch(/Unknown permission key/);
    const ok = plainToInstance(UpdatePermissionsDto, {
      entries: [{ role: 'Officer', module: 'dispatch', level: 'view' }],
      reason: 'x',
    });
    expect(await validate(ok)).toHaveLength(0);
  });
});
