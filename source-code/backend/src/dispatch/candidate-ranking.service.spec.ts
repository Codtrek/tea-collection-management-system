import { buildHarness, minutesAfter, NOW, TODAY } from './testing/harness';

/** Routes 1–4. Agent 1 owns Route 1 (the one needing cover); 2 & 4 own neighbours; 3 owns a far route. */
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

describe('CandidateRankingService.rank', () => {
  it('ranks neighbouring routes first, then fewest remaining stops', async () => {
    const h = scenario();
    h.record({ routeId: 2, kg: 50, status: 'approved' }); // Route 2: 1 stop left
    h.record({ routeId: 4, kg: 50, status: 'approved' });
    h.record({ routeId: 4, kg: 50, status: 'approved' });
    h.record({ routeId: 4, kg: 50, status: 'approved' }); // Route 4: 3 stops left
    // Route 3 (not a neighbour) has nothing left — but proximity outranks workload

    const ranked = await h.ranking.rank(1, TODAY);

    expect(ranked.map((c) => c.agentId)).toEqual([2, 4, 3, 5]);
    expect(ranked[0]).toMatchObject({ neighbour: true, remainingStops: 1 });
    expect(ranked[1]).toMatchObject({ neighbour: true, remainingStops: 3 });
    expect(ranked[2]).toMatchObject({ neighbour: false, ownRouteId: 3 });
    // agent 5 has no route of their own: zero load, not a neighbour
    expect(ranked[3]).toMatchObject({ ownRouteId: null, remainingStops: 0 });
  });

  it('never offers the route’s own agent', async () => {
    const h = scenario();
    expect(
      (await h.ranking.rank(1, TODAY)).map((c) => c.agentId),
    ).not.toContain(1);
  });

  it('excludes absent agents', async () => {
    const h = scenario();
    h.absent(2);
    expect(
      (await h.ranking.rank(1, TODAY)).map((c) => c.agentId),
    ).not.toContain(2);
  });

  it('excludes agents who have finished their shift', async () => {
    const h = scenario();
    h.shift(2, minutesAfter(NOW, -240), minutesAfter(NOW, -10));
    expect(
      (await h.ranking.rank(1, TODAY)).map((c) => c.agentId),
    ).not.toContain(2);
  });

  it('keeps agents who are mid-shift or have not started', async () => {
    const h = scenario();
    h.shift(2, minutesAfter(NOW, -30));
    expect((await h.ranking.rank(1, TODAY)).map((c) => c.agentId)).toContain(2);
  });

  it('one-cover rule: excludes an agent already covering another route today', async () => {
    const h = scenario();
    h.cover(3, 2, 'ACTIVE'); // agent 2 already covers Route 3
    expect(
      (await h.ranking.rank(1, TODAY)).map((c) => c.agentId),
    ).not.toContain(2);
  });

  it('one-cover rule: a PENDING request to someone also counts', async () => {
    const h = scenario();
    h.cover(3, 4, 'PENDING', { expiresAt: minutesAfter(NOW, 10) });
    expect(
      (await h.ranking.rank(1, TODAY)).map((c) => c.agentId),
    ).not.toContain(4);
  });

  it('a cover from yesterday does not exclude anyone today', async () => {
    const h = scenario();
    h.cover(3, 2, 'ACTIVE', { validFrom: '2026-10-08', validTo: '2026-10-08' });
    expect((await h.ranking.rank(1, TODAY)).map((c) => c.agentId)).toContain(2);
  });

  it('excludes agents flagged unavailable', async () => {
    const h = scenario();
    h.setAvailable(2, false);
    expect(
      (await h.ranking.rank(1, TODAY)).map((c) => c.agentId),
    ).not.toContain(2);
  });

  describe('workload & the soft ceiling', () => {
    it('expected load is the average of the days the route delivered in the last 30 days', async () => {
      const h = scenario();
      h.record({ routeId: 1, kg: 100, date: '2026-10-05', agentId: 1 });
      h.record({ routeId: 1, kg: 200, date: '2026-10-06', agentId: 1 });
      h.record({ routeId: 1, kg: 999, date: '2026-08-01', agentId: 1 }); // outside the window
      expect(await h.load.expectedRouteKg(1, TODAY)).toBe(150);
    });

    it('warns (never blocks) when own + cover load exceeds the agent’s recent best day', async () => {
      const h = scenario();
      // Route 1 normally delivers 150 kg
      h.record({ routeId: 1, kg: 100, date: '2026-10-05', agentId: 1 });
      h.record({ routeId: 1, kg: 200, date: '2026-10-06', agentId: 1 });
      // Agent 2's Route 2 delivers 200 kg a day; their best-ever recent day is 300 kg
      h.record({ routeId: 2, kg: 200, date: '2026-10-05', agentId: 2 });
      h.record({ routeId: 2, kg: 300, date: '2026-10-07', agentId: 2 });
      // Agent 4: light route, higher ceiling
      h.record({ routeId: 4, kg: 50, date: '2026-10-05', agentId: 4 });
      h.record({ routeId: 4, kg: 500, date: '2026-10-07', agentId: 4 });

      const ranked = await h.ranking.rank(1, TODAY);
      const a2 = ranked.find((c) => c.agentId === 2)!;
      const a4 = ranked.find((c) => c.agentId === 4)!;

      expect(a2.coverExpectedKg).toBe(150);
      expect(a2.ownExpectedKg).toBe(250); // (200 + 300) / 2
      expect(a2.ceilingKg).toBe(300);
      expect(a2.overCeiling).toBe(true); // 250 + 150 > 300 …
      expect(ranked.map((c) => c.agentId)).toContain(2); // … but still a candidate
      expect(a4.overCeiling).toBe(false); // 275 + 150 < 500
    });

    it('no history means no ceiling to exceed', async () => {
      const h = scenario();
      const c = (await h.ranking.rank(1, TODAY)).find((x) => x.agentId === 2)!;
      expect(c.ceilingKg).toBe(0);
      expect(c.overCeiling).toBe(false);
    });
  });

  it('after a decline or timeout, the same agent drops to the bottom so the next candidate is suggested', async () => {
    const h = scenario();
    h.cover(1, 2, 'DECLINED');
    const ranked = await h.ranking.rank(1, TODAY);
    expect(ranked[0].agentId).toBe(4); // next neighbour
    expect(ranked.at(-1)).toMatchObject({ agentId: 2, previouslyAsked: true });
  });
});
