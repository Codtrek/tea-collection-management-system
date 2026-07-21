import { UnauthorizedException } from '@nestjs/common';
import { toAppRole } from './role-map';

describe('toAppRole', () => {
  it.each([
    ['factory_admin', 'Administrator'],
    ['factory_officer', 'Officer'],
    ['factory_manager', 'Manager'],
  ] as const)('maps %s to %s', (dbRole, appRole) => {
    expect(toAppRole(dbRole)).toBe(appRole);
  });

  it.each([
    'estate_owner',
    'estate_manager',
    'plucking_employee',
    'collection_agent',
    'receiving_officer',
  ] as const)('rejects non-factory role %s', (dbRole) => {
    expect(() => toAppRole(dbRole)).toThrow(UnauthorizedException);
  });
});
