import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { UsersService } from '../users/users.service';
import { type Actor, AdminService } from './admin.service';
import type {
  PermissionMatrix,
  PublicFactoryProfile,
  PublicGradeRate,
  PublicSystemUser,
  PublicTransportRate,
} from './admin-map';
import {
  CancelVersionDto,
  CreateGradeRateDto,
  CreateTransportRateDto,
  UpdateFactoryProfileDto,
} from './dto/create-grade-rate.dto';
import type { TransportStatus } from './transport-rules';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';

type AuthedRequest = Request & { user: JwtPayload };

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly usersService: UsersService,
  ) {}

  // ── ADM-01 grade rates ──
  @Get('grade-rates')
  listGradeRates(): Promise<PublicGradeRate[]> {
    return this.adminService.listGradeRates();
  }

  @Post('grade-rates')
  async createGradeRate(
    @Body() dto: CreateGradeRateDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicGradeRate> {
    return this.adminService.createGradeRate(dto, await this.resolveActor(req));
  }

  /** Cancel a scheduled version before it starts (reason required, audited). */
  @Post('grade-rates/:id/cancel')
  async cancelGradeRate(
    @Param('id') id: string,
    @Body() dto: CancelVersionDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicGradeRate[]> {
    return this.adminService.cancelGradeRate(
      id,
      dto.reason,
      await this.resolveActor(req),
    );
  }

  // ── ADM-01 transport rates (Administration-Addendum §4) ──
  @Get('transport-rates')
  listTransportRates(): Promise<{
    versions: PublicTransportRate[];
    status: TransportStatus;
  }> {
    return this.adminService.listTransportRates();
  }

  @Post('transport-rates')
  async createTransportRate(
    @Body() dto: CreateTransportRateDto,
    @Req() req: AuthedRequest,
  ): Promise<{ versions: PublicTransportRate[]; status: TransportStatus }> {
    return this.adminService.createTransportRate(
      dto,
      await this.resolveActor(req),
    );
  }

  @Post('transport-rates/:id/cancel')
  async cancelTransportRate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelVersionDto,
    @Req() req: AuthedRequest,
  ): Promise<{ versions: PublicTransportRate[]; status: TransportStatus }> {
    return this.adminService.cancelTransportRate(
      id,
      dto.reason,
      await this.resolveActor(req),
    );
  }

  // ── ADM-01 factory profile (Administration-Addendum §2) ──
  @Get('factory-profile')
  async getFactoryProfile(
    @Req() req: AuthedRequest,
  ): Promise<PublicFactoryProfile> {
    return this.adminService.getFactoryProfile(await this.resolveActor(req));
  }

  @Put('factory-profile')
  async updateFactoryProfile(
    @Body() dto: UpdateFactoryProfileDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicFactoryProfile> {
    return this.adminService.updateFactoryProfile(
      dto,
      await this.resolveActor(req),
    );
  }

  // ── ADM-02 permission matrix ──
  @Get('permissions')
  getPermissions(): Promise<PermissionMatrix> {
    return this.adminService.getPermissionMatrix();
  }

  @Put('permissions')
  async updatePermissions(
    @Body() dto: UpdatePermissionsDto,
    @Req() req: AuthedRequest,
  ): Promise<PermissionMatrix> {
    return this.adminService.updatePermissions(
      dto,
      await this.resolveActor(req),
    );
  }

  // ── ADM-03 system settings ──
  @Get('settings')
  getSettings(): Promise<Record<string, unknown>> {
    return this.adminService.getSettings();
  }

  @Put('settings')
  async updateSettings(
    @Body() dto: UpdateSettingsDto,
    @Req() req: AuthedRequest,
  ): Promise<Record<string, unknown>> {
    return this.adminService.updateSettings(dto, await this.resolveActor(req));
  }

  // ── ADM-02 system users ──
  @Get('users')
  listUsers(): Promise<PublicSystemUser[]> {
    return this.adminService.listUsers();
  }

  @Post('users/:id/suspend')
  async suspendUser(
    @Param('id') id: string,
    @Req() req: AuthedRequest,
  ): Promise<PublicSystemUser> {
    return this.adminService.suspendUser(id, await this.resolveActor(req));
  }

  @Post('users/:id/reset-password')
  async resetPassword(
    @Param('id') id: string,
    @Req() req: AuthedRequest,
  ): Promise<{ ok: true }> {
    return this.adminService.resetPassword(id, await this.resolveActor(req));
  }

  /** Resolves the JWT's `sub` to the acting user's name + role (+ id) for stamping. */
  private async resolveActor(req: AuthedRequest): Promise<Actor> {
    const sub = Number(req.user.sub);
    const profile = await this.usersService.getProfile(sub);
    return { name: profile?.name ?? 'Unknown', role: req.user.role, sub };
  }
}
