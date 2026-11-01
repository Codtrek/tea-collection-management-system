import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { outstandingFor } from './advance-balance';
import { AdvanceRecoveryEntity } from './advance-recovery.entity';
import {
  AdvancePlanService,
  type PublicReschedule,
} from './advance-plan.service';
import {
  addMonths,
  projectSchedule,
  type ScheduleMonth,
  type SelfApprovalCheck,
  selfApprovalCheck,
} from './advance-schedule';
import { localDate } from '../dispatch/dispatch-map';
import { keyToLabel } from '../reports/reports-map';
import {
  type AdvanceListResult,
  type AdvanceQuery,
  type AdvanceRow,
  listAdvanceView,
} from './advance-view';
import { parseEmployeeId } from './employee-map';
import { EmployeeEntity } from './employee.entity';
import { EmployeeRoutesService } from './employee-routes.service';
import { type Actor, EmployeesService } from './employees.service';
import { SalaryAdvanceEntity } from './salary-advance.entity';

export interface AdvanceDetail {
  advance: AdvanceRow;
  /** the employee's other advances, newest first */
  previous: AdvanceRow[];
  /** everything approved and still to be recovered through payroll */
  outstanding: number;
  /** month by month: Planned / Deducted / Carried forward (Salary-Advances-Addendum §10) */
  schedule: ScheduleMonth[];
  reschedules: PublicReschedule[];
  cashRepayments: {
    amount: number;
    paidOn: string | null;
    reference: string | null;
    recordedBy: string | null;
  }[];
  /** for the viewer: may they approve it? (enforced again on the server) */
  selfApproval: SelfApprovalCheck;
}

export interface EmployeeAdvances {
  outstanding: number;
  advances: AdvanceRow[];
}

/**
 * Salary Advances read side (Salary-Advances-Addendum): EMP-10's list with tabs / date range /
 * filters / summary, one advance's detail, and an employee's balance. Balances come from
 * advance-balance.ts — the same helpers payroll Generate / Process use.
 */
@Injectable()
export class AdvanceViewService {
  constructor(
    @InjectRepository(SalaryAdvanceEntity)
    private readonly advanceRepo: Repository<SalaryAdvanceEntity>,
    @InjectRepository(AdvanceRecoveryEntity)
    private readonly recoveryRepo: Repository<AdvanceRecoveryEntity>,
    @InjectRepository(EmployeeEntity)
    private readonly employeeRepo: Repository<EmployeeEntity>,
    private readonly employees: EmployeesService,
    private readonly employeeRoutes: EmployeeRoutesService,
    private readonly plans: AdvancePlanService,
  ) {}

  async list(q: AdvanceQuery): Promise<AdvanceListResult> {
    const [rows, routes] = await Promise.all([
      this.rows(),
      this.employeeRoutes.routes(),
    ]);
    return listAdvanceView(rows, q, routes);
  }

  async detail(id: string, viewer: Actor): Promise<AdvanceDetail> {
    const entities = await this.advanceRepo.find();
    const rows = await this.rows(entities);
    const advance = rows.find((r) => r.id === id);
    if (!advance) throw new NotFoundException(`No advance request "${id}".`);
    const employeeId = parseEmployeeId(advance.employeeId);
    const entity = entities.find((a) => a.id === id)!;
    const recoveries = (await this.recoveryRepo.find()).filter(
      (r) => r.advanceId === id,
    );
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId },
    });
    const schedule =
      entity.status === 'Rejected'
        ? []
        : projectSchedule(
            {
              amount: Number(entity.amount),
              installment: advance.plan.installment,
              startPeriod:
                advance.plan.startPeriod ??
                keyToLabel(addMonths(localDate(new Date()).slice(0, 7), 1)),
            },
            recoveries,
          ).months;
    return {
      schedule,
      reschedules: await this.plans.reschedules(id),
      cashRepayments: recoveries
        .filter((r) => r.kind === 'cash')
        .map((r) => ({
          amount: Number(r.amount),
          paidOn: r.paidOn,
          reference: r.reference,
          recordedBy: r.recordedBy,
        })),
      selfApproval: selfApprovalCheck(
        entity.requestedByUserId,
        employee?.nic ?? null,
        viewer,
      ),
      advance,
      previous: rows
        .filter((r) => r.employeeId === advance.employeeId && r.id !== id)
        .sort((a, b) => b.dateRequested.localeCompare(a.dateRequested)),
      outstanding: outstandingFor(
        entities,
        await this.recoveryRepo.find(),
        employeeId,
      ),
    };
  }

  async forEmployee(formattedId: string): Promise<EmployeeAdvances> {
    const employeeId = parseEmployeeId(formattedId);
    const entities = (await this.advanceRepo.find()).filter(
      (a) => a.employeeId === employeeId,
    );
    const rows = await this.rows(entities);
    return {
      outstanding: outstandingFor(
        entities,
        await this.recoveryRepo.find(),
        employeeId,
      ),
      advances: rows.sort((a, b) =>
        b.dateRequested.localeCompare(a.dateRequested),
      ),
    };
  }

  private async rows(entities?: SalaryAdvanceEntity[]): Promise<AdvanceRow[]> {
    const [advances, employees, routesByEmployee, recoveries] =
      await Promise.all([
        entities ? Promise.resolve(entities) : this.advanceRepo.find(),
        this.employeeRepo.find(),
        this.employeeRoutes.routesByEmployee(),
        this.recoveryRepo.find(),
      ]);
    const roleOf = new Map(employees.map((e) => [e.id, e.role]));
    return advances.map((a) => ({
      ...this.employees.toPublicAdvance(a, recoveries),
      role: roleOf.get(a.employeeId) ?? '',
      routes: routesByEmployee.get(a.employeeId) ?? [],
    }));
  }
}
