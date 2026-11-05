import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { localDate } from '../dispatch/dispatch-map';
import { lastCompleteMonth, PerformanceService } from './performance.service';

type AuthedRequest = Request & { user: JwtPayload };

const isMonth = (v: string | undefined): v is string =>
  !!v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

/** Performance (Performance-Addendum) — `performance: view`, checked in PerformanceService. */
@Controller('performance')
@UseGuards(JwtAuthGuard)
export class PerformanceController {
  constructor(private readonly performance: PerformanceService) {}

  /** The team overview: `?month=YYYY-MM` (default the last complete month), `span=1|3`, `group=agents|staff`. */
  @Get('team')
  team(
    @Query('month') month: string | undefined,
    @Query('span') span: string | undefined,
    @Query('group') group: string | undefined,
    @Req() req: AuthedRequest,
  ) {
    return this.performance.team(
      isMonth(month) ? month : lastCompleteMonth(localDate(new Date())),
      span === '3' ? 3 : 1,
      group === 'staff' ? 'staff' : 'agents',
      { role: req.user.role },
    );
  }
}
