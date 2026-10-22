import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AgentJwtGuard } from '../auth/agent-jwt.guard';
import type { AgentJwtPayload } from '../auth/jwt-payload.interface';
import {
  AgentDeliveredDto,
  AgentFailedDto,
  AgentPickupDto,
} from './dto/fertilizer-flow.dto';
import { FertilizerDeliveryService } from './fertilizer-delivery.service';
import type { PublicAgentTask } from './fertilizer-map';

type AgentRequest = Request & { user: AgentJwtPayload };

/**
 * The collection agent's phone (Fertilizer-Delivery-Addendum §6). Agent-token only, and every
 * call is scoped to the calling agent: he sees the fertilizer on HIS stops today and can act
 * only on what was handed to him. Delivered / failed carry a device time + sync key so an
 * offline phone can send them later, once.
 */
@Controller('dispatch/me/fertilizer')
@UseGuards(AgentJwtGuard)
export class FertilizerAgentController {
  constructor(private readonly deliveries: FertilizerDeliveryService) {}

  private uid(req: AgentRequest): number {
    return Number(req.user.sub);
  }

  @Get()
  tasks(@Req() req: AgentRequest): Promise<PublicAgentTask[]> {
    return this.deliveries.agentTasks(this.uid(req));
  }

  @Post(':deliveryId/pickup')
  pickup(
    @Param('deliveryId', ParseIntPipe) deliveryId: number,
    @Body() dto: AgentPickupDto,
    @Req() req: AgentRequest,
  ): Promise<PublicAgentTask> {
    return this.deliveries.agentPickup(this.uid(req), deliveryId, dto);
  }

  @Post(':deliveryId/delivered')
  delivered(
    @Param('deliveryId', ParseIntPipe) deliveryId: number,
    @Body() dto: AgentDeliveredDto,
    @Req() req: AgentRequest,
  ): Promise<PublicAgentTask> {
    return this.deliveries.agentDelivered(this.uid(req), deliveryId, dto);
  }

  @Post(':deliveryId/failed')
  failed(
    @Param('deliveryId', ParseIntPipe) deliveryId: number,
    @Body() dto: AgentFailedDto,
    @Req() req: AgentRequest,
  ): Promise<PublicAgentTask> {
    return this.deliveries.agentFailed(this.uid(req), deliveryId, dto);
  }
}
