import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { JwtService } from '@nestjs/jwt';
import type { ThrottlerStorage } from '@nestjs/throttler';
import { IdentityThrottlerGuard } from './identity-throttler.guard';

/** Which bucket a request counts against (Users-Roles-Addendum §4a). */
describe('IdentityThrottlerGuard buckets', () => {
  const jwt = {
    verifyAsync: jest.fn((token: string) =>
      token === 'good'
        ? Promise.resolve({ sub: '42' })
        : Promise.reject(new Error('bad')),
    ),
  } as unknown as JwtService;
  const guard = new IdentityThrottlerGuard(
    { throttlers: [] },
    {} as ThrottlerStorage,
    new Reflector(),
    jwt,
  ) as unknown as {
    getTracker(req: Record<string, unknown>): Promise<string>;
    generateKey(ctx: ExecutionContext, tracker: string, name: string): string;
  };
  const ctx = {} as ExecutionContext;

  const keys = async (req: Record<string, unknown>) => {
    const t = await guard.getTracker({ ip: '10.0.0.1', ...req });
    return Object.fromEntries(
      ['short', 'medium', 'long', 'auth'].map((n) => [
        n,
        guard.generateKey(ctx, t, n),
      ]),
    );
  };

  it('a signed-in user gets their own short, medium and long buckets (not the shared NAT address)', async () => {
    expect(
      await keys({ headers: { authorization: 'Bearer good' } }),
    ).toMatchObject({
      short: 'identity:short:user:42',
      medium: 'identity:medium:user:42',
      long: 'identity:long:user:42',
    });
  });

  it('before sign-in (or with a bad token) medium and long count per IP', async () => {
    for (const req of [{}, { headers: { authorization: 'Bearer forged' } }]) {
      expect(await keys(req)).toMatchObject({
        short: 'identity:short:ip:10.0.0.1',
        medium: 'identity:medium:ip:10.0.0.1',
        long: 'identity:long:ip:10.0.0.1',
      });
    }
  });

  it('sign-in attempts count per IP + account', async () => {
    const k = await keys({ body: { phone: ' 0771234567 ' } });
    expect(k.auth).toMatch(/^identity:auth:account:10\.0\.0\.1:[0-9a-f]{64}$/);
    expect(k.short).toMatch(/^identity:short:account:/);
  });
});
