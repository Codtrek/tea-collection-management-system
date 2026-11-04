import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { UsersService } from '../users/users.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import type {
  CollectionReport,
  ExpenseReport,
  PublicExpenseEntry,
  RevenueReport,
} from './reports-map';
import { type Actor, ReportsService } from './reports.service';

type AuthedRequest = Request & { user: JwtPayload };

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly usersService: UsersService,
  ) {}

  /** RPT-01. `period` is a 'YYYY-MM' key; omit for the latest month with data. */
  @Get('collection')
  collectionReport(@Query('period') period?: string): Promise<CollectionReport> {
    return this.reportsService.collectionReport(period);
  }

  /** RPT-02 — from processed settlements only. */
  @Get('revenue')
  revenueReport(@Query('period') period?: string): Promise<RevenueReport> {
    return this.reportsService.revenueReport(period);
  }

  /** RPT-03 — payroll + settlement transport/fertilizer + manual entries. */
  @Get('expenses')
  expenseReport(@Query('period') period?: string): Promise<ExpenseReport> {
    return this.reportsService.expenseReport(period);
  }

  /** RPT-04 — log a manual daily expense. Officer+ (Manager read-only). */
  @Post('expenses')
  async createExpense(
    @Body() dto: CreateExpenseDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicExpenseEntry> {
    return this.reportsService.createExpense(
      dto,
      await this.resolveActor(req),
    );
  }

  /** Resolves the JWT's `sub` to the acting user's display name + role for stamping. */
  private async resolveActor(req: AuthedRequest): Promise<Actor> {
    const profile = await this.usersService.getProfile(Number(req.user.sub));
    return { name: profile?.name ?? 'Unknown', role: req.user.role };
  }
}
