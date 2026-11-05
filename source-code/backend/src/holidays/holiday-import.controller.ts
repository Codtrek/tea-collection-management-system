import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { UsersService } from '../users/users.service';
import {
  ImportConfirmDto,
  ImportFileDto,
  ResyncItemDto,
} from './dto/holiday-import.dto';
import { HolidayImportService } from './holiday-import.service';
import type { HolidayActor } from './holiday.service';

type AuthedRequest = Request & { user: JwtPayload };

/** Import Sri Lanka holidays (Attendance-Leave-Addendum §4.5) — `holidayStatutory: edit`, checked in the service. */
@Controller('holidays/import')
@UseGuards(JwtAuthGuard)
export class HolidayImportController {
  constructor(
    private readonly imports: HolidayImportService,
    private readonly users: UsersService,
  ) {}

  @Get('google')
  async google(@Query('year') year: string, @Req() req: AuthedRequest) {
    return this.imports.previewGoogle(yearOf(year), await this.actor(req));
  }

  @Post('file')
  async file(@Body() dto: ImportFileDto, @Req() req: AuthedRequest) {
    return this.imports.previewFile(
      dto.year,
      dto.format,
      dto.content,
      await this.actor(req),
    );
  }

  @Post('confirm')
  async confirm(@Body() dto: ImportConfirmDto, @Req() req: AuthedRequest) {
    return this.imports.confirm(dto, await this.actor(req));
  }

  @Get('resync')
  async resync(@Query('year') year: string, @Req() req: AuthedRequest) {
    return this.imports.resync(yearOf(year), await this.actor(req));
  }

  @Post('resync/accept')
  async accept(@Body() dto: ResyncItemDto, @Req() req: AuthedRequest) {
    await this.imports.acceptDiff(
      dto.year,
      dto.kind,
      dto.uid,
      dto.type,
      await this.actor(req),
    );
  }

  @Post('resync/ignore')
  async ignore(@Body() dto: ResyncItemDto, @Req() req: AuthedRequest) {
    await this.imports.ignoreDiff(dto.year, dto.uid, await this.actor(req));
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

function yearOf(v: string): number {
  const y = Number(v);
  return Number.isInteger(y) && y >= 2000 && y <= 2100
    ? y
    : new Date().getFullYear();
}
