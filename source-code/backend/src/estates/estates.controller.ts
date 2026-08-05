import {
  Body,
  Controller,
  Get,
  Param,
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
import { IssueAdvanceDto } from './dto/issue-advance.dto';
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

type AuthedRequest = Request & { user: JwtPayload };

@Controller('estates')
@UseGuards(JwtAuthGuard)
export class EstatesController {
  constructor(
    private readonly estatesService: EstatesService,
    private readonly lifetimeService: EstateLifetimeService,
    private readonly usersService: UsersService,
  ) {}

  // Static segments (advances/settlements) are registered before the `:id`
  // catch-all so they don't get swallowed by it.

  @Get('advances')
  listAdvances(): Promise<PublicAdvance[]> {
    return this.estatesService.listAdvances();
  }

  @Post('advances')
  async issueAdvance(
    @Body() dto: IssueAdvanceDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicAdvance> {
    return this.estatesService.issueAdvance(dto, await this.resolveActor(req));
  }

  @Get('settlements')
  listSettlements(): Promise<PublicSettlement[]> {
    return this.estatesService.listSettlements();
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
    @Req() req: AuthedRequest,
  ): Promise<PublicSettlement[]> {
    return this.estatesService.processSettlements(await this.resolveActor(req));
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
    return { name: profile?.name ?? 'Unknown', role: req.user.role };
  }
}
