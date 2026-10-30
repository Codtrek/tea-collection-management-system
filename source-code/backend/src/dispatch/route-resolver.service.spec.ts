import { pickResponsible } from './route-resolver.service';
import { buildHarness, minutesAfter, NOW, TODAY } from './testing/harness';

describe('RouteResolverService.getAgentForRoute', () => {
  it('returns null when nobody is assigned', async () => {
    const h = buildHarness();
    expect(await h.resolver.getAgentForRoute(1, TODAY)).toBeNull();
  });

  it('resolves the permanent agent', async () => {
    const h = buildHarness();
    h.permanent(1, 1);
    expect(await h.resolver.getAgentForRoute(1, TODAY)).toMatchObject({
      agentId: 1,
      type: 'PERMANENT',
      covering: false,
    });
  });

  it('an ACTIVE cover takes priority over the permanent agent', async () => {
    const h = buildHarness();
    h.permanent(1, 1);
    h.cover(1, 2, 'ACTIVE');
    expect(await h.resolver.getAgentForRoute(1, TODAY)).toMatchObject({
      agentId: 2,
      type: 'COVER',
      covering: true,
    });
  });

  it('falls back to the permanent agent once the cover’s window has passed (cover ends with the day)', async () => {
    const h = buildHarness();
    h.permanent(1, 1);
    h.cover(1, 2, 'ACTIVE');
    expect((await h.resolver.getAgentForRoute(1, '2026-10-10'))?.agentId).toBe(
      1,
    );
    expect((await h.resolver.getAgentForRoute(1, '2026-10-08'))?.agentId).toBe(
      1,
    );
  });

  it.each(['PENDING', 'DECLINED', 'EXPIRED', 'CANCELLED'] as const)(
    'a %s cover never resolves — the permanent agent keeps the route',
    async (status) => {
      const h = buildHarness();
      h.permanent(1, 1);
      h.cover(1, 2, status);
      expect((await h.resolver.getAgentForRoute(1, TODAY))?.agentId).toBe(1);
    },
  );

  it('a replaced permanent stays date-resolvable for the period it was in force', async () => {
    const h = buildHarness();
    h.permanent(1, 1, { validTo: '2026-10-08' });
    h.permanent(1, 5, { validFrom: TODAY });
    expect((await h.resolver.getAgentForRoute(1, '2026-10-08'))?.agentId).toBe(
      1,
    );
    expect((await h.resolver.getAgentForRoute(1, TODAY))?.agentId).toBe(5);
  });

  it('resolves many routes in one pass', async () => {
    const h = buildHarness();
    h.permanent(1, 1);
    h.permanent(2, 2);
    h.cover(2, 3, 'ACTIVE');
    const map = await h.resolver.getAgentsForRoutes([1, 2, 3], TODAY);
    expect(map.get(1)?.agentId).toBe(1);
    expect(map.get(2)?.agentId).toBe(3);
    expect(map.get(3)).toBeNull();
  });

  it('pickResponsible is a pure rule (cover > permanent > null)', () => {
    const rows = [
      {
        id: 1,
        agentId: 1,
        type: 'PERMANENT' as const,
        validFrom: '2026-01-01',
        validTo: null,
      },
      {
        id: 2,
        agentId: 2,
        type: 'COVER' as const,
        validFrom: TODAY,
        validTo: TODAY,
      },
    ];
    expect(pickResponsible(rows, TODAY)?.agentId).toBe(2);
    expect(pickResponsible(rows, '2026-10-10')?.agentId).toBe(1);
    expect(pickResponsible([], TODAY)).toBeNull();
  });
});

describe('RouteResolverService.expireStale', () => {
  it('expires only PENDING covers past their timeout', async () => {
    const h = buildHarness();
    const overdue = h.cover(1, 2, 'PENDING', {
      expiresAt: minutesAfter(NOW, -1),
    });
    const waiting = h.cover(2, 3, 'PENDING', {
      expiresAt: minutesAfter(NOW, 10),
    });
    const active = h.cover(3, 4, 'ACTIVE', {
      expiresAt: minutesAfter(NOW, -60),
    });

    const expired = await h.resolver.expireStale(NOW);

    expect(expired).toEqual([overdue]);
    expect(overdue.status).toBe('EXPIRED');
    expect(overdue.respondedAt).toEqual(NOW);
    expect(waiting.status).toBe('PENDING');
    expect(active.status).toBe('ACTIVE');
  });
});
