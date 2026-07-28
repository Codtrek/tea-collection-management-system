import {
  Controller,
  ForbiddenException,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { AuditService } from './audit.service';
import type { PublicAuditEntry } from './audit-map';

type AuthedRequest = Request & { user: JwtPayload };

/**
 * ADM-04 — read-only audit trail. Administrator-only (the portal already wraps
 * `AuditLogsPage` in `AdminGuard`); the role check here mirrors that so the
 * endpoint can't be read directly by an Officer/Manager.
 */
@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(
    @Req() req: AuthedRequest,
    @Query('module') module?: string,
    @Query('user') user?: string,
    @Query('search') search?: string,
  ): Promise<PublicAuditEntry[]> {
    if (req.user.role !== 'Administrator') {
      throw new ForbiddenException('Only an Administrator can view audit logs.');
    }
    return this.auditService.list({ module, user, search });
  }
}
