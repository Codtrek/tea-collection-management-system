import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA } from '@nestjs/common/constants';
import type { ModuleKey } from '../admin/admin-map';
import { AdminController } from '../admin/admin.controller';
import { CollectionsController } from '../collections/collections.controller';
import { EmployeesController } from '../employees/employees.controller';
import { EstatesController } from '../estates/estates.controller';
import {
  PERMISSION_META,
  permissionRefusal,
  type PermissionRequirement,
} from './permissions';

/**
 * The 27 writes that used hard-coded role rules now check the matrix (Users-Roles-Addendum §4a).
 * This pins each route's key + level, and shows what the DEFAULT matrix allows — "same" rows keep
 * exactly the old behaviour; the 4 agreed changes are asserted explicitly.
 */
type Level = 'none' | 'view' | 'edit' | 'approve';
type Role = 'Administrator' | 'Manager' | 'Officer';

/** Default levels (migrations 1794400014000 / 1794400026000 and the module migrations). */
const DEFAULTS: Record<Role, Partial<Record<ModuleKey, Level>>> = {
  Administrator: {
    collection: 'approve',
    estateOwners: 'approve',
    estateAdvances: 'approve',
    employees: 'approve',
    advances: 'approve',
    payroll: 'approve',
    administration: 'approve',
    gradingApproval: 'view',
  },
  Manager: {
    collection: 'view',
    estateOwners: 'view',
    estateAdvances: 'view',
    employees: 'view',
    advances: 'view',
    payroll: 'view',
    administration: 'none',
    gradingApproval: 'approve',
  },
  Officer: {
    collection: 'edit',
    estateOwners: 'edit',
    estateAdvances: 'edit',
    employees: 'view',
    advances: 'approve',
    payroll: 'edit',
    administration: 'none',
    gradingApproval: 'view',
  },
};

type Ctor = { prototype: object; name: string };
const need = (ctor: Ctor, handler: string): PermissionRequirement => {
  const fn = Object.getOwnPropertyDescriptor(ctor.prototype, handler)
    ?.value as object;
  expect(Reflect.getMetadata(METHOD_METADATA, fn)).not.toBe(RequestMethod.GET);
  return Reflect.getMetadata(PERMISSION_META, fn) as PermissionRequirement;
};
const allowed = (r: PermissionRequirement) =>
  (Object.keys(DEFAULTS) as Role[]).filter(
    (role) => permissionRefusal(r, DEFAULTS[role]) === null,
  );

// [controller, handler, key, level, roles allowed by default]
const ROUTES: Array<[Ctor, string, ModuleKey, Level, Role[]]> = [
  [
    CollectionsController,
    'update',
    'collection',
    'edit',
    ['Administrator', 'Officer'],
  ],
  [
    CollectionsController,
    'createException',
    'collection',
    'edit',
    ['Administrator', 'Officer'],
  ],
  [EstatesController, 'create', 'estateOwners', 'approve', ['Administrator']],
  [
    EstatesController,
    'deactivate',
    'estateOwners',
    'approve',
    ['Administrator'],
  ],
  [
    EstatesController,
    'update',
    'estateOwners',
    'edit',
    ['Administrator', 'Officer'],
  ],
  [
    EstatesController,
    'issueAdvance',
    'estateAdvances',
    'edit',
    ['Administrator', 'Officer'],
  ],
  [
    EstatesController,
    'recordRepayment',
    'estateAdvances',
    'edit',
    ['Administrator', 'Officer'],
  ],
  [
    EstatesController,
    'requestReschedule',
    'estateAdvances',
    'edit',
    ['Administrator', 'Officer'],
  ],
  // change: the Officer no longer decides estate-advance reschedules (the portal already needed Approve)
  [
    EstatesController,
    'decideReschedule',
    'estateAdvances',
    'approve',
    ['Administrator'],
  ],
  [
    EstatesController,
    'prepareSettlements',
    'estateOwners',
    'edit',
    ['Administrator', 'Officer'],
  ],
  // change: processing a settlement run needs Approve (the Officer loses it by default)
  [
    EstatesController,
    'processSettlements',
    'estateOwners',
    'approve',
    ['Administrator'],
  ],
  // change: excluding a delivery is a gradingApproval duty (the Administrator is capped at View)
  [
    EstatesController,
    'excludeDelivery',
    'gradingApproval',
    'approve',
    ['Manager'],
  ],
  [EmployeesController, 'create', 'employees', 'approve', ['Administrator']],
  [EmployeesController, 'update', 'employees', 'approve', ['Administrator']],
  [
    EmployeesController,
    'deactivate',
    'employees',
    'approve',
    ['Administrator'],
  ],
  [
    EmployeesController,
    'requestAdvance',
    'advances',
    'edit',
    ['Administrator', 'Officer'],
  ],
  [
    EmployeesController,
    'recordRepayment',
    'advances',
    'edit',
    ['Administrator', 'Officer'],
  ],
  [
    EmployeesController,
    'requestReschedule',
    'advances',
    'edit',
    ['Administrator', 'Officer'],
  ],
  [
    EmployeesController,
    'decideAdvance',
    'advances',
    'approve',
    ['Administrator', 'Officer'],
  ],
  [
    EmployeesController,
    'decideReschedule',
    'advances',
    'approve',
    ['Administrator', 'Officer'],
  ],
  [
    EmployeesController,
    'generatePayroll',
    'payroll',
    'edit',
    ['Administrator', 'Officer'],
  ],
  // change: processing payroll needs Approve (the Officer loses it by default)
  [
    EmployeesController,
    'processPayroll',
    'payroll',
    'approve',
    ['Administrator'],
  ],
  [
    AdminController,
    'createGradeRate',
    'administration',
    'edit',
    ['Administrator'],
  ],
  [
    AdminController,
    'cancelGradeRate',
    'administration',
    'edit',
    ['Administrator'],
  ],
  [
    AdminController,
    'createTransportRate',
    'administration',
    'edit',
    ['Administrator'],
  ],
  [
    AdminController,
    'cancelTransportRate',
    'administration',
    'edit',
    ['Administrator'],
  ],
  [
    AdminController,
    'updateFactoryProfile',
    'administration',
    'edit',
    ['Administrator'],
  ],
];

describe('write permissions: hard-coded rules moved to the matrix', () => {
  it('covers all 27 routes', () => expect(ROUTES).toHaveLength(27));

  it.each(ROUTES)(
    '%p.%s needs %s: %s (default: %p)',
    (ctor, handler, key, level, roles) => {
      expect(need(ctor, handler)).toEqual({ keys: [key], level });
      expect(allowed(need(ctor, handler))).toEqual(roles);
    },
  );

  it('raising a cell grants the action without a code change', () => {
    const officerApprove = { ...DEFAULTS.Officer, payroll: 'approve' as const };
    expect(
      permissionRefusal(
        need(EmployeesController, 'processPayroll'),
        officerApprove,
      ),
    ).toBeNull();
    const managerEdit = { ...DEFAULTS.Manager, estateOwners: 'edit' as const };
    expect(
      permissionRefusal(need(EstatesController, 'update'), managerEdit),
    ).toBeNull();
  });
});
