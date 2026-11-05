import { AgentHistoryService } from './agent-history.service';
import { buildHarness, NOW, TODAY } from './testing/harness';
import type { CollectionRecordEntity } from '../collections/collection-record.entity';
import type { DeliveryGradeLineEntity } from '../collections/delivery-grade-line.entity';
import type { Repository } from 'typeorm';
import type { CollectionAgentEntity } from './collection-agent.entity';
import type { RouteAssignmentEntity } from './route-assignment.entity';

const daysAgo = (n: number) =>
  new Date(NOW.getTime() - n * 86_400_000).toISOString().slice(0, 10);

function setup() {
  const h = buildHarness();
  const svc = new AgentHistoryService(
    h.agentRows as unknown as Repository<CollectionAgentEntity>,
    h.records as unknown as Repository<CollectionRecordEntity>,
    h.assignments as unknown as Repository<RouteAssignmentEntity>,
  );
  return { h, svc };
}

describe('AgentHistoryService (Employee detail → Collections tab)', () => {
  it('returns only this agent’s collected/confirmed deliveries, newest first', async () => {
    const { h, svc } = setup();
    h.record({ routeId: 1, agentId: 1, kg: 50, date: daysAgo(3) });
    h.record({
      routeId: 1,
      agentId: 1,
      kg: 60,
      date: daysAgo(1),
      status: 'confirmed',
    });
    h.record({ routeId: 1, agentId: 2, kg: 70, date: daysAgo(1) }); // someone else's
    h.record({
      routeId: 1,
      agentId: 1,
      kg: 80,
      date: daysAgo(1),
      status: 'approved',
    }); // not collected yet
    const res = await svc.history(1, {}, NOW);
    expect(res.rows.map((r) => r.date)).toEqual([daysAgo(1), daysAgo(3)]);
    expect(res.total).toBe(2);
  });

  it('defaults to the last 90 days; an explicit range overrides it', async () => {
    const { h, svc } = setup();
    h.record({ routeId: 1, agentId: 1, kg: 50, date: daysAgo(10) });
    h.record({ routeId: 1, agentId: 1, kg: 50, date: daysAgo(120) });
    expect((await svc.history(1, {}, NOW)).total).toBe(1);
    expect((await svc.history(1, { from: daysAgo(200) }, NOW)).total).toBe(2);
    expect(
      (await svc.history(1, { from: daysAgo(130), to: daysAgo(100) }, NOW))
        .total,
    ).toBe(1);
  });

  it('paginates server-side (0-based pages, 25 default, hasMore)', async () => {
    const { h, svc } = setup();
    for (let i = 0; i < 30; i++)
      h.record({ routeId: 1, agentId: 1, kg: 10 + i, date: daysAgo(i % 60) });
    const p0 = await svc.history(1, {}, NOW);
    expect([p0.rows.length, p0.total, p0.limit, p0.hasMore]).toEqual([
      25,
      30,
      25,
      true,
    ]);
    const p1 = await svc.history(1, { page: 1 }, NOW);
    expect([p1.rows.length, p1.hasMore]).toEqual([5, false]);
    expect((await svc.history(1, { limit: 500 }, NOW)).limit).toBe(100); // capped
  });

  it('shows estate weight, and grade lines + graded total once graded', async () => {
    const { h, svc } = setup();
    const r = h.record({
      routeId: 1,
      agentId: 1,
      kg: 150,
      date: daysAgo(1),
      status: 'confirmed',
    });
    r.gradeLines = [
      { grade: 'super', weightKg: '100.00' },
      { grade: 'normal', weightKg: '45.00' },
    ] as DeliveryGradeLineEntity[];
    h.record({ routeId: 1, agentId: 1, kg: 80, date: daysAgo(2) }); // collected, not graded yet
    const [graded, ungraded] = (await svc.history(1, {}, NOW)).rows;
    expect(graded).toMatchObject({
      estateWeightKg: 150,
      weightKg: 145,
      graded: true,
      gradeLines: [
        { grade: 'Super', weightKg: 100 },
        { grade: 'Normal', weightKg: 45 },
      ],
    });
    expect(ungraded).toMatchObject({
      estateWeightKg: 80,
      weightKg: 80,
      graded: false,
      gradeLines: [],
    });
  });

  it('marks deliveries made while COVERING another route — and only those', async () => {
    const { h, svc } = setup();
    h.permanent(1, 1);
    h.permanent(2, 2);
    // agent 1 covered Route 2 yesterday (accepted), and worked their own Route 1
    h.cover(2, 1, 'ACTIVE', {
      validFrom: daysAgo(1),
      validTo: daysAgo(1),
      acceptedAt: NOW,
    });
    h.record({ routeId: 2, agentId: 1, kg: 90, date: daysAgo(1) });
    h.record({ routeId: 1, agentId: 1, kg: 40, date: daysAgo(1) });
    h.record({ routeId: 2, agentId: 1, kg: 55, date: daysAgo(5) }); // same route, but no cover that day
    const rows = (await svc.history(1, {}, NOW)).rows;
    expect(
      rows.find((r) => r.route === 'Route 2' && r.date === daysAgo(1))
        ?.coveringRoute,
    ).toBe('Route 2');
    expect(rows.find((r) => r.route === 'Route 1')?.coveringRoute).toBeNull();
    expect(
      rows.find((r) => r.route === 'Route 2' && r.date === daysAgo(5))
        ?.coveringRoute,
    ).toBeNull();
  });

  it('a cover that ended early still counts if the agent had accepted it; a declined one does not', async () => {
    const { h, svc } = setup();
    h.cover(2, 1, 'CANCELLED', {
      validFrom: daysAgo(1),
      validTo: daysAgo(1),
      acceptedAt: NOW,
    });
    h.cover(3, 1, 'DECLINED', {
      validFrom: daysAgo(2),
      validTo: daysAgo(2),
      acceptedAt: null,
    });
    h.record({ routeId: 2, agentId: 1, kg: 90, date: daysAgo(1) });
    h.record({ routeId: 3, agentId: 1, kg: 60, date: daysAgo(2) });
    const rows = (await svc.history(1, {}, NOW)).rows;
    expect(rows.find((r) => r.route === 'Route 2')?.coveringRoute).toBe(
      'Route 2',
    );
    expect(rows.find((r) => r.route === 'Route 3')?.coveringRoute).toBeNull();
  });

  it('keeps a deactivated agent’s history viewable', async () => {
    const { h, svc } = setup();
    h.record({ routeId: 1, agentId: 1, kg: 50, date: daysAgo(3) });
    h.setEmployee(1, { status: 'Inactive' });
    expect((await svc.history(1, {}, NOW)).total).toBe(1);
  });

  it('an employee who is not (and never was) an agent has an empty history, not an error', async () => {
    const { svc } = setup();
    expect(await svc.history(999, {}, NOW)).toMatchObject({
      rows: [],
      total: 0,
      hasMore: false,
    });
  });
});

void TODAY;
