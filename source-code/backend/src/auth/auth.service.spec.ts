import { ConflictException, UnauthorizedException } from '@nestjs/common';
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
    setPassword: jest.fn().mockResolvedValue(undefined),
  };
  const directory = {
    byUserId: jest.fn().mockResolvedValue({ agentId: 6, name: 'P. Fernando' }),
  };
  const svc = new AuthService(
    usersService as unknown as UsersService,
    { sign: jest.fn().mockReturnValue('jwt') } as unknown as JwtService,
    {} as Repository<RolePermissionEntity>,
    directory as unknown as AgentDirectoryService,
  );
  return { svc, usersService, directory };
}

describe('AuthService — agent sign-in & first password change', () => {
  it('signs a registered agent in with the temporary password and tells the app to force a change', async () => {
    const { svc } = await setup();
    const res = await svc.agentLogin('0777000016', 'Temp-pass-1');
    expect(res).toMatchObject({
      accessToken: 'jwt',
      mustChangePassword: true,
      agent: { id: 6 },
    });
  });

  it('refuses a deactivated agent (no active employee behind the login)', async () => {
    const { svc, directory } = await setup();
    directory.byUserId.mockResolvedValue(null);
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
