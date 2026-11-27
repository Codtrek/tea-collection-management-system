import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { UsersService } from '../users/users.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import {
  ChangeDeliveryDateDto,
  CreateRequestsDto,
  DecideRequestDto,
  ManagerDecideDto,
  PaymentMethodDto,
  QuantityDto,
  ReasonDto,
  RecordPaymentDto,
  RetryDto,
  CancelPriceDto,
  SetPriceDto,
} from './dto/fertilizer-flow.dto';
import { RecordMovementDto } from './dto/record-movement.dto';
import { WriteOffDto } from './dto/write-off.dto';
import { FertilizerDeliveryService } from './fertilizer-delivery.service';
import type {
  PublicBatch,
  PublicExpiryAlerts,
  PublicItemPosition,
  PublicMovement,
  PublicRequest,
  PublicRequestDetail,
} from './fertilizer-map';
import { FertilizerRequestService } from './fertilizer-request.service';
import { FertilizerViewService } from './fertilizer-view.service';
import {
  ItemPriceService,
  type PublicPrice,
  type PurchaseCost,
} from './item-price.service';
import { DispatchAccessService } from '../dispatch/dispatch-access.service';
import { type Actor, FertilizerService } from './fertilizer.service';
import { RequirePermission, ServiceChecked } from '../auth/permissions';

type AuthedRequest = Request & { user: JwtPayload };

@Controller('fertilizer')
@UseGuards(JwtAuthGuard)
export class FertilizerController {
  constructor(
    private readonly fertilizerService: FertilizerService,
    private readonly usersService: UsersService,
    private readonly requests: FertilizerRequestService,
    private readonly deliveries: FertilizerDeliveryService,
    private readonly view: FertilizerViewService,
    private readonly itemPrices: ItemPriceService,
    private readonly access: DispatchAccessService,
  ) {}

  @RequirePermission('fertilizer')
  @Get('positions')
  listPositions(): Promise<PublicItemPosition[]> {
    return this.fertilizerService.listPositions();
  }

  @RequirePermission('fertilizer')
  @Get('batches')
  listBatches(): Promise<PublicBatch[]> {
    return this.fertilizerService.listBatches();
  }

  @ServiceChecked(
    'fertilizer / fertilizerApproval / fertilizerManagerApproval / itemPrices keys and request state (fertilizer services)',
  )
  @Post('batches')
  async createBatch(
    @Body() dto: CreateBatchDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicBatch> {
    return this.fertilizerService.createBatch(
      dto,
      await this.resolveActor(req),
    );
  }

  @RequirePermission('fertilizer')
  @Get('batches/:id')
  getBatch(@Param('id') id: string): Promise<PublicBatch> {
    return this.fertilizerService.getBatch(id);
  }

  /** Expiry Alerts: expired / within 7 days / within the window — never overlapping. */
  @RequirePermission('fertilizer')
  @Get('alerts')
  expiryAlerts(): Promise<PublicExpiryAlerts> {
    return this.fertilizerService.expiryAlerts();
  }

  /** Expiry Alerts / FERT-03: write off expired, damaged or other lost stock (`fertilizer: edit`). */
  @ServiceChecked(
    'fertilizer / fertilizerApproval / fertilizerManagerApproval / itemPrices keys and request state (fertilizer services)',
  )
  @Post('batches/:id/write-off')
  async writeOffBatch(
    @Param('id') id: string,
    @Body() dto: WriteOffDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicBatch> {
    return this.fertilizerService.writeOffBatch(
      id,
      dto,
      await this.resolveActor(req),
    );
  }

  /* ── Requests (Fertilizer-Delivery-Addendum) ───────────────────── */

  @RequirePermission('fertilizer')
  @Get('requests')
  async listRequests(): Promise<PublicRequest[]> {
    await this.deliveries.reconcile();
    return this.view.list();
  }

  /** FERT-07: one order → one request per item, sharing an order reference. */
  @ServiceChecked(
    'fertilizer / fertilizerApproval / fertilizerManagerApproval / itemPrices keys and request state (fertilizer services)',
  )
  @Post('requests')
  async createRequests(
    @Body() dto: CreateRequestsDto,
    @Req() req: AuthedRequest,
  ) {
    return this.requests.createRequests(
      dto,
      'web',
      await this.resolveActor(req),
    );
  }

  @RequirePermission('fertilizer')
  @Get('requests/:id')
  async getRequest(@Param('id') id: string): Promise<PublicRequestDetail> {
    const request = await this.view.find(id);
    await this.deliveries.reconcile(new Date(), request.id);
    return this.view.detail(request.id);
  }

  /** Factory Officer: approve / partially approve / reject (`fertilizerApproval: approve`). */
  @ServiceChecked(
    'fertilizer / fertilizerApproval / fertilizerManagerApproval / itemPrices keys and request state (fertilizer services)',
  )
  @Patch('requests/:id/decide')
  async decideRequest(
    @Param('id') id: string,
    @Body() dto: DecideRequestDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicRequestDetail> {
    return this.requests.decide(id, dto, await this.resolveActor(req));
  }

  /** Factory Manager: the second sign-off above the limit (`fertilizerManagerApproval: approve`). */
  @ServiceChecked(
    'fertilizer / fertilizerApproval / fertilizerManagerApproval / itemPrices keys and request state (fertilizer services)',
  )
  @Patch('requests/:id/manager-decide')
  async managerDecide(
    @Param('id') id: string,
    @Body() dto: ManagerDecideDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicRequestDetail> {
    return this.requests.managerDecide(id, dto, await this.resolveActor(req));
  }

  @ServiceChecked(
    'fertilizer / fertilizerApproval / fertilizerManagerApproval / itemPrices keys and request state (fertilizer services)',
  )
  @Post('requests/:id/ready')
  async markReady(
    @Param('id') id: string,
    @Req() req: AuthedRequest,
  ): Promise<PublicRequestDetail> {
    return this.deliveries.markReady(id, await this.resolveActor(req));
  }

  /** FERT-06: re-take a commitment stuck on an expired batch from live stock (FEFO). */
  @ServiceChecked(
    'fertilizer / fertilizerApproval / fertilizerManagerApproval / itemPrices keys and request state (fertilizer services)',
  )
  @Post('requests/:id/move-to-live')
  async moveToLive(
    @Param('id') id: string,
    @Req() req: AuthedRequest,
  ): Promise<PublicRequestDetail> {
    return this.deliveries.moveToLive(id, await this.resolveActor(req));
  }

  @ServiceChecked(
    'fertilizer / fertilizerApproval / fertilizerManagerApproval / itemPrices keys and request state (fertilizer services)',
  )
  @Patch('requests/:id/delivery-date')
  async changeDate(
    @Param('id') id: string,
    @Body() dto: ChangeDeliveryDateDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicRequestDetail> {
    return this.deliveries.changeDate(
      id,
      dto.date,
      dto.reason,
      await this.resolveActor(req),
    );
  }

  @ServiceChecked(
    'fertilizer / fertilizerApproval / fertilizerManagerApproval / itemPrices keys and request state (fertilizer services)',
  )
  @Post('requests/:id/handover')
  async handover(
    @Param('id') id: string,
    @Body() dto: QuantityDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicRequestDetail> {
    return this.deliveries.handover(
      id,
      dto.qtyKg,
      await this.resolveActor(req),
    );
  }

  @ServiceChecked(
    'fertilizer / fertilizerApproval / fertilizerManagerApproval / itemPrices keys and request state (fertilizer services)',
  )
  @Post('requests/:id/check-in')
  async checkIn(
    @Param('id') id: string,
    @Body() dto: QuantityDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicRequestDetail> {
    return this.deliveries.checkIn(id, dto.qtyKg, await this.resolveActor(req));
  }

  @ServiceChecked(
    'fertilizer / fertilizerApproval / fertilizerManagerApproval / itemPrices keys and request state (fertilizer services)',
  )
  @Post('requests/:id/retry')
  async retry(
    @Param('id') id: string,
    @Body() dto: RetryDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicRequestDetail> {
    return this.deliveries.retry(id, dto.date, await this.resolveActor(req));
  }

  @ServiceChecked(
    'fertilizer / fertilizerApproval / fertilizerManagerApproval / itemPrices keys and request state (fertilizer services)',
  )
  @Post('requests/:id/release-shortfall')
  async releaseShortfall(
    @Param('id') id: string,
    @Body() dto: ReasonDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicRequestDetail> {
    return this.deliveries.releaseShortfall(
      id,
      dto.reason,
      await this.resolveActor(req),
    );
  }

  @ServiceChecked(
    'fertilizer / fertilizerApproval / fertilizerManagerApproval / itemPrices keys and request state (fertilizer services)',
  )
  @Post('requests/:id/cancel')
  async cancel(
    @Param('id') id: string,
    @Body() dto: ReasonDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicRequestDetail> {
    return this.requests.cancel(id, dto.reason, await this.resolveActor(req));
  }

  @ServiceChecked(
    'fertilizer / fertilizerApproval / fertilizerManagerApproval / itemPrices keys and request state (fertilizer services)',
  )
  @Patch('requests/:id/payment-method')
  async setPaymentMethod(
    @Param('id') id: string,
    @Body() dto: PaymentMethodDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicRequestDetail> {
    return this.requests.setPaymentMethod(
      id,
      dto.method,
      await this.resolveActor(req),
    );
  }

  @ServiceChecked(
    'fertilizer / fertilizerApproval / fertilizerManagerApproval / itemPrices keys and request state (fertilizer services)',
  )
  @Post('requests/:id/payments')
  async recordPayment(
    @Param('id') id: string,
    @Body() dto: RecordPaymentDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicRequestDetail> {
    return this.requests.recordPayment(id, dto, await this.resolveActor(req));
  }

  /* ── Prices (Administrator) ─────────────────────────────────────── */

  /** Item Prices (Administration-Addendum §5) — every version; `itemPrices: view` to read. */
  @RequirePermission('itemPrices', 'fertilizer')
  @Get('prices')
  async listPrices(@Req() req: AuthedRequest): Promise<PublicPrice[]> {
    const actor = await this.resolveActor(req);
    await this.access.require(
      actor.role,
      'view',
      'view item prices',
      'itemPrices',
    );
    return this.itemPrices.list();
  }

  /** What recent stock-ins cost per kg — for the selling-below-cost warning. */
  @RequirePermission('itemPrices')
  @Get('prices/costs')
  async purchaseCosts(@Req() req: AuthedRequest): Promise<PurchaseCost[]> {
    const actor = await this.resolveActor(req);
    await this.access.require(
      actor.role,
      'view',
      'view item prices',
      'itemPrices',
    );
    return this.itemPrices.purchaseCosts();
  }

  @ServiceChecked(
    'fertilizer / fertilizerApproval / fertilizerManagerApproval / itemPrices keys and request state (fertilizer services)',
  )
  @Post('prices')
  async setPrice(
    @Body() dto: SetPriceDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicPrice[]> {
    return this.itemPrices.set(dto, await this.resolveActor(req));
  }

  @ServiceChecked(
    'fertilizer / fertilizerApproval / fertilizerManagerApproval / itemPrices keys and request state (fertilizer services)',
  )
  @Post('prices/:id/cancel')
  async cancelPrice(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelPriceDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicPrice[]> {
    return this.itemPrices.cancel(id, dto.reason, await this.resolveActor(req));
  }

  @RequirePermission('fertilizer')
  @Get('movements')
  listMovements(): Promise<PublicMovement[]> {
    return this.fertilizerService.listMovements();
  }

  @ServiceChecked(
    'fertilizer / fertilizerApproval / fertilizerManagerApproval / itemPrices keys and request state (fertilizer services)',
  )
  @Post('movements')
  async recordMovement(
    @Body() dto: RecordMovementDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicMovement> {
    return this.fertilizerService.recordMovement(
      dto,
      await this.resolveActor(req),
    );
  }

  /** Resolves the JWT's `sub` to the acting user's display name + role for stamping. */
  private async resolveActor(
    req: AuthedRequest,
  ): Promise<Actor & { sub: number }> {
    const profile = await this.usersService.getProfile(Number(req.user.sub));
    return {
      name: profile?.name ?? 'Unknown',
      role: req.user.role,
      sub: Number(req.user.sub),
    };
  }
}
