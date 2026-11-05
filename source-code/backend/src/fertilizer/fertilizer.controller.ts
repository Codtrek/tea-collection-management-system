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
import { DecideRequestDto } from './dto/decide-request.dto';
import { LogRequestDto } from './dto/log-request.dto';
import { RecordMovementDto } from './dto/record-movement.dto';
import type {
  PublicBatch,
  PublicItemPosition,
  PublicMovement,
  PublicRequest,
} from './fertilizer-map';
import { type Actor, FertilizerService } from './fertilizer.service';

type AuthedRequest = Request & { user: JwtPayload };

@Controller('fertilizer')
@UseGuards(JwtAuthGuard)
export class FertilizerController {
  constructor(
    private readonly fertilizerService: FertilizerService,
    private readonly usersService: UsersService,
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

  @Get('requests')
  listRequests(): Promise<PublicRequest[]> {
    return this.fertilizerService.listRequests();
  }

  @Post('requests')
  async logRequest(
    @Body() dto: LogRequestDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicRequest> {
    return this.fertilizerService.logRequest(dto, await this.resolveActor(req));
  }

  @Get('requests/:id')
  getRequest(@Param('id') id: string): Promise<PublicRequest> {
    return this.fertilizerService.getRequest(id);
  }

  @Patch('requests/:id/decide')
  async decideRequest(
    @Param('id') id: string,
    @Body() dto: DecideRequestDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicRequest> {
    return this.fertilizerService.decideRequest(
      id,
      dto,
      await this.resolveActor(req),
    );
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
  private async resolveActor(req: AuthedRequest): Promise<Actor> {
    const profile = await this.usersService.getProfile(Number(req.user.sub));
    return { name: profile?.name ?? 'Unknown', role: req.user.role };
  }
}
