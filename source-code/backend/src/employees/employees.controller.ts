import {
  type AttendanceDay,
  type AttendanceMonth,
  AttendanceService,
} from './attendance.service';
import {
  Body,
  Controller,
  Get,
  NotFoundException,
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
import { AgentHistoryService } from '../dispatch/agent-history.service';
import { DispatchAccessService } from '../dispatch/dispatch-access.service';
import { AgentFertilizerHistoryService } from '../fertilizer/agent-fertilizer-history.service';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { UsersService } from '../users/users.service';
import { AGENT_JOB_ROLE, EMPLOYEE_ROLES } from './employee-roles';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { DecideAdvanceDto } from './dto/decide-advance.dto';
import { GeneratePayrollDto } from './dto/generate-payroll.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { ProcessPayrollDto } from './dto/process-payroll.dto';
import { RequestAdvanceDto } from './dto/request-advance.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import {
  parseEmployeeId,
  type PublicAdvance,
  type PublicAttendance,
  type PublicEmployee,
  type PublicPayrollRow,
} from './employee-map';
import { type Actor, EmployeesService } from './employees.service';
import type {
  AdvanceListResult,
  AdvanceSort,
  AdvanceTab,
} from './advance-view';
import { localDate } from '../dispatch/dispatch-map';
import {
  PAYROLL_ISSUES,
  type PayrollIssue,
  type PayrollMonthResult,
  type PayrollSort,
} from './payroll-view';
import { PayrollViewService } from './payroll-view.service';
import {
  type PayrollSettings,
  PayrollSettingsService,
} from './payroll-settings.service';
import {
  AdvancePlanService,
  type PublicReschedule,
} from './advance-plan.service';
import {
  CashRepaymentDto,
  DecideRescheduleDto,
  RescheduleAdvanceDto,
} from './dto/advance-change.dto';
import {
  type AdvanceDetail,
  AdvanceViewService,
  type EmployeeAdvances,
} from './advance-view.service';

type AuthedRequest = Request & { user: JwtPayload };

const ADVANCE_TABS: readonly string[] = [
  'decide',
  'approved',
  'rejected',
  'all',
];
const PAYROLL_SORTS: readonly string[] = [
  'employee',
  'gross',
  'deductions',
  'net',
];
const ADVANCE_SORTS: readonly string[] = [
  'date',
  'amount',
  'employee',
  'remaining',
];

@Controller('employees')
@UseGuards(JwtAuthGuard)
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly usersService: UsersService,
    private readonly agentHistory: AgentHistoryService,
    private readonly access: DispatchAccessService,
    private readonly agentFertilizer: AgentFertilizerHistoryService,
    private readonly advanceView: AdvanceViewService,
    private readonly payrollView: PayrollViewService,
    private readonly advancePlans: AdvancePlanService,
    private readonly payrollSettings: PayrollSettingsService,
    private readonly attendance: AttendanceService,
  ) {}

  // Static segments (attendance/advances/payroll) are registered before the
  // `:id` catch-all so they don't get swallowed by it.

  @Get('attendance')
  listAttendance(
    @Query('employeeId') employeeId?: string,
    @Query('month') month?: string,
  ): Promise<PublicAttendance[]> {
    return this.employeesService.listAttendance(employeeId, month);
  }

  /**
   * Attendance-Leave-Addendum Phase 1 — the month grid (`month=YYYY-MM`; filters run here) and the
   * one-date view used by the Day tab and the daily entry page.
   */
  @Get('attendance/month')
  attendanceMonth(
    @Query('month') month: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('routeId') routeId?: string,
    @Query('unmarked') unmarked?: string,
    @Query('employeeId') employeeId?: string,
  ): Promise<AttendanceMonth> {
    return this.attendance.month(month, {
      search,
      role: role || undefined,
      routeId: routeId ? Number(routeId) : undefined,
      unmarked: unmarked === 'true' || unmarked === '1',
      employeeId: employeeId || undefined,
    });
  }

  @Get('attendance/day')
  attendanceDay(@Query('date') date: string): Promise<AttendanceDay> {
    return this.attendance.day(date, null);
  }

  /** Roll-call for one date — no future dates, the edit window, payroll lock, holiday rules. */
  @Post('attendance')
  async markAttendance(
    @Body() dto: MarkAttendanceDto,
    @Req() req: AuthedRequest,
  ): Promise<void> {
    return this.attendance.mark(dto, await this.resolveActor(req));
  }

  /**
   * EMP-10 (Salary-Advances-Addendum) — tab + request-date range + filters, server-side.
   * "Needs decision" (tab=decide) ignores the range so an old pending request is never hidden.
   */
  @Get('advances')
  listAdvances(
    @Query('tab') tab?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('routeId') routeId?: string,
    @Query('min') min?: string,
    @Query('max') max?: string,
    @Query('sort') sort?: string,
    @Query('dir') dir?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<AdvanceListResult> {
    const isDate = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
    const num = (v?: string) =>
      v !== undefined && v !== '' && !Number.isNaN(Number(v))
        ? Number(v)
        : undefined;
    return this.advanceView.list({
      tab: (ADVANCE_TABS.includes(tab ?? '') ? tab : 'all') as AdvanceTab,
      from: isDate(from) ? from : undefined,
      to: isDate(to) ? to : undefined,
      search,
      role: role || undefined,
      routeId: num(routeId),
      min: num(min),
      max: num(max),
      sort: ADVANCE_SORTS.includes(sort ?? '')
        ? (sort as AdvanceSort)
        : undefined,
      dir: dir === 'asc' || dir === 'desc' ? dir : undefined,
      page: num(page),
      limit: num(limit),
    });
  }

  /** The repayment rules the request form validates against (the server checks again). */
  @Get('advances/settings')
  advanceSettings(): Promise<PayrollSettings> {
    return this.payrollSettings.get();
  }

  @Get('advances/:id')
  async advanceDetail(
    @Param('id') id: string,
    @Req() req: AuthedRequest,
  ): Promise<AdvanceDetail> {
    return this.advanceView.detail(id, await this.resolveActor(req));
  }

  /** Ask to change an approved plan — someone else approves (Salary-Advances-Addendum §10). */
  @Post('advances/:id/reschedules')
  async requestReschedule(
    @Param('id') id: string,
    @Body() dto: RescheduleAdvanceDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicReschedule> {
    return this.advancePlans.requestReschedule(
      id,
      dto,
      await this.resolveActor(req),
    );
  }

  @Patch('advances/:id/reschedules/:rid/decide')
  async decideReschedule(
    @Param('id') id: string,
    @Param('rid') rid: string,
    @Body() dto: DecideRescheduleDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicAdvance> {
    return this.advancePlans.decideReschedule(
      id,
      Number(rid),
      dto,
      await this.resolveActor(req),
    );
  }

  /** An early repayment in cash, recorded by an officer. */
  @Post('advances/:id/repayments')
  async recordRepayment(
    @Param('id') id: string,
    @Body() dto: CashRepaymentDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicAdvance> {
    return this.advancePlans.recordCashRepayment(
      id,
      dto,
      await this.resolveActor(req),
    );
  }

  @Post('advances')
  async requestAdvance(
    @Body() dto: RequestAdvanceDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicAdvance> {
    return this.employeesService.requestAdvance(
      dto,
      await this.resolveActor(req),
    );
  }

  @Patch('advances/:id/decide')
  async decideAdvance(
    @Param('id') id: string,
    @Body() dto: DecideAdvanceDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicAdvance> {
    return this.employeesService.decideAdvance(
      id,
      dto,
      await this.resolveActor(req),
    );
  }

  @Get('payroll')
  listPayroll(
    @Query('period') period?: string,
    @Query('status') status?: string,
  ): Promise<PublicPayrollRow[]> {
    return this.employeesService.listPayroll(period, status);
  }

  /**
   * Payroll by month, Part C — one month (`YYYY-MM`, default: the current month) with live data
   * problems, server-side filters and sort, a whole-month summary and the readiness badge.
   */
  @Get('payroll/month')
  payrollMonth(
    @Query('month') month?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('routeId') routeId?: string,
    @Query('status') status?: string,
    @Query('issues') issues?: string,
    @Query('method') method?: string,
    @Query('sort') sort?: string,
    @Query('dir') dir?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PayrollMonthResult> {
    const num = (v?: string) =>
      v !== undefined && v !== '' && !Number.isNaN(Number(v))
        ? Number(v)
        : undefined;
    return this.payrollView.month({
      month:
        month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)
          ? month
          : localDate(new Date()).slice(0, 7),
      search,
      role: role || undefined,
      routeId: num(routeId),
      status:
        status === 'Pending' || status === 'Processed' ? status : undefined,
      issues: (issues ?? '')
        .split(',')
        .filter((i): i is PayrollIssue =>
          PAYROLL_ISSUES.includes(i as PayrollIssue),
        ),
      method: method === 'bank' || method === 'cash' ? method : undefined,
      sort: PAYROLL_SORTS.includes(sort ?? '')
        ? (sort as PayrollSort)
        : undefined,
      dir: dir === 'asc' || dir === 'desc' ? dir : undefined,
      page: num(page),
      limit: num(limit),
    });
  }

  @Post('payroll/generate')
  async generatePayroll(
    @Body() dto: GeneratePayrollDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicPayrollRow[]> {
    return this.employeesService.generatePayroll(
      dto,
      await this.resolveActor(req),
    );
  }

  @Post('payroll/process')
  async processPayroll(
    @Body() dto: ProcessPayrollDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicPayrollRow[]> {
    return this.employeesService.processPayroll(
      dto,
      await this.resolveActor(req),
    );
  }

  /** Single source for the role dropdown — and which title makes someone a collection agent. */
  @Get('roles')
  roles(): { roles: string[]; agentRole: string } {
    return { roles: [...EMPLOYEE_ROLES], agentRole: AGENT_JOB_ROLE };
  }

  @Get()
  findAll(): Promise<PublicEmployee[]> {
    return this.employeesService.findAll();
  }

  @Post()
  async create(
    @Body() dto: CreateEmployeeDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicEmployee> {
    return this.employeesService.create(dto, await this.resolveActor(req));
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<PublicEmployee> {
    return this.employeesService.findById(id);
  }

  /**
   * A collection agent's history (Employee detail → Collections tab): collected deliveries with
   * grade lines, plus "Covering Route X" where they covered. Paginated, last 90 days by default.
   * Needs BOTH employee and collection access.
   */
  /** An employee's advances and outstanding balance (advance-balance.ts — same as payroll). */
  @Get(':id/advances')
  employeeAdvances(@Param('id') id: string): Promise<EmployeeAdvances> {
    return this.advanceView.forEmployee(id);
  }

  @Get(':id/collections')
  async collections(
    @Param('id') id: string,
    @Req() req: AuthedRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    await this.access.require(
      req.user.role,
      'view',
      'view employees',
      'employees',
    );
    await this.access.require(
      req.user.role,
      'view',
      'view collections',
      'collection',
    );
    const employeeId = parseEmployeeId(id);
    if (!Number.isInteger(employeeId)) {
      throw new NotFoundException(`No employee with ID “${id}”.`);
    }
    return this.agentHistory.history(employeeId, {
      from,
      to,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /**
   * A collection agent's fertilizer deliveries (Employee detail → Fertilizer deliveries tab):
   * finished attempts he was handed — delivered, part delivered or failed. Same paging as
   * Collections. Needs BOTH employee and fertilizer access.
   */
  @Get(':id/fertilizer-deliveries')
  async fertilizerDeliveries(
    @Param('id') id: string,
    @Req() req: AuthedRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    await this.access.require(
      req.user.role,
      'view',
      'view employees',
      'employees',
    );
    await this.access.require(
      req.user.role,
      'view',
      'view fertilizer',
      'fertilizer',
    );
    const employeeId = parseEmployeeId(id);
    if (!Number.isInteger(employeeId)) {
      throw new NotFoundException(`No employee with ID “${id}”.`);
    }
    return this.agentFertilizer.history(employeeId, {
      from,
      to,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicEmployee> {
    return this.employeesService.update(id, dto, await this.resolveActor(req));
  }

  @Patch(':id/deactivate')
  async deactivate(
    @Param('id') id: string,
    @Req() req: AuthedRequest,
  ): Promise<PublicEmployee> {
    return this.employeesService.deactivate(id, await this.resolveActor(req));
  }

  /** Resolves the JWT's `sub` to the acting user's display name + role for stamping. */
  private async resolveActor(req: AuthedRequest): Promise<Actor> {
    const sub = Number(req.user.sub);
    const [profile, nic] = await Promise.all([
      this.usersService.getProfile(sub),
      this.usersService.getNic(sub),
    ]);
    return { name: profile?.name ?? 'Unknown', role: req.user.role, sub, nic };
  }
}
