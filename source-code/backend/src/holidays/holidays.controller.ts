import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { DispatchAccessService } from '../dispatch/dispatch-access.service';
import { parseEmployeeId } from '../employees/employee-map';
import { UsersService } from '../users/users.service';
import {
  CancelHolidayDto,
  DeclareHolidayDto,
  DecideRequestDto,
  HolidayDto,
  HolidayTypeDto,
  RestDayDto,
  WeeklyRuleDto,
} from './dto/holiday.dto';
import { type HolidayActor, HolidayService } from './holiday.service';

type AuthedRequest = Request & { user: JwtPayload };

/**
 * The holiday calendar (Attendance-Leave-Addendum §4). Reading needs `holidayCalendar: view`;
 * every change is decided in HolidayService by the permission matrix (holiday-permissions.ts):
 * `holidayCalendar` edit / approve and `holidayStatutory` for Poya / public holidays.
 */
@Controller('holidays')
@UseGuards(JwtAuthGuard)
export class HolidaysController {
  constructor(
    private readonly holidays: HolidayService,
    private readonly access: DispatchAccessService,
    private readonly users: UsersService,
  ) {}

  @Get()
  async year(@Query('year') year: string, @Req() req: AuthedRequest) {
    await this.view(req);
    const y = Number(year) || new Date().getFullYear();
    return this.holidays.year(y, await this.actor(req));
  }

  /** Requests and emergency reviews (pending first) — the Administrator's "Pending approvals". */
  @Get('requests')
  async requests(@Req() req: AuthedRequest) {
    await this.view(req);
    return this.holidays.listRequests();
  }

  @Post('requests/:id/approve')
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DecideRequestDto,
    @Req() req: AuthedRequest,
  ) {
    return this.holidays.decideRequest(
      id,
      'approve',
      dto.reason,
      await this.actor(req),
    );
  }

  @Post('requests/:id/reject')
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DecideRequestDto,
    @Req() req: AuthedRequest,
  ) {
    return this.holidays.decideRequest(
      id,
      'reject',
      dto.reason,
      await this.actor(req),
    );
  }

  /** Last year's Poya / public names, dates blank — the template for a new year. */
  @Get('template')
  async template(@Query('from') from: string, @Req() req: AuthedRequest) {
    await this.view(req);
    return this.holidays.template(Number(from));
  }

  @Post()
  async create(@Body() dto: HolidayDto, @Req() req: AuthedRequest) {
    return this.holidays.create(dto, await this.actor(req));
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: HolidayDto,
    @Req() req: AuthedRequest,
  ) {
    return this.holidays.update(id, dto, await this.actor(req));
  }

  @Delete(':id')
  async cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelHolidayDto,
    @Req() req: AuthedRequest,
  ) {
    await this.holidays.cancel(id, dto?.reason, await this.actor(req));
  }

  @Patch('types/:type')
  async updateType(
    @Param('type') type: 'poya' | 'public' | 'weekly' | 'closure',
    @Body() dto: HolidayTypeDto,
    @Req() req: AuthedRequest,
  ) {
    await this.holidays.updateType(type, dto, await this.actor(req));
  }

  @Post('weekly')
  async weekly(@Body() dto: WeeklyRuleDto, @Req() req: AuthedRequest) {
    return this.holidays.setWeeklyRule(dto, await this.actor(req));
  }

  @Post('rest-days/:employeeId')
  async restDay(
    @Param('employeeId') employeeId: string,
    @Body() dto: RestDayDto,
    @Req() req: AuthedRequest,
  ) {
    await this.holidays.setRestDay(
      parseEmployeeId(employeeId),
      dto,
      await this.actor(req),
    );
  }

  /** What declaring would touch (attendance already marked, route days) — before confirming. */
  @Post('declare/preview')
  async declarePreview(
    @Body() dto: DeclareHolidayDto,
    @Req() req: AuthedRequest,
  ) {
    await this.access.require(
      req.user.role,
      'edit',
      'declare a holiday',
      'holidayCalendar',
    );
    return this.holidays.declarePreview(dto);
  }

  @Post('declare')
  async declare(@Body() dto: DeclareHolidayDto, @Req() req: AuthedRequest) {
    return this.holidays.declare(dto, await this.actor(req));
  }

  @Delete('declared/:group')
  async cancelDeclared(
    @Param('group') group: string,
    @Body() dto: CancelHolidayDto,
    @Req() req: AuthedRequest,
  ) {
    await this.holidays.cancelDeclared(
      group,
      dto?.reason,
      await this.actor(req),
    );
  }

  private async view(req: AuthedRequest): Promise<void> {
    await this.access.require(
      req.user.role,
      'view',
      'see the holiday calendar',
      'holidayCalendar',
    );
  }

  private async actor(req: AuthedRequest): Promise<HolidayActor> {
    const profile = await this.users.getProfile(Number(req.user.sub));
    return {
      name: profile?.name ?? 'Unknown',
      role: req.user.role,
      sub: Number(req.user.sub),
    };
  }
}
