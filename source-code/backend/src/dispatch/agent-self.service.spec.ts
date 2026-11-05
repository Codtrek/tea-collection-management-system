import { ConflictException, ForbiddenException } from '@nestjs/common';
import { buildHarness, minutesAfter, NOW, TODAY } from './testing/harness';

const ping = (
  at: Date,
  lat = 7.2,
  lng = 80.7,
  source?: 'ping' | 'checkin',
) => ({
  recordedAt: at.toISOString(),
  lat,
  lng,
  source,
});

describe('AgentSelfService — shift & location pings', () => {
  it('rejects pings when no shift is active — there is no tracking off-shift', async () => {
    const h = buildHarness();
    const res = await h.self.ingestPings(
      h.uid(1),
      [ping(NOW)],
      minutesAfter(NOW, 1),
    );
    expect(res).toEqual({
      accepted: 0,
      rejected: 1,
      reasons: { outside_shift: 1 },
    });
    expect(h.pings.rows).toHaveLength(0);
    expect(await h.cache.getLatest(1)).toBeNull();
  });

  it('accepts pings recorded during the shift and caches the NEWEST by device time', async () => {
    const h = buildHarness();
    await h.self.startShift(h.uid(1), NOW);
    const batch = [
      ping(minutesAfter(NOW, 6), 7.3, 80.8),
      ping(minutesAfter(NOW, 2), 7.1, 80.6),
      ping(minutesAfter(NOW, 4), 7.2, 80.7, 'checkin'),
    ]; // out of order, as an offline queue would drain
    const res = await h.self.ingestPings(
      h.uid(1),
      batch,
      minutesAfter(NOW, 10),
    );

    expect(res).toMatchObject({ accepted: 3, rejected: 0 });
    expect(h.pings.rows).toHaveLength(3);
    expect(await h.cache.getLatest(1)).toMatchObject({ lat: 7.3, lng: 80.8 });
  });

  it('keeps the device’s recorded time and stamps the server receive time separately', async () => {
    const h = buildHarness();
    await h.self.startShift(h.uid(1), NOW);
    const recorded = minutesAfter(NOW, 5);
    const received = minutesAfter(NOW, 45); // uploaded 40 min later after a dead zone
    await h.self.ingestPings(h.uid(1), [ping(recorded)], received);
    expect(h.pings.rows[0].recordedAt).toEqual(recorded);
    expect(h.pings.rows[0].receivedAt).toEqual(received);
  });

  it('a late batch from inside the shift is still accepted after the shift ended; off-shift fixes are not', async () => {
    const h = buildHarness();
    await h.self.startShift(h.uid(1), NOW);
    await h.self.endShift(h.uid(1), minutesAfter(NOW, 60));
    const res = await h.self.ingestPings(
      h.uid(1),
      [
        ping(minutesAfter(NOW, 30)),
        ping(minutesAfter(NOW, 90)),
        ping(minutesAfter(NOW, -10)),
      ],
      minutesAfter(NOW, 120),
    );
    expect(res.accepted).toBe(1);
    expect(res.reasons).toEqual({ outside_shift: 2 });
  });

  it('rejects fixes stamped in the future (device clock skew)', async () => {
    const h = buildHarness();
    await h.self.startShift(h.uid(1), NOW);
    const res = await h.self.ingestPings(
      h.uid(1),
      [ping(minutesAfter(NOW, 60))],
      minutesAfter(NOW, 1),
    );
    expect(res.reasons).toEqual({ in_future: 1 });
  });

  it('a stale batch never overwrites a newer cached position', async () => {
    const h = buildHarness();
    await h.self.startShift(h.uid(1), NOW);
    await h.self.ingestPings(
      h.uid(1),
      [ping(minutesAfter(NOW, 20), 7.5, 80.5)],
      minutesAfter(NOW, 21),
    );
    await h.self.ingestPings(
      h.uid(1),
      [ping(minutesAfter(NOW, 5), 7.0, 80.0)],
      minutesAfter(NOW, 22),
    );
    expect(await h.cache.getLatest(1)).toMatchObject({ lat: 7.5 });
  });

  it('starting a shift is idempotent; ending then restarting is refused; absent agents cannot start', async () => {
    const h = buildHarness();
    const a = await h.self.startShift(h.uid(1), NOW);
    const b = await h.self.startShift(h.uid(1), minutesAfter(NOW, 5));
    expect(b.shiftStartedAt).toBe(a.shiftStartedAt);
    await h.self.endShift(h.uid(1), minutesAfter(NOW, 30));
    await expect(
      h.self.startShift(h.uid(1), minutesAfter(NOW, 40)),
    ).rejects.toThrow(ConflictException);

    await h.self.reportAbsence(h.uid(2), 'Sick', NOW);
    await expect(h.self.startShift(h.uid(2), NOW)).rejects.toThrow(/absent/);
  });

  it('only collection agents can use the agent API', async () => {
    const h = buildHarness();
    await expect(h.self.startShift(999, NOW)).rejects.toThrow(
      ForbiddenException,
    );
  });
});

describe('AgentSelfService — absence, stops', () => {
  it('self-reported absence is recorded as source "self"', async () => {
    const h = buildHarness();
    await h.self.reportAbsence(h.uid(1), 'Family emergency', NOW);
    expect(h.dayStatus.rows[0]).toMatchObject({
      agentId: 1,
      status: 'ABSENT',
      source: 'self',
      reason: 'Family emergency',
    });
  });

  it('reporting available again ends covers on the agent’s own route', async () => {
    const h = buildHarness();
    h.permanent(1, 1);
    h.cover(1, 2, 'ACTIVE');
    await h.self.reportAbsence(h.uid(1), undefined, NOW);
    await h.self.reportAvailable(h.uid(1), minutesAfter(NOW, 30));
    expect((await h.resolver.getAgentForRoute(1, TODAY))?.agentId).toBe(1);
  });

  it('"my stops" follows the resolver: a cover agent sees the covered route’s stops, the absent owner sees none', async () => {
    const h = buildHarness();
    h.permanent(1, 1);
    h.permanent(2, 2);
    h.cover(1, 2, 'ACTIVE');
    h.record({ routeId: 1, kg: 70, status: 'approved' });
    h.record({ routeId: 2, kg: 40, status: 'approved' });

    const cover = await h.self.myStops(h.uid(2), NOW);
    expect(cover.routes.map((r) => r.id).sort()).toEqual([1, 2]);
    expect(cover.stops.find((s) => s.routeId === 1)?.covering).toBe(true);

    const owner = await h.self.myStops(h.uid(1), NOW);
    expect(owner.stops).toEqual([]);
  });
});

describe('AgentSelfService — login state is enforced on every call', () => {
  it('blocks the agent API while the one-time temporary password is still in use', async () => {
    const h = buildHarness();
    h.setLogin(1, { must_change_password: true });
    await expect(h.self.startShift(h.uid(1), NOW)).rejects.toThrow(
      /temporary password/i,
    );
    await expect(h.self.myCoverRequests(h.uid(1), NOW)).rejects.toThrow(
      ForbiddenException,
    );
    h.setLogin(1, { must_change_password: false }); // after the change
    await expect(h.self.startShift(h.uid(1), NOW)).resolves.toBeDefined();
  });

  it('a suspended login stops working immediately, even with a still-valid token', async () => {
    const h = buildHarness();
    await h.self.startShift(h.uid(2), NOW);
    h.setLogin(2, { status: 'suspended' });
    await expect(
      h.self.ingestPings(h.uid(2), [ping(NOW)], NOW),
    ).rejects.toThrow(/suspended/);
  });

  it('a deactivated agent can no longer use the agent API', async () => {
    const h = buildHarness();
    h.setEmployee(3, { status: 'Inactive' });
    await expect(h.self.startShift(h.uid(3), NOW)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
