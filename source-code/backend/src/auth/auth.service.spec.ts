import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { Repository } from 'typeorm';
import type { RolePermissionEntity } from '../admin/role-permission.entity';
import type { AgentDirectoryService } from '../dispatch/agent-directory.service';
import type { User } from '../users/user.entity';
import type { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

/** Agent auth: the temporary-password flow for newly registered Tea Collecting Agents. */
async function setup(userPatch: Partial<User> = {}) {
  const user = {
    id: 11,
    phone: '0777000016',
    role: 'collection_agent',
    status: 'active',
    must_change_password: true,
    password_hash: await bcrypt.hash('Temp-pass-1', 4),
    ...userPatch,
  } as User;
  const usersService = {
    findByPhone: jest.fn().mockResolvedValue(user),
    findById: jest.fn().mockResolvedValue(user),
    markLogin: jest.fn().mockResolvedValue(undefined),
    setPassword: jest.fn().mockResolvedValue(1),
    setLoginFailures: jest.fn(
      (id: number, count: number, until: Date | null) => {
        user.failed_login_count = count;
        user.locked_until = until;
        return Promise.resolve();
      },
    ),
  };
  const directory = {
    byUserId: jest.fn().mockResolvedValue({ agentId: 6, name: 'P. Fernando' }),
    roleByUserId: jest.fn().mockResolvedValue('Tea Collecting Agent'),
  };
  const svc = new AuthService(
    usersService as unknown as UsersService,
    { sign: jest.fn().mockReturnValue('jwt') } as unknown as JwtService,
    {} as Repository<RolePermissionEntity>,
    directory as unknown as AgentDirectoryService,
  );
  return { svc, usersService, directory, user };
}

describe('AuthService — agent sign-in & first password change', () => {
  it('signs a registered agent in with the temporary password and tells the app to force a change', async () => {
    const { svc } = await setup();
    const res = await svc.agentLogin('0777000016', 'Temp-pass-1');
    expect(res).toMatchObject({
      accessToken: 'jwt',
      mustChangePassword: true,
      agent: {
        id: 6,
        name: 'P. Fernando',
        role: 'Tea Collecting Agent',
      },
    });
  });

  it('validates the JWT subject against the current active Agent and returns a safe profile', async () => {
    const { svc, usersService, directory } = await setup({
      must_change_password: false,
    });
    directory.byUserId.mockResolvedValue({
      agentId: 6,
      name: 'P. Fernando',
    });
    directory.roleByUserId.mockResolvedValue('Tea Collecting Agent');

    await expect(svc.agentSession(11)).resolves.toEqual({
      agent: {
        id: 6,
        name: 'P. Fernando',
        phone: '0777000016',
        role: 'Tea Collecting Agent',
      },
      mustChangePassword: false,
    });
    expect(usersService.findById).toHaveBeenCalledWith(11);
    expect(directory.byUserId).toHaveBeenCalledWith(11);
    expect(directory.roleByUserId).toHaveBeenCalledWith(11);
  });

  it('rejects sessions whose user role or active Agent link has changed', async () => {
    const wrongRole = await setup({ role: 'estate_owner' });
    await expect(wrongRole.svc.agentSession(11)).rejects.toThrow(
      UnauthorizedException,
    );

    const inactive = await setup();
    inactive.directory.byUserId.mockResolvedValue(null);
    await expect(inactive.svc.agentSession(11)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rejects suspended Agent accounts', async () => {
    const { svc } = await setup({ status: 'suspended' });
    await expect(svc.agentSession(11)).rejects.toThrow(ForbiddenException);
  });

  it('refuses a deactivated agent (no active employee behind the login)', async () => {
    const { svc, directory } = await setup();
    directory.byUserId.mockResolvedValue(null);
    await expect(svc.agentLogin('0777000016', 'Temp-pass-1')).rejects.toThrow(
      /not a collection agent/,
    );
  });

  it('refuses a login when the active employee role is unavailable', async () => {
    const { svc, directory } = await setup();
    directory.roleByUserId.mockResolvedValue(null);
    await expect(svc.agentLogin('0777000016', 'Temp-pass-1')).rejects.toThrow(
      /not a collection agent/,
    );
  });

  it('refuses a suspended login and a wrong password', async () => {
    const s1 = await setup({ status: 'suspended' });
    await expect(
      s1.svc.agentLogin('0777000016', 'Temp-pass-1'),
    ).rejects.toThrow(/suspended/);
    const s2 = await setup();
    await expect(s2.svc.agentLogin('0777000016', 'nope')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('changing the password stores a bcrypt hash (never plain text) and clears the flag', async () => {
    const { svc, usersService } = await setup();
    await svc.changeAgentPassword(11, 'Temp-pass-1', 'My-own-password-9');
    const [userId, hash] = usersService.setPassword.mock.calls[0] as [
      number,
      string,
    ];
    expect(userId).toBe(11);
    expect(hash).not.toContain('My-own-password-9');
    expect(await bcrypt.compare('My-own-password-9', hash)).toBe(true);
  });

  it('requires the current password, and a genuinely new one', async () => {
    const { svc, usersService } = await setup();
    await expect(
      svc.changeAgentPassword(11, 'wrong', 'My-own-password-9'),
    ).rejects.toThrow(/current password is incorrect/);
    await expect(
      svc.changeAgentPassword(11, 'Temp-pass-1', 'Temp-pass-1'),
    ).rejects.toThrow(ConflictException);
    expect(usersService.setPassword).not.toHaveBeenCalled();
  });

  it('only collection-agent accounts can use it', async () => {
    const { svc } = await setup({ role: 'factory_officer' });
    await expect(
      svc.changeAgentPassword(11, 'Temp-pass-1', 'My-own-password-9'),
    ).rejects.toThrow(UnauthorizedException);
  });
});

describe('AuthService — lockout after 5 wrong passwords (Users-Roles-Addendum §7)', () => {
  async function portal(patch: Partial<User> = {}) {
    const user = {
      id: 2,
      name: 'S. Fernando',
      phone: '0771234568',
      role: 'factory_officer',
      status: 'active',
      must_change_password: false,
      token_version: 3,
      failed_login_count: 0,
      locked_until: null,
      password_hash: await bcrypt.hash('Right-pass-1', 4),
      ...patch,
    } as User;
    const usersService = {
      findByPhone: jest.fn().mockResolvedValue(user),
      findById: jest.fn().mockResolvedValue(user),
      markLogin: jest.fn().mockResolvedValue(undefined),
      setPassword: jest.fn().mockResolvedValue(4),
      getProfile: jest
        .fn()
        .mockResolvedValue({ name: 'S. Fernando', factory: 'F' }),
      setLoginFailures: jest.fn(
        (id: number, count: number, until: Date | null) => {
          user.failed_login_count = count;
          user.locked_until = until;
          return Promise.resolve();
        },
      ),
    };
    const sign = jest.fn().mockReturnValue('jwt');
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const svc = new AuthService(
      usersService as unknown as UsersService,
      { sign } as unknown as JwtService,
      {
        find: jest.fn().mockResolvedValue([]),
      } as unknown as Repository<RolePermissionEntity>,
      {} as AgentDirectoryService,
      audit as never,
    );
    return { svc, user, usersService, sign, audit };
  }

  it('the 5th wrong password locks for 15 minutes; then even the right password is refused', async () => {
    const { svc, user, audit } = await portal();
    for (let i = 0; i < 4; i++) {
      await expect(svc.login('0771234568', 'wrong')).rejects.toThrow(
        /incorrect/,
      );
    }
    expect(user.failed_login_count).toBe(4);
    await expect(svc.login('0771234568', 'wrong')).rejects.toThrow(
      /Try again in 15 minutes/,
    );
    expect(user.locked_until).not.toBeNull();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'System', role: 'System' }),
      expect.objectContaining({ action: 'Locked user after failed sign-ins' }),
    );
    await expect(svc.login('0771234568', 'Right-pass-1')).rejects.toThrow(
      /Too many wrong passwords/,
    );
  });

  it('unlocks by itself once the 15 minutes are over, and a success resets the count', async () => {
    const { svc, user } = await portal({
      failed_login_count: 3,
      locked_until: new Date(Date.now() - 1000),
    });
    const res = await svc.login('0771234568', 'Right-pass-1');
    expect(res.accessToken).toBe('jwt');
    expect(user.failed_login_count).toBe(0);
    expect(user.locked_until).toBeNull();
  });

  it('the portal token carries the token version; the response flags a temporary password', async () => {
    const { svc, sign } = await portal({ must_change_password: true });
    const res = await svc.login('0771234568', 'Right-pass-1');
    expect(sign).toHaveBeenCalledWith({ sub: '2', role: 'Officer', tv: 3 });
    expect(res.mustChangePassword).toBe(true);
  });

  it('changing the portal password bumps the token version and returns a fresh token', async () => {
    const { svc, sign, usersService } = await portal({
      must_change_password: true,
    });
    const res = await svc.changePortalPassword(
      2,
      'Right-pass-1',
      'Brand-new-pass-2',
    );
    expect(usersService.setPassword).toHaveBeenCalledWith(
      2,
      expect.any(String),
      { bumpTokenVersion: true },
    );
    const hash = (
      usersService.setPassword.mock.calls[0] as [number, string]
    )[1];
    expect(hash).not.toContain('Brand-new-pass-2');
    expect(sign).toHaveBeenLastCalledWith({ sub: '2', role: 'Officer', tv: 4 });
    expect(res.mustChangePassword).toBe(false);
    await expect(
      svc.changePortalPassword(2, 'nope', 'Another-pass-3'),
    ).rejects.toThrow(/incorrect/);
  });
});
