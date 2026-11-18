import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { localDate } from '../dispatch/dispatch-map';
import { keyToLabel, labelToKey } from '../reports/reports-map';
import { formatEmployeeId } from './employee-map';
import { EmployeeEntity } from './employee.entity';
import { EmployeeRoutesService } from './employee-routes.service';
import { PayrollRunEntity } from './payroll-run.entity';
import { payslipAdvanceLines } from './advance-balance';
import { AdvanceRecoveryEntity } from './advance-recovery.entity';
import { SalaryAdvanceEntity } from './salary-advance.entity';
import {
  hasNoBankDetails,
  type PayrollMonthResult,
  payrollMonthView,
  type PayrollQuery,
  type PayrollViewRow,
} from './payroll-view';

/**
 * EMP-10 payroll by month, Part C (Payroll-Month-History-Addendum): one month's rows with live
 * data problems, server-side filters and sort, a whole-month summary and the readiness badge.
 * Reads the stored payroll rows — how payroll is calculated is unchanged.
 */
@Injectable()
export class PayrollViewService {
  constructor(
    @InjectRepository(PayrollRunEntity)
    private readonly payrollRepo: Repository<PayrollRunEntity>,
    @InjectRepository(EmployeeEntity)
    private readonly employeeRepo: Repository<EmployeeEntity>,
    @InjectRepository(SalaryAdvanceEntity)
    private readonly advanceRepo: Repository<SalaryAdvanceEntity>,
    @InjectRepository(AdvanceRecoveryEntity)
    private readonly recoveryRepo: Repository<AdvanceRecoveryEntity>,
    private readonly employeeRoutes: EmployeeRoutesService,
  ) {}

  async month(
    q: PayrollQuery,
    now: Date = new Date(),
  ): Promise<PayrollMonthResult> {
    const [runs, employees, routesByEmployee, routes, allAdvances, recoveries] =
      await Promise.all([
        this.payrollRepo.find(),
        this.employeeRepo.find(),
        this.employeeRoutes.routesByEmployee(now),
        this.employeeRoutes.routes(),
        this.advanceRepo.find(),
        this.recoveryRepo.find(),
      ]);
    const byId = new Map(employees.map((e) => [e.id, e]));
    const toRow = (r: PayrollRunEntity): PayrollViewRow => {
      const e = byId.get(r.employeeId);
      const gross = Number(r.gross);
      const advances = Number(r.deductionsAdvances);
      const other = Number(r.deductionsOther);
      const advanceLines = payslipAdvanceLines(
        r.employeeId,
        r.period,
        allAdvances,
        recoveries,
      );
      return {
        advanceLines,
        id: r.id,
        employeeId: formatEmployeeId(r.employeeId),
        employeeName: r.employeeName,
        period: r.period,
        gross,
        deductions: { advances, other },
        status: r.status,
        missingBank: r.missingBank || undefined,
        excludedReason: r.excludedReason ?? undefined,
        isFinal: r.isFinal || undefined,
        role: e?.role ?? '',
        routes: routesByEmployee.get(r.employeeId) ?? [],
        paymentMethod: e?.paymentMethod ?? 'bank',
        deductionsTotal: advances + other,
        net: gross - advances - other,
        // a processed row is history — its problems no longer matter
        problems: {
          noBank: r.status === 'Pending' && hasNoBankDetails(e),
          zeroGross: gross === 0,
          carriedForward: advanceLines.reduce((s, l) => s + l.carried, 0),
        },
      };
    };

    const period = keyToLabel(q.month);
    const [y, m] = q.month.split('-').map(Number);
    const prevKey = `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, '0')}`;
    const prevPeriod = keyToLabel(prevKey);
    const periods = [...new Set(runs.map((r) => r.period))].sort((a, b) =>
      labelToKey(b).localeCompare(labelToKey(a)),
    );
    return payrollMonthView(
      runs.filter((r) => r.period === period).map(toRow),
      runs.filter((r) => r.period === prevPeriod).map(toRow),
      prevPeriod,
      q,
      localDate(now).slice(0, 7),
      { routes, periods },
    );
  }
}
