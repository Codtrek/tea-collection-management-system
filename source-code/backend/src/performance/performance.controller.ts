import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { localDate } from '../dispatch/dispatch-map';
import { parseEmployeeId } from '../employees/employee-map';
import { UsersService } from '../users/users.service';
import type { MeasureKey } from './performance-rules';
import { lastCompleteMonth, PerformanceService } from './performance.service';

type AuthedRequest = Request & { user: JwtPayload };

class NoteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  note: string;
}

const MEASURES: MeasureKey[] = [
  'attendance',
  'absences',
  'leave',
  'routeCompletion',
  'kg',
  'weightAccuracy',
  'fertilizer',
  'coverHelp',
];

const isMonth = (v: string | undefined): v is string =>
  !!v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

/** Performance (Performance-Addendum) — `performance: view`, checked in PerformanceService. */
@Controller('performance')
@UseGuards(JwtAuthGuard)
export class PerformanceController {
  constructor(
    private readonly performance: PerformanceService,
    private readonly users: UsersService,
  ) {}

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

  /** Tolerance, minimum data and coming-soon measures — the "How performance is measured" page. */
  @Get('definitions')
  definitions(@Req() req: AuthedRequest) {
    return this.performance.definitions({ role: req.user.role });
  }

  /** One employee, month by month (`months`, default 6) — the Performance tab. */
  @Get('employees/:id')
  employee(
    @Param('id') id: string,
    @Query('months') months: string | undefined,
    @Req() req: AuthedRequest,
  ) {
    const n = Number(months);
    return this.performance.employee(
      parseEmployeeId(id),
      Number.isInteger(n) && n >= 1 && n <= 12 ? n : 6,
      { role: req.user.role },
    );
  }

  /** The records behind one measure in one month. */
  @Get('employees/:id/drill/:measure')
  drill(
    @Param('id') id: string,
    @Param('measure') measure: string,
    @Query('month') month: string | undefined,
    @Req() req: AuthedRequest,
  ) {
    return this.performance.drill(
      parseEmployeeId(id),
      MEASURES.includes(measure as MeasureKey)
        ? (measure as MeasureKey)
        : 'attendance',
      isMonth(month) ? month : lastCompleteMonth(localDate(new Date())),
      { role: req.user.role },
    );
  }

  /** A note from a conversation — performance: edit; audited. */
  @Post('employees/:id/notes')
  async addNote(
    @Param('id') id: string,
    @Body() dto: NoteDto,
    @Req() req: AuthedRequest,
  ) {
    const profile = await this.users.getProfile(Number(req.user.sub));
    return this.performance.addNote(parseEmployeeId(id), dto.note, {
      role: req.user.role,
      name: profile?.name ?? 'Unknown',
      sub: Number(req.user.sub),
    });
  }
}
