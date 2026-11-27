import {
  ForbiddenException,
  UnauthorizedException,
  type CallHandler,
  type ExecutionContext,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { lastValueFrom, of, throwError } from 'rxjs';
import type { Repository } from 'typeorm';
import type { RolePermissionEntity } from '../admin/role-permission.entity';
import type { AgentDirectoryService } from '../dispatch/agent-directory.service';
import type { User } from '../users/user.entity';
import type { UsersService } from '../users/users.service';
import { AgentJwtStrategy } from './agent-jwt.strategy';
import {
  AGENT_REFRESH_AFTER_SECONDS,
  checkAgentSession,
  needsRefresh,
  SESSION_TOKEN_HEADER,
  signAgentToken,
} from './agent-session';
import { AgentSessionInterceptor } from './agent-session.interceptor';
import { AuthService } from './auth.service';
import { AGENT_ROLE, type AgentJwtPayload } from './jwt-payload.interface';
import type { ConfigService } from '@nestjs/config';

const SECRET = 'test-secret';
const jwt = new JwtService({ secret: SECRET });
const DAY = 24 * 60 * 60;

function agentUser(patch: Partial<User> = {}): User {
  return {
    id: 11,
    phone: '0777000016',
    role: 'collection_agent',
    status: 'active',
    must_change_password: false,
    token_version: 3,
    ...patch,
  } as User;
}

describe('checkAgentSession (every agent request)', () => {
  const payload = (p: Partial<AgentJwtPayload> = {}): AgentJwtPayload => ({
    sub: '11',
    role: AGENT_ROLE,
    tv: 3,
    ...p,
  });

  it('accepts a current token and returns the DB version', () => {
    expect(
      checkAgentSession(
        agentUser(),
        payload({ iat: 100 }),
        '/dispatch/me/stops',
      ),
    ).toEqual({
      sub: '11',
      role: AGENT_ROLE,
      tv: 3,
      iat: 100,
    });
  });

  it('refuses an old-version token (password changed, logged out)', () => {
    expect(() =>
      checkAgentSession(agentUser({ token_version: 4 }), payload(), '/x'),
    ).toThrow(/session has ended/);
  });

  it('a token from before `tv` existed counts as version 0, so the deploy signs nobody out', () => {
    const old = { sub: '11', role: AGENT_ROLE } as AgentJwtPayload;
    expect(
      checkAgentSession(agentUser({ token_version: 0 }), old, '/x').tv,
    ).toBe(0);
    expect(() =>
      checkAgentSession(agentUser({ token_version: 1 }), old, '/x'),
    ).toThrow(UnauthorizedException);
  });

  it('refuses a suspended or missing login, and a non-agent user', () => {
    expect(() =>
      checkAgentSession(agentUser({ status: 'suspended' }), payload(), '/x'),
    ).toThrow(/suspended/);
    expect(() => checkAgentSession(null, payload(), '/x')).toThrow(
      UnauthorizedException,
    );
    expect(() =>
      checkAgentSession(
        agentUser({ role: 'factory_officer' }),
        payload(),
        '/x',
      ),
    ).toThrow(UnauthorizedException);
  });

  it('a temporary password blocks everything except change-password and logout', () => {
    const u = agentUser({ must_change_password: true });
    expect(() => checkAgentSession(u, payload(), '/dispatch/me/stops')).toThrow(
      ForbiddenException,
    );
    expect(
      checkAgentSession(u, payload(), '/auth/agent/change-password'),
    ).toBeTruthy();
    expect(checkAgentSession(u, payload(), '/auth/agent/logout/')).toBeTruthy();
  });
});

describe('agent tokens: 30 days, sliding', () => {
  it('a new token carries the version and expires in 30 days', () => {
    const t = jwt.decode<AgentJwtPayload & { exp: number; iat: number }>(
      signAgentToken(jwt, 11, 3),
    );
    expect(t).toMatchObject({ sub: '11', role: AGENT_ROLE, tv: 3 });
    expect(t.exp - t.iat).toBe(30 * DAY);
  });

  it('an expired token is refused by the strategy (passport-jwt verifies exp)', async () => {
    const expired = jwt.sign(
      { sub: '11', role: AGENT_ROLE, tv: 3 },
      { expiresIn: -10 },
    );
    await expect(jwt.verifyAsync(expired)).rejects.toThrow(/expired/);
  });

  it('refresh only once the token is over a day old', () => {
    const now = 1_000_000;
    expect(needsRefresh({ iat: now - 60 }, now)).toBe(false);
    expect(needsRefresh({ iat: now - AGENT_REFRESH_AFTER_SECONDS }, now)).toBe(
      false,
    );
    expect(
      needsRefresh({ iat: now - AGENT_REFRESH_AFTER_SECONDS - 1 }, now),
    ).toBe(true);
    expect(needsRefresh({}, now)).toBe(false);
  });
});

describe('AgentSessionInterceptor', () => {
  const interceptor = new AgentSessionInterceptor(jwt);
  const run = async (
    user: AgentJwtPayload | undefined,
    handler: CallHandler,
  ) => {
    const headers: Record<string, string> = {};
    const ctx = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => ({ user }),
        getResponse: () => ({
          headersSent: false,
          setHeader: (k: string, v: string) => (headers[k] = v),
        }),
      }),
    } as unknown as ExecutionContext;
    await lastValueFrom(interceptor.intercept(ctx, handler)).catch(
      () => undefined,
    );
    return headers;
  };
  const ok: CallHandler = { handle: () => of({ ok: true }) };
  const nowS = () => Math.floor(Date.now() / 1000);

  it('adds a fresh 30-day token, with the checked version, when the token is over a day old', async () => {
    const h = await run(
      { sub: '11', role: AGENT_ROLE, tv: 3, iat: nowS() - 2 * DAY },
      ok,
    );
    const fresh = await jwt.verifyAsync<AgentJwtPayload>(
      h[SESSION_TOKEN_HEADER],
    );
    expect(fresh).toMatchObject({ sub: '11', role: AGENT_ROLE, tv: 3 });
  });

  it('no refresh for a young token, a failed call, or a non-agent request', async () => {
    expect(
      await run({ sub: '11', role: AGENT_ROLE, tv: 3, iat: nowS() - 60 }, ok),
    ).toEqual({});
    const failing: CallHandler = {
      handle: () => throwError(() => new Error('boom')),
    };
    expect(
      await run(
        { sub: '11', role: AGENT_ROLE, tv: 3, iat: nowS() - 2 * DAY },
        failing,
      ),
    ).toEqual({});
    expect(await run(undefined, ok)).toEqual({});
    expect(
      await run(
        {
          sub: '1',
          role: 'Administrator',
          iat: nowS() - 2 * DAY,
        } as unknown as AgentJwtPayload,
        ok,
      ),
    ).toEqual({});
  });
});

describe('AgentJwtStrategy re-reads the user on every request', () => {
  it('refuses a revoked token even though its signature is valid', async () => {
    const users = {
      findOne: jest.fn().mockResolvedValue(agentUser({ token_version: 5 })),
    };
    const strategy = new AgentJwtStrategy(
      { getOrThrow: () => SECRET } as unknown as ConfigService,
      users as unknown as Repository<User>,
    );
    const req = { originalUrl: '/dispatch/me/stops' } as never;
    await expect(
      strategy.validate(req, { sub: '11', role: AGENT_ROLE, tv: 4 }),
    ).rejects.toThrow(/session has ended/);
    await expect(
      strategy.validate(req, { sub: '11', role: AGENT_ROLE, tv: 5 }),
    ).resolves.toMatchObject({ tv: 5 });
    expect(users.findOne).toHaveBeenCalledTimes(2);
  });
});

describe('AuthService: password change and logout revoke agent sessions', () => {
  async function setup() {
    const user = agentUser({
      password_hash: await bcrypt.hash('Old-pass-1', 4),
      token_version: 3,
    });
    const usersService = {
      findById: jest.fn().mockResolvedValue(user),
      setPassword: jest.fn().mockResolvedValue(4),
      bumpTokenVersion: jest.fn().mockResolvedValue(undefined),
    };
    const svc = new AuthService(
      usersService as unknown as UsersService,
      jwt,
      {} as Repository<RolePermissionEntity>,
      {} as AgentDirectoryService,
    );
    return { svc, usersService };
  }

  it('a password change bumps the version and returns a token for the new version', async () => {
    const { svc, usersService } = await setup();
    const { accessToken } = await svc.changeAgentPassword(
      11,
      'Old-pass-1',
      'New-pass-22',
    );
    expect(usersService.setPassword).toHaveBeenCalledWith(
      11,
      expect.any(String),
      { bumpTokenVersion: true },
    );
    expect(jwt.decode<AgentJwtPayload>(accessToken)).toMatchObject({
      sub: '11',
      tv: 4,
    });
    // the old token (tv 3) is now refused, the new one accepted
    const after = agentUser({ token_version: 4 });
    expect(() =>
      checkAgentSession(after, { sub: '11', role: AGENT_ROLE, tv: 3 }, '/x'),
    ).toThrow();
    expect(
      checkAgentSession(after, jwt.decode<AgentJwtPayload>(accessToken), '/x')
        .tv,
    ).toBe(4);
  });

  it('logout bumps the version', async () => {
    const { svc, usersService } = await setup();
    await svc.agentLogout(11);
    expect(usersService.bumpTokenVersion).toHaveBeenCalledWith(11);
  });
});
