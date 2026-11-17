import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { UsersService } from '../users/users.service';
import {
  type DashboardActor,
  type DashboardSummary,
  DashboardService,
} from './dashboard.service';

type AuthedRequest = Request & { user: JwtPayload };

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(
    private readonly dashboard: DashboardService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * The signed-in user's dashboard. The role always comes from the token, never from the query
   * string, so `?role=` cannot widen what is returned; the role's `role_permissions` decide every
   * section and item.
   */
  @Get('summary')
  async summary(@Req() req: AuthedRequest): Promise<DashboardSummary> {
    const sub = Number(req.user.sub);
    const profile = await this.usersService.getProfile(sub);
    const actor: DashboardActor = {
      name: profile?.name ?? 'Unknown',
      role: req.user.role as DashboardActor['role'],
      sub: Number.isFinite(sub) ? sub : undefined,
    };
    return this.dashboard.summary(actor);
  }
}
