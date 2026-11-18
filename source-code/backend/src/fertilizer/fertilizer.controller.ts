import {
  Body,
  Controller,
  Get,
  Param,
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
  SetPriceDto,
} from './dto/fertilizer-flow.dto';
import { RecordMovementDto } from './dto/record-movement.dto';
import { FertilizerDeliveryService } from './fertilizer-delivery.service';
import type {
  PublicBatch,
  PublicItemPosition,
  PublicMovement,
  PublicPrice,
  PublicRequest,
  PublicRequestDetail,
} from './fertilizer-map';
import { FertilizerRequestService } from './fertilizer-request.service';
import { FertilizerViewService } from './fertilizer-view.service';
import { type Actor, FertilizerService } from './fertilizer.service';

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
  ) {}

  @Get('positions')
  listPositions(): Promise<PublicItemPosition[]> {
    return this.fertilizerService.listPositions();
  }

  @Get('batches')
  listBatches(): Promise<PublicBatch[]> {
    return this.fertilizerService.listBatches();
  }

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

  @Get('batches/:id')
  getBatch(@Param('id') id: string): Promise<PublicBatch> {
    return this.fertilizerService.getBatch(id);
  }

  @Patch('batches/:id/discard')
  async discardBatch(
    @Param('id') id: string,
    @Req() req: AuthedRequest,
  ): Promise<PublicBatch> {
    return this.fertilizerService.discardBatch(
      id,
      await this.resolveActor(req),
    );
  }

  /* ── Requests (Fertilizer-Delivery-Addendum) ───────────────────── */

  @Get('requests')
  async listRequests(): Promise<PublicRequest[]> {
    await this.deliveries.reconcile();
    return this.view.list();
  }

  /** FERT-07: one order → one request per item, sharing an order reference. */
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

  @Get('requests/:id')
  async getRequest(@Param('id') id: string): Promise<PublicRequestDetail> {
    const request = await this.view.find(id);
    await this.deliveries.reconcile(new Date(), request.id);
    return this.view.detail(request.id);
  }

  /** Factory Officer: approve / partially approve / reject (`fertilizerApproval: approve`). */
  @Patch('requests/:id/decide')
  async decideRequest(
    @Param('id') id: string,
    @Body() dto: DecideRequestDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicRequestDetail> {
    return this.requests.decide(id, dto, await this.resolveActor(req));
  }

  /** Factory Manager: the second sign-off above the limit (`fertilizerManagerApproval: approve`). */
  @Patch('requests/:id/manager-decide')
  async managerDecide(
    @Param('id') id: string,
    @Body() dto: ManagerDecideDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicRequestDetail> {
    return this.requests.managerDecide(id, dto, await this.resolveActor(req));
  }

  @Post('requests/:id/ready')
  async markReady(
    @Param('id') id: string,
    @Req() req: AuthedRequest,
  ): Promise<PublicRequestDetail> {
    return this.deliveries.markReady(id, await this.resolveActor(req));
  }

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

  @Post('requests/:id/check-in')
  async checkIn(
    @Param('id') id: string,
    @Body() dto: QuantityDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicRequestDetail> {
    return this.deliveries.checkIn(id, dto.qtyKg, await this.resolveActor(req));
  }

  @Post('requests/:id/retry')
  async retry(
    @Param('id') id: string,
    @Body() dto: RetryDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicRequestDetail> {
    return this.deliveries.retry(id, dto.date, await this.resolveActor(req));
  }

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

  @Post('requests/:id/cancel')
  async cancel(
    @Param('id') id: string,
    @Body() dto: ReasonDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicRequestDetail> {
    return this.requests.cancel(id, dto.reason, await this.resolveActor(req));
  }

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

  @Post('requests/:id/payments')
  async recordPayment(
    @Param('id') id: string,
    @Body() dto: RecordPaymentDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicRequestDetail> {
    return this.requests.recordPayment(id, dto, await this.resolveActor(req));
  }

  /* ── Prices (Administrator) ─────────────────────────────────────── */

  @Get('prices')
  listPrices(): Promise<PublicPrice[]> {
    return this.requests.listPrices();
  }

  @Post('prices')
  async setPrice(
    @Body() dto: SetPriceDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicPrice[]> {
    return this.requests.setPrice(dto, await this.resolveActor(req));
  }

  @Get('movements')
  listMovements(): Promise<PublicMovement[]> {
    return this.fertilizerService.listMovements();
  }

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
