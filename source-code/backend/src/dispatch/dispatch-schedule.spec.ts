import { ConflictException } from '@nestjs/common';
import {
  buildHarness,
  minutesAfter,
  NOW,
  officer,
  TODAY,
} from './testing/harness';

/**
 * Route-Schedule-Addendum §5 — dispatch on scheduled dates only. TODAY (2026-10-09) is a
 * Friday. Agent 1 holds Routes 1 (Mon/Thu) and 2 (Tue/Fri); agent 3 holds Route 3 (Fri);
 * agent 4 holds Route 4 (every day, the harness default); agent 5 holds nothing.
 */
const MON = 1;
const TUE = 2;
const THU = 4;
const FRI = 5;

function scenario() {
  const h = buildHarness();
  h.permanent(1, 1);
  h.permanent(2, 1);
  h.permanent(3, 3);
  h.permanent(4, 4);
  h.pattern(1, [MON, THU]);
  h.pattern(2, [TUE, FRI]);
  h.pattern(3, [FRI]);
  h.neighbour(1, 3);
  return h;
}

describe('dispatch board with route schedules', () => {
  it('shows an unscheduled route as not scheduled, with no agent and no stops', async () => {
    const h = scenario();
    h.record({ routeId: 1, kg: 50, status: 'approved' }); // a stray record on a non-run day
    const board = await h.dispatch.board(NOW);
    expect(board.routes.find((r) => r.routeId === 1)).toMatchObject({
      scheduled: false,
      nextCollectionDay: '2026-10-12',
      agentId: null,
      agentName: null,
      stopsTotal: 0,
    });
    expect(board.routes.find((r) => r.routeId === 2)).toMatchObject({
      scheduled: true,
      agentId: 1,
    });
  });

  it('lists each agent’s scheduled route for the date, and all routes he holds', async () => {
    const h = scenario();
    const today = await h.dispatch.board(NOW);
    expect(today.agents.find((a) => a.agentId === 1)).toMatchObject({
      routeId: 2,
      routeName: 'Route 2',
      ownRoutes: [
        { routeId: 1, name: 'Route 1' },
        { routeId: 2, name: 'Route 2' },
      ],
      scheduledRoutes: [{ routeId: 2, name: 'Route 2', covering: false }],
    });

    // Monday: agent 1 runs Route 1, and agent 3 (Friday-only) has nothing to run
    const monday = await h.dispatch.board(NOW, '2026-10-12');
    expect(monday.date).toBe('2026-10-12');
    expect(monday.agents.find((a) => a.agentId === 1)).toMatchObject({
      routeId: 1,
      scheduledRoutes: [{ routeId: 1, name: 'Route 1', covering: false }],
    });
    expect(monday.agents.find((a) => a.agentId === 3)).toMatchObject({
      routeId: null,
      scheduledRoutes: [],
      status: 'Not scheduled',
    });
    // an agent with no routes at all is still just "Not started" (shown as Unassigned)
    expect(monday.agents.find((a) => a.agentId === 5)?.status).toBe(
      'Not started',
    );
    // missed check-ins are a today-only alert
    expect(monday.missedCheckins).toEqual([]);
  });

  it('only raises missed check-ins for agents with a route scheduled today', async () => {
    const h = scenario();
    h.pattern(4, [MON]); // agent 4's route doesn't run today
    const board = await h.dispatch.board(NOW); // 09:30 > 06:00 cutoff
    expect(board.missedCheckins.map((m) => m.agentId).sort()).toEqual([1, 3]);
  });
});

describe('covers and reassignment on scheduled dates', () => {
  it('refuses cover candidates, a cover request and a today-only reassignment for a route not scheduled today', async () => {
    const h = scenario();
    await h.dispatch.markAbsent(1, 'Fever', officer, NOW);
    await expect(h.dispatch.candidates(1, NOW)).rejects.toThrow(
      /Route 1 isn't scheduled today \(next collection day: 2026-10-12\)/,
    );
    await expect(
      h.dispatch.createCoverRequest({ routeId: 1, agentId: 5 }, officer, NOW),
    ).rejects.toThrow(ConflictException);
    await expect(
      h.dispatch.reassign(1, { agentId: 5, scope: 'today' }, officer, NOW),
    ).rejects.toThrow(/isn't scheduled today/);
  });

  it('allows a cover for the absent agent’s route that does run today, ranking the free agent first', async () => {
    const h = scenario();
    await h.dispatch.markAbsent(1, 'Fever', officer, NOW);
    const ranked = await h.dispatch.candidates(2, NOW);
    // agents 2 and 5 hold no route that runs today; agent 3 runs Route 3 (a neighbour of nothing here)
    expect(ranked.map((c) => [c.agentId, c.free])).toEqual([
      [2, true],
      [5, true],
      [3, false],
      [4, false],
    ]);
    const req = await h.dispatch.createCoverRequest(
      { routeId: 2, agentId: 5 },
      officer,
      NOW,
    );
    expect(req).toMatchObject({ type: 'COVER', status: 'PENDING' });
  });

  it('one cover per agent per date, on top of his own scheduled route', async () => {
    const h = scenario();
    await h.dispatch.markAbsent(1, undefined, officer, NOW);
    await h.dispatch.reassign(2, { agentId: 3, scope: 'today' }, officer, NOW);
    // agent 3 runs Route 3 and now covers Route 2 — he can't take a second cover today
    await h.dispatch.markAbsent(4, undefined, officer, minutesAfter(NOW, 1));
    const ids = (await h.dispatch.candidates(4, minutesAfter(NOW, 2))).map(
      (c) => c.agentId,
    );
    expect(ids).not.toContain(3);
    expect(ids).toContain(5);
  });
});

describe('exception entry and the agent’s stops', () => {
  const seedEstate = (h: ReturnType<typeof buildHarness>) =>
    h.estates.seed({
      id: 7,
      name: 'Hilltop Estate',
      routeId: 1,
      routeName: 'Route 1',
      selfDelivery: false,
    } as never);

  it('shows the next scheduled date and its agent when the route doesn’t run that day', async () => {
    const h = scenario();
    seedEstate(h);
    expect(await h.dispatch.routeAgentForEstate(7, TODAY)).toMatchObject({
      routeId: 1,
      scheduled: false,
      nextScheduledDate: '2026-10-12',
      nextAgent: { agentId: 1, name: 'R. Senanayake', covering: false },
      agent: null,
    });
    expect(await h.dispatch.routeAgentForEstate(7, '2026-10-12')).toMatchObject(
      {
        scheduled: true,
        nextScheduledDate: null,
        agent: { agentId: 1 },
      },
    );
  });

  it('lists only the agent’s routes that run today', async () => {
    const h = scenario();
    h.record({ routeId: 1, kg: 30, status: 'approved' });
    h.record({ routeId: 2, kg: 40, status: 'approved' });
    const mine = await h.self.myStops(h.uid(1), NOW);
    expect(mine.routes.map((r) => r.id)).toEqual([2]);
    expect(mine.stops.map((s) => s.routeId)).toEqual([2]);
  });
});
