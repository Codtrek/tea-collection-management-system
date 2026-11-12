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
import { CreateExpenseDto } from './dto/create-expense.dto';
import type { CollectionReport } from './collection-report-rules';
import type { LeafPurchaseReport } from './leaf-purchase-rules';
import {
  LeafPurchaseService,
  type LeafPurchaseQuery,
} from './leaf-purchase.service';
import {
  CollectionReportService,
  type CollectionReportQuery,
} from './collection-report.service';
import type { ExpenseReport } from './finance-rules';
import { FinanceService, type ExpenseReportQuery } from './finance.service';
import type { PublicExpenseEntry } from './reports-map';
import { type Actor, ReportsService } from './reports.service';

type AuthedRequest = Request & { user: JwtPayload };

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly collectionReports: CollectionReportService,
    private readonly leafPurchases: LeafPurchaseService,
    private readonly finance: FinanceService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * RPT-01 (Reports-Collection-Addendum). Period: `month=YYYY-MM`, `from`+`to` (YYYY-MM-DD) or
   * `thisMonth=1`; omitted → the last complete month. Filters: routeId, agentId, estateId, grade
   * (super|normal), demo=0 to hide demo rows; groupBy estate|route|agent|day.
   */
  @Get('collection')
  collectionReport(
    @Query() q: Record<string, string | undefined>,
  ): Promise<CollectionReport> {
    const int = (v?: string) => (v && /^\d+$/.test(v) ? Number(v) : undefined);
    return this.collectionReports.report({
      month: q.month,
      from: q.from,
      to: q.to,
      thisMonth: q.thisMonth === '1',
      routeId: int(q.routeId),
      agentId: int(q.agentId),
      estateId: int(q.estateId),
      grade: q.grade === 'super' || q.grade === 'normal' ? q.grade : undefined,
      includeDemo: q.demo !== '0',
      groupBy: q.groupBy as CollectionReportQuery['groupBy'],
    });
  }

  /**
   * RPT-02 Leaf Purchase Report (Reports addendum §9) — what the factory owes and pays estate owners
   * for green leaf, valued at the grade rates in force on each delivery date. Same period and
   * filter params as RPT-01; groupBy estate|route|month.
   */
  @Get('leaf-purchases')
  leafPurchaseReport(
    @Query() q: Record<string, string | undefined>,
  ): Promise<LeafPurchaseReport> {
    const int = (v?: string) => (v && /^\d+$/.test(v) ? Number(v) : undefined);
    return this.leafPurchases.report({
      month: q.month,
      from: q.from,
      to: q.to,
      thisMonth: q.thisMonth === '1',
      routeId: int(q.routeId),
      estateId: int(q.estateId),
      grade: q.grade === 'super' || q.grade === 'normal' ? q.grade : undefined,
      includeDemo: q.demo !== '0',
      groupBy: q.groupBy as LeafPurchaseQuery['groupBy'],
    });
  }

  /**
   * RPT-03 Expense report (Finance-Reports-Addendum). Same period params as RPT-01 (omitted → the
   * last complete month); groupBy category|month|entry; category= filters to one category.
   */
  @Get('expenses')
  expenseReport(
    @Query() q: Record<string, string | undefined>,
  ): Promise<ExpenseReport> {
    return this.finance.expenseReport({
      month: q.month,
      from: q.from,
      to: q.to,
      thisMonth: q.thisMonth === '1',
      groupBy: q.groupBy as ExpenseReportQuery['groupBy'],
      category: q.category,
    });
  }

  /** RPT-04 — log a manual daily expense. Officer+ (Manager read-only). */
  @Post('expenses')
  async createExpense(
    @Body() dto: CreateExpenseDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicExpenseEntry> {
    return this.reportsService.createExpense(dto, await this.resolveActor(req));
  }

  /** Resolves the JWT's `sub` to the acting user's display name + role for stamping. */
  private async resolveActor(req: AuthedRequest): Promise<Actor> {
    const profile = await this.usersService.getProfile(Number(req.user.sub));
    return { name: profile?.name ?? 'Unknown', role: req.user.role };
  }
}
