import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  buildHarness,
  minutesAfter,
  NOW,
  officer,
  TODAY,
} from './testing/harness';

function scenario() {
  const h = buildHarness();
  h.permanent(1, 1);
  h.permanent(2, 2);
  h.permanent(3, 3);
  h.permanent(4, 4);
  h.neighbour(1, 2);
  h.neighbour(1, 4);
  return h;
}

describe('absence → cover flow', () => {
  it('walks the whole lifecycle: absent → ranked → request → accept → requests follow the cover → agent returns → they revert', async () => {
    const h = scenario();

    await h.dispatch.markAbsent(1, 'Fever', officer, NOW);
    const ranked = await h.dispatch.candidates(1, NOW);
    expect(ranked[0].agentId).toBe(2); // the system ranks, it does not assign
    expect((await h.resolver.getAgentForRoute(1, TODAY))?.agentId).toBe(1);

    const req = await h.dispatch.createCoverRequest(
      { routeId: 1, agentId: 2 },
      officer,
      NOW,
    );
    expect(req).toMatchObject({ type: 'COVER', status: 'PENDING', agentId: 2 });
    expect(req.expiresAt).toBe(minutesAfter(NOW, 15).toISOString());
    expect(h.notifier.notifyAgent).toHaveBeenCalledWith(
      2,
      expect.objectContaining({ type: 'cover_request', referenceId: req.id }),
    );
    // PENDING does not move requests yet
    expect((await h.resolver.getAgentForRoute(1, TODAY))?.agentId).toBe(1);

    await h.self.respondToCover(
      h.uid(2),
      req.id,
      'accept',
      minutesAfter(NOW, 3),
    );
    expect(await h.resolver.getAgentForRoute(1, TODAY)).toMatchObject({
      agentId: 2,
      covering: true,
    });

    await h.dispatch.markAvailable(1, officer, minutesAfter(NOW, 120));
    expect(await h.resolver.getAgentForRoute(1, TODAY)).toMatchObject({
      agentId: 1,
      covering: false,
    });
    expect(h.assignments.rows.find((a) => a.id === req.id)?.status).toBe(
      'CANCELLED',
    );
  });

  it('suggests the next candidate when a request is declined', async () => {
    const h = scenario();
    await h.dispatch.markAbsent(1, undefined, officer, NOW);
    const req = await h.dispatch.createCoverRequest(
      { routeId: 1, agentId: 2 },
      officer,
      NOW,
    );
    await h.self.respondToCover(
      h.uid(2),
      req.id,
      'decline',
      minutesAfter(NOW, 2),
    );

    expect(h.assignments.rows.find((a) => a.id === req.id)?.status).toBe(
      'DECLINED',
    );
    const next = await h.dispatch.candidates(1, minutesAfter(NOW, 3));
    expect(next[0].agentId).toBe(4);
    expect(next.at(-1)).toMatchObject({ agentId: 2, previouslyAsked: true });
    expect((await h.resolver.getAgentForRoute(1, TODAY))?.agentId).toBe(1);
  });

  it('expires an unanswered request after the configured timeout (15 min), and it can no longer be accepted', async () => {
    const h = scenario();
    await h.dispatch.markAbsent(1, undefined, officer, NOW);
    const req = await h.dispatch.createCoverRequest(
      { routeId: 1, agentId: 2 },
      officer,
      NOW,
    );

    // 14 min: still waiting
    expect(
      await h.self.myCoverRequests(h.uid(2), minutesAfter(NOW, 14)),
    ).toHaveLength(1);

    // 16 min: expired
    const later = minutesAfter(NOW, 16);
    expect(await h.self.myCoverRequests(h.uid(2), later)).toHaveLength(0);
    expect(h.assignments.rows.find((a) => a.id === req.id)?.status).toBe(
      'EXPIRED',
    );
    await expect(
      h.self.respondToCover(h.uid(2), req.id, 'accept', later),
    ).rejects.toThrow(/expired/i);
    expect((await h.dispatch.candidates(1, later))[0].agentId).toBe(4);
  });

  it('honours a different timeout from settings', async () => {
    const h = scenario();
    h.settings.get.mockResolvedValue({
      coverRequestTimeoutMin: 5,
      shiftStartTime: '06:00',
    });
    const req = await h.dispatch.createCoverRequest(
      { routeId: 1, agentId: 2 },
      officer,
      NOW,
    );
    expect(req.expiresAt).toBe(minutesAfter(NOW, 5).toISOString());
  });

  it('one cover per agent per day: an agent already covering cannot be asked again or accept a second', async () => {
    const h = scenario();
    h.cover(3, 2, 'ACTIVE');
    await expect(
      h.dispatch.createCoverRequest({ routeId: 1, agentId: 2 }, officer, NOW),
    ).rejects.toThrow(ConflictException);

    // two requests out to the same agent can't both be accepted
    const h2 = scenario();
    const first = await h2.dispatch.createCoverRequest(
      { routeId: 1, agentId: 2 },
      officer,
      NOW,
    );
    h2.cover(3, 2, 'PENDING', { expiresAt: minutesAfter(NOW, 10) }); // sneaks in a second pending
    await h2.self.respondToCover(h2.uid(2), first.id, 'accept', NOW);
    const second = h2.assignments.rows.find(
      (a) => a.routeId === 3 && a.agentId === 2 && a.status === 'PENDING',
    )!;
    await expect(
      h2.self.respondToCover(h2.uid(2), second.id, 'accept', NOW),
    ).rejects.toThrow(/one cover per day/i);
  });

  it('refuses a second cover on the same route and an ineligible (absent) candidate', async () => {
    const h = scenario();
    await h.dispatch.createCoverRequest(
      { routeId: 1, agentId: 2 },
      officer,
      NOW,
    );
    await expect(
      h.dispatch.createCoverRequest({ routeId: 1, agentId: 4 }, officer, NOW),
    ).rejects.toThrow(/already has a pending cover/);

    const h2 = scenario();
    h2.absent(2);
    await expect(
      h2.dispatch.createCoverRequest({ routeId: 1, agentId: 2 }, officer, NOW),
    ).rejects.toThrow(ConflictException);
  });

  it('only the addressed agent can answer a cover request', async () => {
    const h = scenario();
    const req = await h.dispatch.createCoverRequest(
      { routeId: 1, agentId: 2 },
      officer,
      NOW,
    );
    await expect(
      h.self.respondToCover(h.uid(4), req.id, 'accept', NOW),
    ).rejects.toThrow(NotFoundException);
  });

  it('an agent marked absent while covering hands that route back', async () => {
    const h = scenario();
    h.cover(1, 2, 'ACTIVE');
    await h.dispatch.markAbsent(2, undefined, officer, NOW);
    expect((await h.resolver.getAgentForRoute(1, TODAY))?.agentId).toBe(1);
  });

  it('records the actions in the dispatch audit history', async () => {
    const h = scenario();
    await h.dispatch.markAbsent(1, 'Fever', officer, NOW);
    await h.dispatch.createCoverRequest(
      { routeId: 1, agentId: 2 },
      officer,
      NOW,
    );
    const calls = h.audit.record.mock.calls as [
      unknown,
      { action: string; module: string },
    ][];
    const actions = calls.map(([, entry]) => [entry.action, entry.module]);
    expect(actions).toEqual([
      ['Marked agent absent', 'Dispatch'],
      ['Sent route cover request', 'Dispatch'],
    ]);
  });
});

describe('route reassignment', () => {
  it('"Today only" creates an immediately-active COVER; tomorrow reverts', async () => {
    const h = scenario();
    const a = await h.dispatch.reassign(
      2,
      { agentId: 5, scope: 'today' },
      officer,
      NOW,
    );
    expect(a).toMatchObject({
      type: 'COVER',
      status: 'ACTIVE',
      validFrom: TODAY,
      validTo: TODAY,
    });
    expect((await h.resolver.getAgentForRoute(2, TODAY))?.agentId).toBe(5);
    expect((await h.resolver.getAgentForRoute(2, '2026-10-10'))?.agentId).toBe(
      2,
    );
    expect(h.notifier.notifyAgent).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ type: 'route_reassigned' }),
    );
  });

  it('"From now on" closes the old permanent (history kept) and starts a new open one', async () => {
    const h = scenario();
    const a = await h.dispatch.reassign(
      2,
      { agentId: 5, scope: 'permanent' },
      officer,
      NOW,
    );
    expect(a).toMatchObject({
      type: 'PERMANENT',
      status: 'ACTIVE',
      validTo: null,
    });
    expect((await h.resolver.getAgentForRoute(2, TODAY))?.agentId).toBe(5);
    expect((await h.resolver.getAgentForRoute(2, '2026-10-08'))?.agentId).toBe(
      2,
    ); // yesterday: still the old owner
    const old = h.assignments.rows.find(
      (r) => r.agentId === 2 && r.type === 'PERMANENT',
    )!;
    expect(old.validTo).toBe('2026-10-08');
  });

  it('a permanent change also drops covers that stood in for the old owner', async () => {
    const h = scenario();
    h.cover(2, 3, 'ACTIVE');
    await h.dispatch.reassign(
      2,
      { agentId: 5, scope: 'permanent' },
      officer,
      NOW,
    );
    expect((await h.resolver.getAgentForRoute(2, TODAY))?.agentId).toBe(5);
  });

  it('is blocked once the route has started collecting today', async () => {
    const h = scenario();
    h.record({ routeId: 2, agentId: 2, kg: 80, status: 'collected' });
    await expect(
      h.dispatch.reassign(2, { agentId: 5, scope: 'today' }, officer, NOW),
    ).rejects.toThrow(/already started collecting/);
    await expect(
      h.dispatch.reassign(2, { agentId: 5, scope: 'permanent' }, officer, NOW),
    ).rejects.toThrow(ConflictException);
    expect((await h.resolver.getAgentForRoute(2, TODAY))?.agentId).toBe(2); // unchanged
  });

  it('is allowed while the route’s stops are all still pending', async () => {
    const h = scenario();
    h.record({ routeId: 2, kg: 80, status: 'approved' });
    await expect(
      h.dispatch.reassign(2, { agentId: 5, scope: 'today' }, officer, NOW),
    ).resolves.toBeDefined();
  });

  it('refuses to give a permanent route to an agent who already owns one', async () => {
    const h = scenario();
    await expect(
      h.dispatch.reassign(2, { agentId: 3, scope: 'permanent' }, officer, NOW),
    ).rejects.toThrow(/already owns another route/);
  });

  it('refuses an absent target and a no-op reassignment', async () => {
    const h = scenario();
    h.absent(5);
    await expect(
      h.dispatch.reassign(2, { agentId: 5, scope: 'today' }, officer, NOW),
    ).rejects.toThrow(/absent/);
    await expect(
      h.dispatch.reassign(2, { agentId: 2, scope: 'today' }, officer, NOW),
    ).rejects.toThrow(/already handles/);
  });

  it('keeps the one-cover rule for "today only" too', async () => {
    const h = scenario();
    h.cover(3, 5, 'ACTIVE');
    await expect(
      h.dispatch.reassign(2, { agentId: 5, scope: 'today' }, officer, NOW),
    ).rejects.toThrow(/one cover per day/);
  });
});

describe('dispatch board', () => {
  it('shows each agent’s route, "Covering Route X", kg collected and status', async () => {
    const h = scenario();
    h.cover(1, 2, 'ACTIVE');
    await h.dispatch.markAbsent(1, undefined, officer, NOW);
    h.shift(2, minutesAfter(NOW, -60));
    h.record({ routeId: 1, agentId: 2, kg: 120, status: 'collected' });
    h.record({ routeId: 1, kg: 60, status: 'approved' });
    h.record({ routeId: 2, kg: 90, status: 'approved' });

    const board = await h.dispatch.board(NOW);
    const a1 = board.agents.find((a) => a.agentId === 1)!;
    const a2 = board.agents.find((a) => a.agentId === 2)!;

    expect(a1.status).toBe('Absent');
    expect(a2).toMatchObject({
      status: 'Covering',
      routeName: 'Route 2',
      coveringRouteName: 'Route 1',
      kgCollected: 120,
      stopsDone: 1,
      stopsTotal: 3, // Route 1 (2 stops) + own Route 2 (1 stop)
    });
    expect(board.routes.find((r) => r.routeId === 1)).toMatchObject({
      agentId: 2,
      covered: true,
    });
  });

  it('shows how fresh a location is and never invents one', async () => {
    const h = scenario();
    h.shift(2, minutesAfter(NOW, -60));
    await h.cache.setLatest(2, {
      lat: 7.2,
      lng: 80.7,
      recordedAt: minutesAfter(NOW, -12).toISOString(),
      source: 'ping',
    });
    const board = await h.dispatch.board(NOW);
    expect(board.agents.find((a) => a.agentId === 2)).toMatchObject({
      freshness: 'recent',
      ageMin: 12,
      position: { lat: 7.2, lng: 80.7 },
    });
    expect(board.agents.find((a) => a.agentId === 3)).toMatchObject({
      freshness: 'none',
      position: null,
      lastSeen: null,
    });
  });

  it('flags agents with a route who have not checked in after the shift-start cutoff (an alert, not absence)', async () => {
    const h = scenario();
    h.shift(2, minutesAfter(NOW, -30)); // started
    h.absent(3); // absent — not "missed"
    const board = await h.dispatch.board(NOW); // 09:30 > 06:00
    expect(board.missedCheckins.map((m) => m.agentId).sort()).toEqual([1, 4]);
    expect(board.agents.find((a) => a.agentId === 1)?.absent).toBe(false);
  });

  it('reports per-route progress and today’s cover outcomes (pending / declined / expired), not yesterday’s', async () => {
    const h = scenario();
    h.record({ routeId: 2, agentId: 2, kg: 80, status: 'collected' });
    h.record({ routeId: 2, kg: 60, status: 'approved' });
    h.cover(1, 2, 'PENDING', {
      expiresAt: minutesAfter(NOW, 10),
      createdBy: 'S. Fernando',
    });
    h.cover(3, 4, 'DECLINED');
    h.cover(3, 5, 'EXPIRED', {
      validFrom: '2026-10-08',
      validTo: '2026-10-08',
    }); // yesterday
    h.cover(4, 5, 'ACTIVE'); // an active cover is not an "outstanding request"

    const board = await h.dispatch.board(NOW);

    expect(board.routes.find((r) => r.routeId === 2)).toMatchObject({
      stopsDone: 1,
      stopsTotal: 2,
    });
    expect(
      board.coverRequests.map((c) => [c.routeName, c.agentName, c.status]),
    ).toEqual([
      ['Route 3', 'N. Perera', 'DECLINED'],
      ['Route 1', 'W. Gunaratne', 'PENDING'],
    ]);
  });

  it('raises no alert before the cutoff', async () => {
    const h = scenario();
    const early = new Date('2026-10-08T22:00:00Z'); // 03:30 Colombo
    expect(await h.dispatch.missedCheckins(early)).toEqual([]);
  });
});

describe('estate-first exception entry helper', () => {
  const seedEstate = (
    h: ReturnType<typeof scenario>,
    o: Record<string, unknown> = {},
  ) =>
    h.estates.seed({
      id: 7,
      name: 'Hilltop Estate',
      routeId: 2,
      routeName: 'Route 2',
      selfDelivery: false,
      ...o,
    } as never);

  it('returns the estate’s route and the agent handling it today', async () => {
    const h = scenario();
    seedEstate(h);
    expect(await h.dispatch.routeAgentForEstate(7, TODAY)).toMatchObject({
      routeId: 2,
      routeName: 'Route 2',
      agent: { agentId: 2, name: 'W. Gunaratne', covering: false },
    });
  });

  it('says "covering" and names the cover agent while a cover is active', async () => {
    const h = scenario();
    seedEstate(h);
    h.cover(2, 5, 'ACTIVE');
    expect((await h.dispatch.routeAgentForEstate(7, TODAY)).agent).toEqual({
      agentId: 5,
      name: 'D. Silva',
      covering: true,
    });
    // tomorrow the cover is gone
    expect(
      (await h.dispatch.routeAgentForEstate(7, '2026-10-10')).agent?.covering,
    ).toBe(false);
  });

  it('has no agent for a self-delivering estate or a route nobody covers', async () => {
    const h = scenario();
    seedEstate(h, { selfDelivery: true });
    expect((await h.dispatch.routeAgentForEstate(7, TODAY)).agent).toBeNull();
    const h2 = buildHarness();
    seedEstate(h2);
    expect((await h2.dispatch.routeAgentForEstate(7, TODAY)).agent).toBeNull();
  });

  it('404s for an unknown estate', async () => {
    const h = scenario();
    await expect(h.dispatch.routeAgentForEstate(99, TODAY)).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('agents come from employees (registration → dispatch board)', () => {
  it('a newly registered agent appears on the board: Not started, Unassigned (no route)', async () => {
    const h = scenario();
    h.registerAgent(6, 'P. Fernando');
    const board = await h.dispatch.board(NOW);
    const agent = board.agents.find((a) => a.name === 'P. Fernando')!;
    expect(agent).toMatchObject({
      employeeId: 'EMP-0006',
      status: 'Not started',
      routeId: null,
      routeName: null,
      coveringRouteId: null,
      stopsTotal: 0,
    });
  });

  it('an Inactive or Suspended employee does not appear', async () => {
    const h = scenario();
    h.setEmployee(2, { status: 'Inactive' });
    h.setEmployee(3, { status: 'Suspended' });
    const ids = (await h.dispatch.board(NOW)).agents.map((a) => a.agentId);
    expect(ids).toEqual([1, 4, 5]);
  });

  it('an unassigned agent can be given a route through the existing reassign flow', async () => {
    const h = scenario();
    h.registerAgent(6, 'P. Fernando');
    await h.dispatch.reassign(
      2,
      { agentId: 5, scope: 'permanent' },
      officer,
      NOW,
    ); // frees nothing relevant
    const a = await h.dispatch.reassign(
      2,
      { agentId: 6, scope: 'permanent' },
      officer,
      NOW,
    );
    expect(a).toMatchObject({
      agentId: 6,
      type: 'PERMANENT',
      status: 'ACTIVE',
    });
    const board = await h.dispatch.board(NOW);
    expect(board.agents.find((x) => x.agentId === 6)).toMatchObject({
      routeId: 2,
      routeName: 'Route 2',
    });
  });

  it('a deactivated agent is no longer a cover candidate or reassign target', async () => {
    const h = scenario();
    h.setEmployee(2, { status: 'Inactive' });
    expect(
      (await h.dispatch.candidates(1, NOW)).map((c) => c.agentId),
    ).not.toContain(2);
    await expect(
      h.dispatch.reassign(3, { agentId: 2, scope: 'today' }, officer, NOW),
    ).rejects.toThrow(NotFoundException);
  });
});
