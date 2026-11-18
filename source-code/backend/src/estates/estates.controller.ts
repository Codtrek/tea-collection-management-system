import {
  Body,
  Controller,
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
import type { PublicCollection } from '../collections/collection-map';
import { UsersService } from '../users/users.service';
import type {
  PublicAdvance,
  PublicEstate,
  PublicSettlement,
} from './estate-map';
import { CreateEstateDto } from './dto/create-estate.dto';
import type { EstateAdvanceRecoveryStatus } from './estate-advance-balance';
import type { EstateAdvanceListResult } from './estate-advance-view';
import {
  type EstateAdvanceContext,
  type EstateAdvanceDetail,
  EstateAdvanceViewService,
} from './estate-advance-view.service';
import {
  EstateAdvancePlanService,
  type PublicEstateReschedule,
} from './estate-advance-plan.service';
import {
  DecideRescheduleDto,
  EstateRepaymentDto,
  RescheduleAdvanceDto,
} from './dto/estate-advance-change.dto';
import { IssueAdvanceDto } from './dto/issue-advance.dto';
import { ProcessSettlementsDto } from './dto/process-settlements.dto';
import { UpdateEstateDto } from './dto/update-estate.dto';
import type {
  EstateAnalytics,
  EstateDirectoryRow,
  EstateFertilizerRecord,
  EstateLifetimeMetrics,
  PaginatedResult,
  TimelinePage,
} from './estate-lifetime-map';
import { EstateLifetimeService } from './estate-lifetime.service';
import { type Actor, EstatesService } from './estates.service';
import {
  ALL_PERIODS,
  type SettlementListResult,
  type SettlementSort,
} from './settlement-view';
import {
  type SettlementDetail,
  SettlementViewService,
  type UnsettledOwner,
} from './settlement-view.service';

type AuthedRequest = Request & { user: JwtPayload };

const SETTLEMENT_SORTS: readonly string[] = [
  'period',
  'estate',
  'gross',
  'deductions',
  'net',
];

const ESTATE_ADVANCE_STATUSES: EstateAdvanceRecoveryStatus[] = [
  'Pending deduction',
  'Recovering',
  'Deducted',
];

@Controller('estates')
@UseGuards(JwtAuthGuard)
export class EstatesController {
  constructor(
    private readonly estatesService: EstatesService,
    private readonly lifetimeService: EstateLifetimeService,
    private readonly settlementView: SettlementViewService,
    private readonly advanceView: EstateAdvanceViewService,
    private readonly advancePlans: EstateAdvancePlanService,
    private readonly usersService: UsersService,
  ) {}

  // Static segments (advances/settlements) are registered before the `:id`
  // catch-all so they don't get swallowed by it.

  /**
   * EST-05 (Estate-Owner-Advances-Addendum §3) — filtered + paged; `from`/`to` are the date
   * issued, but advances still pending deduction always show. `summary` covers the range only.
   */
  @Get('advances')
  listAdvances(
    @Query('search') search?: string,
    @Query('routeId') routeId?: string,
    @Query('status') status?: string,
    @Query('issuedBy') issuedBy?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<EstateAdvanceListResult> {
    const day = (d?: string) =>
      d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined;
    return this.advanceView.list({
      search,
      routeId: routeId ? Number(routeId) : undefined,
      status: ESTATE_ADVANCE_STATUSES.includes(
        status as EstateAdvanceRecoveryStatus,
      )
        ? (status as EstateAdvanceRecoveryStatus)
        : undefined,
      issuedBy: issuedBy || undefined,
      from: day(from),
      to: day(to),
      page: page ? Number(page) : undefined,
      pageSize: limit !== undefined ? Number(limit) : undefined,
    });
  }

  /** One advance: its deduction schedule and which settlement recovered each part. */
  @Get('advances/:aid')
  advanceDetail(@Param('aid') aid: string): Promise<EstateAdvanceDetail> {
    return this.advanceView.detail(aid);
  }

  /** §4 — ask to change the plan; someone else approves. Processed periods never change. */
  @Post('advances/:aid/reschedules')
  async requestReschedule(
    @Param('aid') aid: string,
    @Body() dto: RescheduleAdvanceDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicEstateReschedule> {
    return this.advancePlans.requestReschedule(
      aid,
      dto,
      await this.resolveActor(req),
    );
  }

  @Patch('advances/:aid/reschedules/:rid')
  async decideReschedule(
    @Param('aid') aid: string,
    @Param('rid', ParseIntPipe) rid: number,
    @Body() dto: DecideRescheduleDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicEstateReschedule> {
    return this.advancePlans.decideReschedule(
      aid,
      rid,
      dto,
      await this.resolveActor(req),
    );
  }

  /** §4 — an early repayment in cash or by bank transfer. */
  @Post('advances/:aid/repayments')
  async recordRepayment(
    @Param('aid') aid: string,
    @Body() dto: EstateRepaymentDto,
    @Req() req: AuthedRequest,
  ): Promise<{ remaining: number }> {
    return this.advancePlans.recordRepayment(
      aid,
      dto,
      await this.resolveActor(req),
    );
  }

  @Post('advances')
  async issueAdvance(
    @Body() dto: IssueAdvanceDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicAdvance> {
    return this.estatesService.issueAdvance(dto, await this.resolveActor(req));
  }

  /**
   * EST-07 period view (Settlement-Period-View-Addendum) — `month` is 'YYYY-MM' or 'all'
   * (default: all). Filtered, sorted and paged here; `summary` is always the whole period.
   * `limit=0` returns every filtered row (the CSV export).
   */
  @Get('settlements')
  listSettlements(
    @Query('month') month?: string,
    @Query('search') search?: string,
    @Query('routeId') routeId?: string,
    @Query('status') status?: string,
    @Query('method') method?: string,
    @Query('nonPositive') nonPositive?: string,
    @Query('sort') sort?: string,
    @Query('dir') dir?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<SettlementListResult> {
    return this.settlementView.list({
      month:
        month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : ALL_PERIODS,
      search,
      routeId: routeId ? Number(routeId) : undefined,
      status:
        status === 'Pending' || status === 'Processed' ? status : undefined,
      method: method === 'bank' || method === 'cash' ? method : undefined,
      nonPositive: nonPositive === 'true' || nonPositive === '1',
      sort: SETTLEMENT_SORTS.includes(sort as SettlementSort)
        ? (sort as SettlementSort)
        : undefined,
      dir: dir === 'asc' || dir === 'desc' ? dir : undefined,
      page: page ? Number(page) : undefined,
      limit: limit !== undefined ? Number(limit) : undefined,
    });
  }

  /** "Owners not yet settled" — active owners who delivered in `month` with no settlement row. */
  @Get('settlements/unsettled')
  unsettledOwners(@Query('month') month: string): Promise<UnsettledOwner[]> {
    return this.settlementView.unsettled(month);
  }

  /** One settlement: deliveries + grade lines, each deduction line, net. */
  @Get('settlements/:sid')
  settlementDetail(@Param('sid') sid: string): Promise<SettlementDetail> {
    return this.settlementView.detail(sid);
  }

  /**
   * EST-01 amended — the roster-wide directory (registered before the `:id`
   * catch-all for the same reason `advances`/`settlements` are). Distinct
   * from `GET /estates` below: that one stays a lightweight id+name lookup
   * for the four other screens that use it; this one does real aggregation.
   */
  @Get('directory')
  directory(): Promise<EstateDirectoryRow[]> {
    return this.lifetimeService.directory();
  }

  @Post('settlements/process')
  async processSettlements(
    @Body() dto: ProcessSettlementsDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicSettlement[]> {
    return this.estatesService.processSettlements(
      await this.resolveActor(req),
      dto.period,
    );
  }

  @Get()
  findAll(): Promise<PublicEstate[]> {
    return this.estatesService.findAll();
  }

  @Post()
  async create(
    @Body() dto: CreateEstateDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicEstate> {
    return this.estatesService.create(dto, await this.resolveActor(req));
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<PublicEstate> {
    return this.estatesService.findById(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEstateDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicEstate> {
    return this.estatesService.update(id, dto, await this.resolveActor(req));
  }

  @Patch(':id/deactivate')
  async deactivate(
    @Param('id') id: string,
    @Req() req: AuthedRequest,
  ): Promise<PublicEstate> {
    return this.estatesService.deactivate(id, await this.resolveActor(req));
  }

  // ── Estate Owner Lifetime History (EST-03 amended + EST-10) ──────

  /** Issue form helper (§4–5): open advance balance, 3-period average net, plan limits. */
  @Get(':id/advance-context')
  advanceContext(@Param('id') id: string): Promise<EstateAdvanceContext> {
    return this.advanceView.context(id);
  }

  /** §3 — the shared selector every Lifetime Summary figure comes from. */
  @Get(':id/lifetime')
  lifetimeMetrics(@Param('id') id: string): Promise<EstateLifetimeMetrics> {
    return this.lifetimeService.lifetime(id);
  }

  /** §5 — the merged Delivery/Fertilizer/Settlement/Advance/Account feed. */
  @Get(':id/timeline')
  timeline(
    @Param('id') id: string,
    @Query('type') type?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<TimelinePage> {
    return this.lifetimeService.timeline(id, {
      type,
      from,
      to,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /** §9 — EST-09 pre-scoped to this owner. */
  @Get(':id/analytics')
  analytics(@Param('id') id: string): Promise<EstateAnalytics> {
    return this.lifetimeService.analytics(id);
  }

  /** §7 — paginated Deliveries tab, default window last 90 days. */
  @Get(':id/deliveries')
  deliveries(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedResult<PublicCollection>> {
    return this.lifetimeService.deliveries(id, {
      from,
      to,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /** §7 — paginated Payments tab, default window last 90 days. */
  @Get(':id/payments')
  payments(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedResult<PublicSettlement>> {
    return this.lifetimeService.payments(id, {
      from,
      to,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /**
   * §7 — paginated Advances tab, default window last 90 days. Distinct route
   * shape from the global `GET /estates/advances` above (an extra `:id`
   * segment), so there's no ordering conflict between the two.
   */
  @Get(':id/advances')
  advancesForEstate(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedResult<PublicAdvance>> {
    return this.lifetimeService.advancesFor(id, {
      from,
      to,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /**
   * EST-03 amended — paginated Fertilizer tab, default window last 90 days.
   * The Timeline's Fertilizer entries' `recordHref` deep-links here.
   */
  @Get(':id/fertilizer')
  fertilizerForEstate(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedResult<EstateFertilizerRecord>> {
    return this.lifetimeService.fertilizerFor(id, {
      from,
      to,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /** Resolves the JWT's `sub` to the acting user's display name + role for stamping. */
  private async resolveActor(req: AuthedRequest): Promise<Actor> {
    const profile = await this.usersService.getProfile(Number(req.user.sub));
    return {
      name: profile?.name ?? 'Unknown',
      role: req.user.role,
      sub: Number(req.user.sub),
    };
  }
}
