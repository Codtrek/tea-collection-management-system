import type { Repository } from 'typeorm';
import type { CollectionAgentEntity } from '../dispatch/collection-agent.entity';
import type { RouteAssignmentEntity } from '../dispatch/route-assignment.entity';
import { FakeRepository } from '../dispatch/testing/fake-repository';
import type { EstateEntity } from '../estates/estate.entity';
import type { RouteEntity } from '../estates/route.entity';
import { AgentFertilizerHistoryService } from './agent-fertilizer-history.service';
import type { FertilizerDeliveryEntity } from './fertilizer-delivery.entity';
import type { FertilizerRequestEntity } from './fertilizer-request.entity';

const NOW = new Date('2026-10-27T09:00:00+05:30');
const daysAgo = (n: number) =>
  new Date(NOW.getTime() - n * 86_400_000).toISOString().slice(0, 10);

function setup() {
  const agents = new FakeRepository<CollectionAgentEntity>().seed(
    { hrEmployeeId: 10 } as CollectionAgentEntity, // agent 1
    { hrEmployeeId: 20 } as CollectionAgentEntity, // agent 2
  );
  const deliveries = new FakeRepository<FertilizerDeliveryEntity>();
  const requests = new FakeRepository<FertilizerRequestEntity>().seed({
    item: 'Urea',
    createdAt: new Date('2026-10-01T00:00:00Z'),
  } as FertilizerRequestEntity);
  const estates = new FakeRepository<EstateEntity>().seed({
    name: 'Green Valley',
  } as EstateEntity);
  const routes = new FakeRepository<RouteEntity>().seed(
    { name: 'Route 1' } as RouteEntity,
    { name: 'Route 2' } as RouteEntity,
  );
  const assignments = new FakeRepository<RouteAssignmentEntity>();
  const svc = new AgentFertilizerHistoryService(
    agents as unknown as Repository<CollectionAgentEntity>,
    deliveries as unknown as Repository<FertilizerDeliveryEntity>,
    requests as unknown as Repository<FertilizerRequestEntity>,
    estates as unknown as Repository<EstateEntity>,
    routes as unknown as Repository<RouteEntity>,
    assignments as unknown as Repository<RouteAssignmentEntity>,
  );

  /** a finished attempt; pass overrides for the interesting fields */
  const attempt = (o: Partial<FertilizerDeliveryEntity> = {}) =>
    deliveries.seed({
      requestId: 1,
      attemptNo: 1,
      estateId: 1,
      routeId: 1,
      scheduledDate: daysAgo(1),
      pickupAgentId: 1,
      handoverQtyKg: '400.00',
      outcome: 'delivered',
      deliveredQtyKg: '400.00',
      shortfallReason: null,
      failReason: null,
      failNote: null,
      cancelledAt: null,
      ...o,
    } as FertilizerDeliveryEntity);

  return { svc, attempt, assignments };
}

describe('AgentFertilizerHistoryService (Employee detail → Fertilizer deliveries tab)', () => {
  it('lists the agent’s delivered, part-delivered and failed attempts, newest first', async () => {
    const { svc, attempt } = setup();
    attempt({ scheduledDate: daysAgo(5) });
    attempt({
      scheduledDate: daysAgo(3),
      outcome: 'partial',
      deliveredQtyKg: '300.00',
      shortfallReason: 'Owner had no storage',
    });
    attempt({
      scheduledDate: daysAgo(1),
      outcome: 'failed',
      deliveredQtyKg: null,
      failReason: 'owner_not_available',
      failNote: 'Gate locked',
    });
    const res = await svc.history(10, {}, NOW);
    expect(res.total).toBe(3);
    expect(res.rows.map((r) => r.outcome)).toEqual([
      'Failed',
      'Partially delivered',
      'Delivered',
    ]);
    expect(res.rows[0]).toMatchObject({
      requestId: 'FR-2026-0001',
      estateName: 'Green Valley',
      route: 'Route 1',
      item: 'Urea',
      handedOverKg: 400,
      deliveredKg: 0,
      failReason: 'Owner not available',
      note: 'Gate locked',
    });
    expect(res.rows[1]).toMatchObject({
      deliveredKg: 300,
      note: 'Owner had no storage',
    });
  });

  it('leaves out attempts still in play, never handed over, cancelled, or another agent’s', async () => {
    const { svc, attempt } = setup();
    attempt(); // counts
    attempt({ outcome: null, deliveredQtyKg: null }); // still with him
    attempt({ pickupAgentId: null, handoverQtyKg: null, outcome: null }); // not handed over
    attempt({ cancelledAt: NOW }); // cancelled
    attempt({ pickupAgentId: 2 }); // someone else's
    expect((await svc.history(10, {}, NOW)).total).toBe(1);
    expect((await svc.history(20, {}, NOW)).total).toBe(1);
  });

  it('defaults to the last 90 days; an explicit range overrides it', async () => {
    const { svc, attempt } = setup();
    attempt({ scheduledDate: daysAgo(10) });
    attempt({ scheduledDate: daysAgo(120) });
    expect((await svc.history(10, {}, NOW)).total).toBe(1);
    expect((await svc.history(10, { from: daysAgo(200) }, NOW)).total).toBe(2);
    expect(
      (await svc.history(10, { from: daysAgo(130), to: daysAgo(100) }, NOW))
        .total,
    ).toBe(1);
  });

  it('paginates server-side (0-based pages, 25 default, hasMore)', async () => {
    const { svc, attempt } = setup();
    for (let i = 0; i < 30; i++) attempt({ scheduledDate: daysAgo(i % 60) });
    const p0 = await svc.history(10, {}, NOW);
    expect([p0.rows.length, p0.total, p0.limit, p0.hasMore]).toEqual([
      25,
      30,
      25,
      true,
    ]);
    const p1 = await svc.history(10, { page: 1 }, NOW);
    expect([p1.rows.length, p1.hasMore]).toEqual([5, false]);
    expect((await svc.history(10, { limit: 500 }, NOW)).limit).toBe(100); // capped
  });

  it('marks attempts made while COVERING another route under an accepted cover', async () => {
    const { svc, attempt, assignments } = setup();
    assignments.seed(
      {
        routeId: 2,
        agentId: 1,
        type: 'COVER',
        status: 'ACTIVE',
        validFrom: daysAgo(1),
        validTo: daysAgo(1),
        acceptedAt: NOW,
      } as RouteAssignmentEntity,
      {
        routeId: 2,
        agentId: 1,
        type: 'COVER',
        status: 'DECLINED',
        validFrom: daysAgo(4),
        validTo: daysAgo(4),
        acceptedAt: null,
      } as RouteAssignmentEntity,
    );
    attempt({ routeId: 2, scheduledDate: daysAgo(1) }); // covered
    attempt({ routeId: 1, scheduledDate: daysAgo(1) }); // own route
    attempt({ routeId: 2, scheduledDate: daysAgo(4) }); // declined cover
    const rows = (await svc.history(10, {}, NOW)).rows;
    const on = (route: string, date: string) =>
      rows.find((r) => r.route === route && r.date === date)?.coveringRoute;
    expect(on('Route 2', daysAgo(1))).toBe('Route 2');
    expect(on('Route 1', daysAgo(1))).toBeNull();
    expect(on('Route 2', daysAgo(4))).toBeNull();
  });

  it('an employee who is not an agent has an empty history, not an error', async () => {
    const { svc } = setup();
    expect(await svc.history(999, {}, NOW)).toMatchObject({
      rows: [],
      total: 0,
      hasMore: false,
    });
  });
});
