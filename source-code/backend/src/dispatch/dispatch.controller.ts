import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { parseEstateId } from '../estates/estate-map';
import { UsersService } from '../users/users.service';
import {
  CreateCoverRequestDto,
  MarkAbsentDto,
  ReassignRouteDto,
} from './dto/dispatch.dto';
import { DispatchAccessService } from './dispatch-access.service';
import { localDate } from './dispatch-map';
import { DispatchService, type DispatchActor } from './dispatch.service';

type AuthedRequest = Request & { user: JwtPayload };

/** Portal-facing dispatch API. Every route is gated by the data-driven `dispatch` level. */
@Controller('dispatch')
@UseGuards(JwtAuthGuard)
export class DispatchController {
  constructor(
    private readonly dispatch: DispatchService,
    private readonly access: DispatchAccessService,
    private readonly users: UsersService,
  ) {}

  @Get('board')
  async board(@Req() req: AuthedRequest) {
    await this.access.require(req.user.role, 'view', 'view the dispatch board');
    return this.dispatch.board();
  }

  @Get('alerts/missed-checkins')
  async missedCheckins(@Req() req: AuthedRequest) {
    await this.access.require(req.user.role, 'view', 'view dispatch alerts');
    return this.dispatch.missedCheckins();
  }

  @Get('routes/:id/cover-candidates')
  async candidates(
    @Param('id', ParseIntPipe) routeId: number,
    @Req() req: AuthedRequest,
  ) {
    await this.access.require(req.user.role, 'edit', 'look for cover');
    return this.dispatch.candidates(routeId);
  }

  /** COL-02 helper: who handles a route on a date (cover wins). Needs only Collection view. */
  @Get('routes/:id/agent')
  async agentForRoute(
    @Param('id', ParseIntPipe) routeId: number,
    @Query('date') date: string | undefined,
    @Req() req: AuthedRequest,
  ) {
    await this.access.require(
      req.user.role,
      'view',
      'view collections',
      'collection',
    );
    if (date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('date must be YYYY-MM-DD.');
    }
    return (
      (await this.dispatch.agentForRoute(
        routeId,
        date ?? localDate(new Date()),
      )) ?? null
    );
  }

  /** COL-02: an estate's route + today's agent (cover-aware). `:id` is 'EST-0002' or a bare number. */
  @Get('estates/:id/route-agent')
  async routeAgentForEstate(
    @Param('id') id: string,
    @Query('date') date: string | undefined,
    @Req() req: AuthedRequest,
  ) {
    await this.access.require(
      req.user.role,
      'view',
      'view collections',
      'collection',
    );
    if (date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('date must be YYYY-MM-DD.');
    }
    const estateId = /^\d+$/.test(id) ? Number(id) : parseEstateId(id);
    if (!Number.isInteger(estateId)) {
      throw new NotFoundException(`No estate “${id}”.`);
    }
    return this.dispatch.routeAgentForEstate(
      estateId,
      date ?? localDate(new Date()),
    );
  }

  @Post('agents/:id/absence')
  async markAbsent(
    @Param('id', ParseIntPipe) agentId: number,
    @Body() dto: MarkAbsentDto,
    @Req() req: AuthedRequest,
  ) {
    await this.access.require(req.user.role, 'edit', 'mark an agent absent');
    return this.dispatch.markAbsent(agentId, dto.reason, await this.actor(req));
  }

  @Delete('agents/:id/absence')
  async markAvailable(
    @Param('id', ParseIntPipe) agentId: number,
    @Req() req: AuthedRequest,
  ) {
    await this.access.require(req.user.role, 'edit', 'mark an agent available');
    return this.dispatch.markAvailable(agentId, await this.actor(req));
  }

  @Post('cover-requests')
  async createCover(
    @Body() dto: CreateCoverRequestDto,
    @Req() req: AuthedRequest,
  ) {
    await this.access.require(req.user.role, 'edit', 'send a cover request');
    return this.dispatch.createCoverRequest(dto, await this.actor(req));
  }

  @Post('routes/:id/reassign')
  async reassign(
    @Param('id', ParseIntPipe) routeId: number,
    @Body() dto: ReassignRouteDto,
    @Req() req: AuthedRequest,
  ) {
    // a permanent change is a bigger decision than a one-day swap
    if (dto.scope === 'permanent') {
      await this.access.require(
        req.user.role,
        'approve',
        'reassign a route permanently',
      );
    } else {
      await this.access.require(req.user.role, 'edit', 'reassign a route');
    }
    return this.dispatch.reassign(routeId, dto, await this.actor(req));
  }

  private async actor(req: AuthedRequest): Promise<DispatchActor> {
    const profile = await this.users.getProfile(Number(req.user.sub));
    return {
      name: profile?.name ?? 'Unknown',
      role: req.user.role,
      sub: Number(req.user.sub),
    };
  }
}
