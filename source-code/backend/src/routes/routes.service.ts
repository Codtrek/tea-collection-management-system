import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { CreateRouteDto } from './dto/create-route.dto';
import { CollectorEntity } from './entities/collector.entity';
import { EstateEntity } from './entities/estate.entity';
import { FactoryEmployeeEntity } from './entities/factory-employee.entity';
import {
  NotificationEntity,
  NotificationType,
} from './entities/notification.entity';
import { RouteStopEntity } from './entities/route-stop.entity';
import { RouteEntity } from './entities/route.entity';
import { TeaEstateOwnerEntity } from './entities/tea-estate-owner.entity';
import {
  canCompleteRoute,
  canSetCancelled,
  canSetDelayed,
  canStartRoute,
} from './route-status.util';

export type RouteStopDto = {
  id: number;
  routeId: number;
  estateId: number;
  stopOrder: number;
  hasTeaPickup: boolean;
  hasFertilizerDelivery: boolean;
};

export type RouteDto = {
  id: number;
  factoryId: number;
  truckId: number | null;
  collectorId: number;
  driverName: string | null;
  routeDate: string;
  status: RouteEntity['status'];
  statusReason: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  stops: RouteStopDto[];
};

export type ActionResult =
  | { ok: true; route: RouteDto }
  | { ok: false; error: string };

function toStopDto(stop: RouteStopEntity): RouteStopDto {
  return {
    id: stop.id,
    routeId: stop.route_id,
    estateId: stop.estate_id,
    stopOrder: stop.stop_order,
    hasTeaPickup: stop.has_tea_pickup,
    hasFertilizerDelivery: stop.has_fertilizer_delivery,
  };
}

function toRouteDto(route: RouteEntity, stops: RouteStopEntity[]): RouteDto {
  return {
    id: route.id,
    factoryId: route.factory_id,
    truckId: route.truck_id,
    collectorId: route.collector_id,
    driverName: route.driver_name,
    routeDate: route.route_date,
    status: route.status,
    statusReason: route.status_reason,
    startedAt: route.started_at,
    completedAt: route.completed_at,
    stops: stops.map(toStopDto),
  };
}

@Injectable()
export class RoutesService {
  constructor(
    @InjectRepository(RouteEntity)
    private readonly routes: Repository<RouteEntity>,
    @InjectRepository(RouteStopEntity)
    private readonly routeStops: Repository<RouteStopEntity>,
    @InjectRepository(NotificationEntity)
    private readonly notifications: Repository<NotificationEntity>,
    @InjectRepository(EstateEntity)
    private readonly estates: Repository<EstateEntity>,
    @InjectRepository(TeaEstateOwnerEntity)
    private readonly teaEstateOwners: Repository<TeaEstateOwnerEntity>,
    @InjectRepository(FactoryEmployeeEntity)
    private readonly factoryEmployees: Repository<FactoryEmployeeEntity>,
    @InjectRepository(CollectorEntity)
    private readonly collectors: Repository<CollectorEntity>,
  ) {}

  async resolveCollectorIdForUser(userId: number): Promise<number | null> {
    const employee = await this.factoryEmployees.findOne({
      where: { user_id: userId },
    });
    if (!employee) return null;
    const collector = await this.collectors.findOne({
      where: { employee_id: employee.id },
    });
    return collector?.id ?? null;
  }

  private async fetchWithStops(id: number): Promise<RouteDto | null> {
    const route = await this.routes.findOne({ where: { id } });
    if (!route) return null;
    const stops = await this.routeStops.find({
      where: { route_id: id },
      order: { stop_order: 'ASC' },
    });
    return toRouteDto(route, stops);
  }

  private async notifyEstatesOnRoute(
    routeId: number,
    type: NotificationType,
    title: string,
    body: string,
  ) {
    const stops = await this.routeStops.find({ where: { route_id: routeId } });
    const estateIds = stops.map((s) => s.estate_id);
    if (estateIds.length === 0) return;
    const estates = await this.estates.find({ where: { id: In(estateIds) } });
    const ownerIds = estates.map((e) => e.owner_id);
    const owners = await this.teaEstateOwners.find({
      where: { id: In(ownerIds) },
    });
    const ownerByEstateId = new Map(estates.map((e) => [e.id, e.owner_id]));
    const userIdByOwnerId = new Map(owners.map((o) => [o.id, o.user_id]));

    for (const stop of stops) {
      const ownerId = ownerByEstateId.get(stop.estate_id);
      const userId =
        ownerId !== undefined ? userIdByOwnerId.get(ownerId) : undefined;
      if (userId === undefined) continue;
      await this.notifications.insert({
        user_id: userId,
        type,
        title,
        body,
        reference_id: routeId,
        reference_type: 'routes',
      });
    }
  }

  async create(dto: CreateRouteDto): Promise<RouteDto> {
    const route = await this.routes.save(
      this.routes.create({
        factory_id: dto.factoryId,
        collector_id: dto.collectorId,
        route_date: dto.routeDate,
        truck_id: dto.truckId ?? null,
        driver_name: dto.driverName ?? null,
        status: 'scheduled',
      }),
    );
    await this.routeStops.save(
      dto.stops.map((stop, index) =>
        this.routeStops.create({
          route_id: route.id,
          estate_id: stop.estateId,
          stop_order: index,
          has_tea_pickup: stop.hasTeaPickup,
          has_fertilizer_delivery: stop.hasFertilizerDelivery,
        }),
      ),
    );
    const created = await this.fetchWithStops(route.id);
    if (!created) throw new Error('Failed to create route');
    return created;
  }

  async findByDate(routeDate: string): Promise<RouteDto[]> {
    const routes = await this.routes.find({ where: { route_date: routeDate } });
    return Promise.all(
      routes.map(async (route) => (await this.fetchWithStops(route.id))!),
    );
  }

  async findByCollector(
    collectorId: number,
    routeDate: string,
  ): Promise<RouteDto[]> {
    const routes = await this.routes.find({
      where: { collector_id: collectorId, route_date: routeDate },
    });
    return Promise.all(
      routes.map(async (route) => (await this.fetchWithStops(route.id))!),
    );
  }

  findById(id: number): Promise<RouteDto | null> {
    return this.fetchWithStops(id);
  }

  async start(id: number, collectorId: number): Promise<ActionResult> {
    const route = await this.fetchWithStops(id);
    if (!route) return { ok: false, error: 'Route not found' };
    const check = canStartRoute(route.status, route.collectorId, collectorId);
    if (!check.ok) return check;
    await this.routes.update(id, { status: 'active', started_at: new Date() });
    await this.notifyEstatesOnRoute(
      id,
      'route_active',
      'Route started',
      'Your collector is on the way today.',
    );
    return { ok: true, route: (await this.fetchWithStops(id))! };
  }

  async delay(id: number, reason: string): Promise<ActionResult> {
    const route = await this.fetchWithStops(id);
    if (!route) return { ok: false, error: 'Route not found' };
    const check = canSetDelayed(route.status, reason);
    if (!check.ok) return check;
    await this.routes.update(id, { status: 'delayed', status_reason: reason });
    await this.notifyEstatesOnRoute(
      id,
      'route_delayed',
      'Route delayed',
      reason,
    );
    return { ok: true, route: (await this.fetchWithStops(id))! };
  }

  async cancel(id: number, reason: string): Promise<ActionResult> {
    const route = await this.fetchWithStops(id);
    if (!route) return { ok: false, error: 'Route not found' };
    const check = canSetCancelled(route.status, reason);
    if (!check.ok) return check;
    await this.routes.update(id, {
      status: 'cancelled',
      status_reason: reason,
    });
    await this.notifyEstatesOnRoute(
      id,
      'route_cancelled',
      'Route cancelled',
      reason,
    );
    return { ok: true, route: (await this.fetchWithStops(id))! };
  }

  async complete(id: number): Promise<ActionResult> {
    const route = await this.fetchWithStops(id);
    if (!route) return { ok: false, error: 'Route not found' };
    const check = canCompleteRoute(route.status);
    if (!check.ok) return check;
    await this.routes.update(id, {
      status: 'completed',
      completed_at: new Date(),
    });
    return { ok: true, route: (await this.fetchWithStops(id))! };
  }
}
