import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { UsersService } from '../users/users.service';
import type {
  PublicAdvance,
  PublicEstate,
  PublicSettlement,
} from './estate-map';
import { CreateEstateDto } from './dto/create-estate.dto';
import { IssueAdvanceDto } from './dto/issue-advance.dto';
import { UpdateEstateDto } from './dto/update-estate.dto';
import { type Actor, EstatesService } from './estates.service';

type AuthedRequest = Request & { user: JwtPayload };

@Controller('estates')
@UseGuards(JwtAuthGuard)
export class EstatesController {
  constructor(
    private readonly estatesService: EstatesService,
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

  /** Resolves the JWT's `sub` to the acting user's display name + role for stamping. */
  private async resolveActor(req: AuthedRequest): Promise<Actor> {
    const profile = await this.usersService.getProfile(Number(req.user.sub));
    return { name: profile?.name ?? 'Unknown', role: req.user.role };
  }
}
