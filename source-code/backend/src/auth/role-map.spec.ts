import { UnauthorizedException } from '@nestjs/common';
import { toAppRole, toPortalRole } from './role-map';

describe('toAppRole', () => {
  it.each([
    ['factory_admin', 'Administrator'],
    ['factory_officer', 'Officer'],
    ['factory_manager', 'Manager'],
    ['estate_owner', 'Estate Owner'],
    ['estate_manager', 'Estate Manager'],
  ] as const)('maps %s to %s', (dbRole, appRole) => {
    expect(toAppRole(dbRole)).toBe(appRole);
  });

  it.each([
    'plucking_employee',
    'collection_agent',
    'receiving_officer',
  ] as const)('rejects unmapped role %s', (dbRole) => {
    expect(() => toAppRole(dbRole)).toThrow(UnauthorizedException);
  });
});

describe('toPortalRole', () => {
  it.each([
    ['factory_admin', 'Administrator'],
    ['factory_officer', 'Officer'],
    ['factory_manager', 'Manager'],
  ] as const)('maps %s to %s', (dbRole, portalRole) => {
    expect(toPortalRole(dbRole)).toBe(portalRole);
  });

  it.each(['estate_owner', 'estate_manager', 'collection_agent'] as const)(
    'rejects non-portal role %s',
    (dbRole) => {
      expect(() => toPortalRole(dbRole)).toThrow(UnauthorizedException);
    },
  );
});
