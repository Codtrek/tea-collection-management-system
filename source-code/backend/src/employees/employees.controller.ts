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
import { UsersService } from '../users/users.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { DecideAdvanceDto } from './dto/decide-advance.dto';
import { GeneratePayrollDto } from './dto/generate-payroll.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { ProcessPayrollDto } from './dto/process-payroll.dto';
import { RequestAdvanceDto } from './dto/request-advance.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import type {
  PublicAdvance,
  PublicAttendance,
  PublicEmployee,
  PublicPayrollRow,
} from './employee-map';
import { type Actor, EmployeesService } from './employees.service';

type AuthedRequest = Request & { user: JwtPayload };

@Controller('employees')
@UseGuards(JwtAuthGuard)
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly usersService: UsersService,
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

  @Post('attendance')
  async markAttendance(
    @Body() dto: MarkAttendanceDto,
    @Req() req: AuthedRequest,
  ): Promise<void> {
    return this.employeesService.markAttendance(
      dto,
      await this.resolveActor(req),
    );
  }

  @Get('advances')
  listAdvances(): Promise<PublicAdvance[]> {
    return this.employeesService.listAdvances();
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
      dto.decision,
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
    const profile = await this.usersService.getProfile(Number(req.user.sub));
    return { name: profile?.name ?? 'Unknown', role: req.user.role };
  }
}
