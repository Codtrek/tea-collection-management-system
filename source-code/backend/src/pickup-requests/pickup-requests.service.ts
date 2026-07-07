import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, In, Repository } from 'typeorm';

import { RouteEntity } from '../routes/entities/route.entity';
import { RouteStopEntity } from '../routes/entities/route-stop.entity';
import { TeaEstateOwnerEntity } from '../routes/entities/tea-estate-owner.entity';
import { CreatePickupRequestDto } from './dto/create-pickup-request.dto';
import { PickupRequestEntity } from './entities/pickup-request.entity';
import {
  canAcceptPickup,
  canCancelPickup,
  canDeclinePickup,
  canMarkOnTheWay,
  canMarkPickedUp,
} from './pickup-status.util';

export type PickupRequestDto = {
  id: number;
  estateId: number;
  ownerId: number;
  factoryId: number;
  routeStopId: number | null;
  requestDate: string;
  status: PickupRequestEntity['status'];
  declineReason: string | null;
  estimatedWeightKg: number | null;
  gpsPinLat: number | null;
  gpsPinLng: number | null;
  requestedAt: Date;
  resolvedAt: Date | null;
};

export type CreatePickupResult =
  | { ok: true; request: PickupRequestDto }
  | { ok: false; error: string };
export type PickupActionResult =
  | { ok: true; request: PickupRequestDto }
  | { ok: false; error: string };

function toDto(entity: PickupRequestEntity): PickupRequestDto {
  return {
    id: entity.id,
    estateId: entity.estate_id,
    ownerId: entity.owner_id,
    factoryId: entity.factory_id,
    routeStopId: entity.route_stop_id,
    requestDate: entity.request_date,
    status: entity.status,
    declineReason: entity.decline_reason,
    estimatedWeightKg: entity.estimated_weight_kg,
    gpsPinLat: entity.gps_pin_lat,
    gpsPinLng: entity.gps_pin_lng,
    requestedAt: entity.requested_at,
    resolvedAt: entity.resolved_at,
  };
}

@Injectable()
export class PickupRequestsService {
  constructor(
    @InjectRepository(PickupRequestEntity)
    private readonly pickupRequests: Repository<PickupRequestEntity>,
    @InjectRepository(RouteStopEntity)
    private readonly routeStops: Repository<RouteStopEntity>,
    @InjectRepository(RouteEntity)
    private readonly routes: Repository<RouteEntity>,
    @InjectRepository(TeaEstateOwnerEntity)
    private readonly teaEstateOwners: Repository<TeaEstateOwnerEntity>,
  ) {}

  async resolveOwnerIdForUser(userId: number): Promise<number | null> {
    const owner = await this.teaEstateOwners.findOne({
      where: { user_id: userId },
    });
    return owner?.id ?? null;
  }

  private async findActiveRouteStopForEstate(
    estateId: number,
    date: string,
  ): Promise<number | null> {
    const activeRoutes = await this.routes.find({
      where: { route_date: date, status: 'active' },
    });
    if (activeRoutes.length === 0) return null;
    const stop = await this.routeStops.findOne({
      where: {
        estate_id: estateId,
        route_id: In(activeRoutes.map((r) => r.id)),
      },
    });
    return stop?.id ?? null;
  }

  async create(
    dto: CreatePickupRequestDto,
    ownerId: number,
  ): Promise<CreatePickupResult> {
    const existing = await this.pickupRequests.findOne({
      where: {
        estate_id: dto.estateId,
        request_date: dto.requestDate,
        status: Not(In(['expired', 'cancelled', 'completed'])),
      },
    });
    if (existing) {
      return {
        ok: false,
        error: 'This estate already has an active pickup request today.',
      };
    }

    const routeStopId = await this.findActiveRouteStopForEstate(
      dto.estateId,
      dto.requestDate,
    );
    if (!routeStopId) {
      return {
        ok: false,
        error:
          'No collector is currently active on your estate route. Try again once your route starts.',
      };
    }

    const saved = await this.pickupRequests.save(
      this.pickupRequests.create({
        estate_id: dto.estateId,
        owner_id: ownerId,
        factory_id: dto.factoryId,
        route_stop_id: routeStopId,
        request_date: dto.requestDate,
        status: 'pending',
        estimated_weight_kg: dto.estimatedWeightKg ?? null,
        gps_pin_lat: dto.gpsPinLat ?? null,
        gps_pin_lng: dto.gpsPinLng ?? null,
      }),
    );
    return { ok: true, request: toDto(saved) };
  }

  async accept(id: number): Promise<PickupActionResult> {
    const request = await this.pickupRequests.findOne({ where: { id } });
    if (!request) return { ok: false, error: 'Pickup request not found' };
    const check = canAcceptPickup(request.status);
    if (!check.ok) return check;
    await this.pickupRequests.update(id, { status: 'accepted' });
    return {
      ok: true,
      request: toDto((await this.pickupRequests.findOne({ where: { id } }))!),
    };
  }

  async decline(id: number, reason: string): Promise<PickupActionResult> {
    const request = await this.pickupRequests.findOne({ where: { id } });
    if (!request) return { ok: false, error: 'Pickup request not found' };
    const check = canDeclinePickup(request.status, reason);
    if (!check.ok) return check;
    await this.pickupRequests.update(id, {
      status: 'cancelled',
      decline_reason: reason,
      resolved_at: new Date(),
    });
    return {
      ok: true,
      request: toDto((await this.pickupRequests.findOne({ where: { id } }))!),
    };
  }

  async markOnTheWay(id: number): Promise<PickupActionResult> {
    const request = await this.pickupRequests.findOne({ where: { id } });
    if (!request) return { ok: false, error: 'Pickup request not found' };
    const check = canMarkOnTheWay(request.status);
    if (!check.ok) return check;
    await this.pickupRequests.update(id, { status: 'on_the_way' });
    return {
      ok: true,
      request: toDto((await this.pickupRequests.findOne({ where: { id } }))!),
    };
  }

  async markPickedUp(id: number): Promise<PickupActionResult> {
    const request = await this.pickupRequests.findOne({ where: { id } });
    if (!request) return { ok: false, error: 'Pickup request not found' };
    const check = canMarkPickedUp(request.status);
    if (!check.ok) return check;
    await this.pickupRequests.update(id, { status: 'picked_up' });
    return {
      ok: true,
      request: toDto((await this.pickupRequests.findOne({ where: { id } }))!),
    };
  }

  async cancel(id: number): Promise<PickupActionResult> {
    const request = await this.pickupRequests.findOne({ where: { id } });
    if (!request) return { ok: false, error: 'Pickup request not found' };
    const check = canCancelPickup(request.status);
    if (!check.ok) return check;
    await this.pickupRequests.update(id, {
      status: 'cancelled',
      resolved_at: new Date(),
    });
    return {
      ok: true,
      request: toDto((await this.pickupRequests.findOne({ where: { id } }))!),
    };
  }
}
