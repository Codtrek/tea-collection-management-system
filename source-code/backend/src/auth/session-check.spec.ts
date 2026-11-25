import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { RolePermissionEntity } from '../admin/role-permission.entity';
import { FakeRepo } from '../collections/testing/fake-repo';
import { DispatchAccessService } from '../dispatch/dispatch-access.service';
import type { User } from '../users/user.entity';
import { checkPortalSession } from './session-check';

const row = (p: Partial<User> = {}) =>
  ({
    id: 2,
    role: 'factory_officer',
    status: 'active',
    token_version: 0,
    must_change_password: false,
    ...p,
  }) as User;

describe('checkPortalSession — the token alone is never trusted (Users-Roles-Addendum §6)', () => {
  const token = { sub: '2', role: 'Officer' as const, tv: 0 };

  it('passes a live session and hands controllers the role from the database', () => {
    expect(checkPortalSession(row(), token, '/collections')).toEqual({
      sub: '2',
      role: 'Officer',
      tv: 0,
    });
    // a role change is applied on the next request even though the token still says Officer
    expect(
      checkPortalSession(
        row({ role: 'factory_manager' }),
        token,
        '/collections',
      ).role,
    ).toBe('Manager');
  });

  it('a deactivated account is refused on its very next request (no waiting for token expiry)', () => {
    expect(() =>
      checkPortalSession(row({ status: 'suspended' }), token, '/collections'),
    ).toThrow(UnauthorizedException);
  });

  it('a bumped token version (reset / role change / deactivate) ends the old session', () => {
    expect(() =>
      checkPortalSession(row({ token_version: 1 }), token, '/collections'),
    ).toThrow(/session has ended/);
    // tokens issued before this release carry no tv: they match version 0 until it is bumped
    expect(
      checkPortalSession(row(), { sub: '2', role: 'Officer' }, '/x').tv,
    ).toBe(0);
  });

  it('a removed user, or one moved to a non-portal role, is refused', () => {
    expect(() => checkPortalSession(null, token, '/x')).toThrow(
      UnauthorizedException,
    );
    expect(() =>
      checkPortalSession(row({ role: 'collection_agent' }), token, '/x'),
    ).toThrow(UnauthorizedException);
  });

  it('with a temporary password only /auth/me and /auth/change-password work', () => {
    const temp = row({ must_change_password: true });
    expect(() => checkPortalSession(temp, token, '/collections?x=1')).toThrow(
      ForbiddenException,
    );
    expect(checkPortalSession(temp, token, '/auth/me').sub).toBe('2');
    expect(checkPortalSession(temp, token, '/auth/change-password/').sub).toBe(
      '2',
    );
  });
});

describe('a reduced permission blocks the very next request (no cache)', () => {
  it('Officer dispatch edit → view: the next check is refused', async () => {
    const perms = new FakeRepo<RolePermissionEntity>(null);
    const officerDispatch: RolePermissionEntity = {
      role: 'Officer',
      module: 'dispatch',
      level: 'edit',
    };
    perms.seed(officerDispatch);
    const access = new DispatchAccessService(
      perms as unknown as Repository<RolePermissionEntity>,
    );

    await expect(
      access.require('Officer', 'edit', 'reassign a route'),
    ).resolves.toBeUndefined();
    // the Administrator saves the matrix (same row the service reads)
    perms.rows[0].level = 'view';
    await expect(
      access.require('Officer', 'edit', 'reassign a route'),
    ).rejects.toThrow(ForbiddenException);
  });
});
