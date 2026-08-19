import type { ConfigService } from '@nestjs/config';
import type { Repository } from 'typeorm';
import type { AuditService } from '../../audit/audit.service';
import type { CollectionRecordEntity } from '../../collections/collection-record.entity';
import type { EstateEntity } from '../../estates/estate.entity';
import type { RouteEntity } from '../../estates/route.entity';
import type { FactoryEmployee } from '../../users/factory-employee.entity';
import type { AgentDayStatusEntity } from '../agent-day-status.entity';
import { AgentDirectoryService } from '../agent-directory.service';
import type { AgentLocationPingEntity } from '../agent-location-ping.entity';
import { AgentSelfService } from '../agent-self.service';
import { CandidateRankingService } from '../candidate-ranking.service';
import type { CollectionAgentEntity } from '../collection-agent.entity';
import type { DevicePushTokenEntity } from '../device-push-token.entity';
import type { DispatchNotifier } from '../dispatch-notifier.service';
import type { DispatchSettingsService } from '../dispatch-settings.service';
import { DispatchService } from '../dispatch.service';
import { PositionCacheService } from '../position-cache.service';
import type {
  AssignmentStatus,
  AssignmentType,
  RouteAssignmentEntity,
} from '../route-assignment.entity';
import { RouteLoadService } from '../route-load.service';
import type { RouteNeighbourEntity } from '../route-neighbour.entity';
import { RouteResolverService } from '../route-resolver.service';
import { FakeRepository } from './fake-repository';

/** "Now" for dispatch specs: 09:30 on 2026-10-09 in Sri Lanka (04:00Z). */
export const NOW = new Date('2026-10-09T04:00:00.000Z');
export const TODAY = '2026-10-09';
export const minutesAfter = (d: Date, m: number) =>
  new Date(d.getTime() + m * 60_000);

export const officer = {
  name: 'S. Fernando',
  role: 'Officer' as const,
  sub: 100,
};

/**
 * The whole dispatch object graph over in-memory fakes. Agents 1–5 (userIds 11–15);
 * routes 1–4. No permanent assignments are seeded — each spec declares what it needs.
 */
export function buildHarness() {
  const assignments = new FakeRepository<RouteAssignmentEntity>();
  const dayStatus = new FakeRepository<AgentDayStatusEntity>(null);
  const pings = new FakeRepository<AgentLocationPingEntity>();
  const tokens = new FakeRepository<DevicePushTokenEntity>(null);
  const routes = new FakeRepository<RouteEntity>();
  const estates = new FakeRepository<EstateEntity>();
  const records = new FakeRepository<CollectionRecordEntity>();
  const neighbours = new FakeRepository<RouteNeighbourEntity>(null);
  const agentRows = new FakeRepository<CollectionAgentEntity>();
  const employeeRows = new FakeRepository<FactoryEmployee>();

  [1, 2, 3, 4].forEach((id) =>
    routes.seed({ id, factoryId: 1, name: `Route ${id}` }),
  );
  const names = [
    'R. Senanayake',
    'W. Gunaratne',
    'K. Weerasinghe',
    'N. Perera',
    'D. Silva',
  ];
  names.forEach((name, i) => {
    const id = i + 1;
    employeeRows.seed({
      id,
      user_id: 10 + id,
      factory_id: 1,
      name,
    } as FactoryEmployee);
    agentRows.seed({ id, employeeId: id, factoryId: 1, isAvailable: true });
  });

  const cast = <T>(r: unknown) => r as Repository<T & object>;
  const directory = new AgentDirectoryService(
    cast<CollectionAgentEntity>(agentRows),
    cast<FactoryEmployee>(employeeRows),
  );
  const resolver = new RouteResolverService(
    cast<RouteAssignmentEntity>(assignments),
  );
  const load = new RouteLoadService(cast<CollectionRecordEntity>(records));
  const ranking = new CandidateRankingService(
    cast<RouteAssignmentEntity>(assignments),
    cast<AgentDayStatusEntity>(dayStatus),
    cast<RouteNeighbourEntity>(neighbours),
    cast<RouteEntity>(routes),
    directory,
    load,
  );
  const cache = new PositionCacheService({
    get: () => undefined,
  } as unknown as ConfigService);
  const notifier = {
    notifyAgent: jest.fn().mockResolvedValue(undefined),
    notifyUser: jest.fn(),
  };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const settings = {
    get: jest.fn().mockResolvedValue({
      coverRequestTimeoutMin: 15,
      shiftStartTime: '06:00',
    }),
  };

  const dispatch = new DispatchService(
    cast<RouteAssignmentEntity>(assignments),
    cast<AgentDayStatusEntity>(dayStatus),
    cast<AgentLocationPingEntity>(pings),
    cast<RouteEntity>(routes),
    cast<EstateEntity>(estates),
    resolver,
    load,
    ranking,
    directory,
    cache,
    notifier as unknown as DispatchNotifier,
    settings as unknown as DispatchSettingsService,
    audit as unknown as AuditService,
  );
  const self = new AgentSelfService(
    cast<RouteAssignmentEntity>(assignments),
    cast<AgentDayStatusEntity>(dayStatus),
    cast<AgentLocationPingEntity>(pings),
    cast<DevicePushTokenEntity>(tokens),
    cast<CollectionRecordEntity>(records),
    cast<RouteEntity>(routes),
    directory,
    dispatch,
    resolver,
    load,
    cache,
    notifier as unknown as DispatchNotifier,
    audit as unknown as AuditService,
  );

  let recSeq = 0;
  const h = {
    assignments,
    dayStatus,
    pings,
    routes,
    estates,
    records,
    neighbours,
    tokens,
    directory,
    resolver,
    load,
    ranking,
    cache,
    notifier,
    audit,
    settings,
    dispatch,
    self,

    permanent(
      routeId: number,
      agentId: number,
      extra: Partial<RouteAssignmentEntity> = {},
    ) {
      return h.assign('PERMANENT', 'ACTIVE', routeId, agentId, {
        validFrom: '2026-01-01',
        validTo: null,
        ...extra,
      });
    },
    cover(
      routeId: number,
      agentId: number,
      status: AssignmentStatus,
      extra: Partial<RouteAssignmentEntity> = {},
    ) {
      return h.assign('COVER', status, routeId, agentId, {
        validFrom: TODAY,
        validTo: TODAY,
        ...extra,
      });
    },
    assign(
      type: AssignmentType,
      status: AssignmentStatus,
      routeId: number,
      agentId: number,
      extra: Partial<RouteAssignmentEntity> = {},
    ) {
      const row = {
        routeId,
        agentId,
        type,
        status,
        validFrom: TODAY,
        validTo: null,
        createdBy: 'test',
        acceptedAt: null,
        respondedAt: null,
        expiresAt: null,
        reason: null,
        coversAssignmentId: null,
        stopScope: null,
        createdAt: NOW,
        ...extra,
      } as RouteAssignmentEntity;
      void assignments.save(row);
      return row;
    },
    neighbour(a: number, b: number) {
      neighbours.seed(
        { routeId: a, neighbourRouteId: b },
        { routeId: b, neighbourRouteId: a },
      );
    },
    /** A delivery row for load/stop maths. kg is the ESTATE weight. */
    record(o: {
      routeId: number;
      agentId?: number | null;
      kg: number;
      date?: string;
      status?: CollectionRecordEntity['status'];
    }) {
      const row = {
        id: `R-${++recSeq}`,
        estateId: null,
        estateRef: null,
        estateName: 'Estate',
        routeId: o.routeId,
        routeName: `Route ${o.routeId}`,
        weightKg: String(o.kg),
        gradeLines: [],
        status: o.status ?? 'collected',
        collectionDate: o.date ?? TODAY,
        agentId: o.agentId ?? null,
        agentName: 'x',
        photos: [],
        timeline: [],
        provisional: null,
        mismatch: null,
        lastUpdatedBy: null,
        lastUpdatedOn: null,
        createdAt: NOW,
      } as CollectionRecordEntity;
      void records.save(row);
      return row;
    },
    absent(agentId: number, day = TODAY) {
      void dayStatus.save({
        agentId,
        day,
        status: 'ABSENT',
        source: 'officer',
        reason: null,
        markedBy: 'x',
        shiftStartedAt: null,
        shiftEndedAt: null,
      });
    },
    shift(
      agentId: number,
      start: Date | null,
      end: Date | null = null,
      day = TODAY,
    ) {
      void dayStatus.save({
        agentId,
        day,
        status: 'AVAILABLE',
        source: null,
        reason: null,
        markedBy: null,
        shiftStartedAt: start,
        shiftEndedAt: end,
      });
    },
    setAvailable(agentId: number, isAvailable: boolean) {
      const row = agentRows.rows.find((r) => r.id === agentId)!;
      row.isAvailable = isAvailable;
    },
    /** userId for an agent id, as the mobile JWT `sub` would carry */
    uid: (agentId: number) => 10 + agentId,
  };
  return h;
}
