import {
  Body,
  Controller,
  Delete,
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
import { AgentSelfService } from './agent-self.service';
import { MarkAbsentDto, PingBatchDto, PushTokenDto } from './dto/dispatch.dto';

type AgentRequest = Request & { user: AgentJwtPayload };

/**
 * The collection agent's phone talks to this controller only. Guarded by the AGENT
 * token (audience-separated from portal tokens), so an agent can never reach the
 * portal API and a portal user can never post pings as an agent.
 */
@Controller('dispatch/me')
@UseGuards(AgentJwtGuard)
export class DispatchAgentController {
  constructor(private readonly self: AgentSelfService) {}

  private uid(req: AgentRequest): number {
    return Number(req.user.sub);
  }

  @Post('shift/start')
  startShift(@Req() req: AgentRequest) {
    return this.self.startShift(this.uid(req));
  }

  @Post('shift/end')
  endShift(@Req() req: AgentRequest) {
    return this.self.endShift(this.uid(req));
  }

  @Post('absence')
  reportAbsence(@Body() dto: MarkAbsentDto, @Req() req: AgentRequest) {
    return this.self.reportAbsence(this.uid(req), dto.reason);
  }

  @Delete('absence')
  reportAvailable(@Req() req: AgentRequest) {
    return this.self.reportAvailable(this.uid(req));
  }

  /** Batch upload of queued fixes; each keeps the device's recordedAt. */
  @Post('pings')
  pings(@Body() dto: PingBatchDto, @Req() req: AgentRequest) {
    return this.self.ingestPings(this.uid(req), dto.pings);
  }

  @Get('cover-requests')
  coverRequests(@Req() req: AgentRequest) {
    return this.self.myCoverRequests(this.uid(req));
  }

  @Post('cover-requests/:id/accept')
  accept(@Param('id', ParseIntPipe) id: number, @Req() req: AgentRequest) {
    return this.self.respondToCover(this.uid(req), id, 'accept');
  }

  @Post('cover-requests/:id/decline')
  decline(@Param('id', ParseIntPipe) id: number, @Req() req: AgentRequest) {
    return this.self.respondToCover(this.uid(req), id, 'decline');
  }

  @Get('stops')
  stops(@Req() req: AgentRequest) {
    return this.self.myStops(this.uid(req));
  }

  @Post('push-token')
  async pushToken(@Body() dto: PushTokenDto, @Req() req: AgentRequest) {
    await this.self.savePushToken(this.uid(req), dto.token, dto.platform);
    return { ok: true };
  }
}
