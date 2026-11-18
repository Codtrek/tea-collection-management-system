import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { AppRole } from '../auth/role-map';
import { DispatchAccessService } from '../dispatch/dispatch-access.service';
import { localDate } from '../dispatch/dispatch-map';
import { EmployeeEntity } from './employee.entity';
import { formatEmployeeId } from './employee-map';
import { PayRateEntity } from './pay-rate.entity';
import {
  nextChange,
  payOn,
  toPayVersion,
  type PayVersion,
} from './pay-resolution';
import type { HourRates } from './payroll-gross';

export interface PublicPayVersion extends HourRates {
  id: number;
  scope: 'role' | 'employee';
  role: string | null;
  employeeId: string | null;
  effectiveDate: string;
  reason: string;
  setBy: string;
  source: PayVersion['source'];
  adjustmentId: number | null;
  status: 'current' | 'scheduled' | 'past';
}

export interface PublicRolePay {
  role: string;
  current: HourRates | null;
  next: PublicPayVersion | null;
  employees: {
    id: string;
    name: string;
    category: 'factory' | 'office';
    status: string;
    onOverride: boolean;
    current: HourRates | null;
  }[];
  history: PublicPayVersion[];
}

export interface PublicEmployeePay {
  employeeId: string;
  role: string;
  current: (HourRates & { source: 'override' | 'role' }) | null;
  next: PublicPayVersion | null;
  history: PublicPayVersion[];
}

const ratesOf = (v: HourRates): HourRates => ({
  dayRate: v.dayRate,
  dayOtRate: v.dayOtRate,
  nightRate: v.nightRate,
  nightOtRate: v.nightOtRate,
});

/**
 * Pay history (Administration-Addendum §6) — reads `pay_rates` for the Pay Rates tab, an
 * employee's Pay section and payroll; writes the registration override; and keeps the
 * `employees.*_rate` columns as a cache of the pay in force today (other readers still use them).
 * Reading needs `payRates: view`.
 */
@Injectable()
export class PayRatesService {
  constructor(
    @InjectRepository(PayRateEntity)
    private readonly rates: Repository<PayRateEntity>,
    @InjectRepository(EmployeeEntity)
    private readonly employees: Repository<EmployeeEntity>,
    private readonly access: DispatchAccessService,
  ) {}

  async versions(): Promise<PayVersion[]> {
    return (await this.rates.find()).map(toPayVersion);
  }

  async assertCanView(role: AppRole): Promise<void> {
    await this.access.require(role, 'view', 'view pay rates', 'payRates');
  }

  /** The Pay Rates tab: every role with its rate in force today, the next change and its people. */
  async roles(now: Date = new Date()): Promise<PublicRolePay[]> {
    const today = localDate(now);
    const [versions, people] = await Promise.all([
      this.versions(),
      this.employees.find(),
    ]);
    const roles = [
      ...new Set([
        ...people.map((e) => e.role),
        ...versions.filter((v) => v.role).map((v) => v.role!),
      ]),
    ].sort();
    return roles.map((role) => {
      const roleVersions = versions.filter(
        (v) => v.scope === 'role' && v.role === role,
      );
      const current = latest(roleVersions, today);
      const next =
        roleVersions
          .filter((v) => v.effectiveDate > today)
          .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate))[0] ??
        null;
      return {
        role,
        current: current ? ratesOf(current) : null,
        next: next ? this.toPublic(next, versions, today) : null,
        employees: people
          .filter((e) => e.role === role)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((e) => {
            const pay = payOn(versions, e, today);
            return {
              id: formatEmployeeId(e.id),
              name: e.name,
              category: e.category ?? 'factory',
              status: e.status,
              onOverride: pay?.source === 'override',
              current: pay ? pay.rates : null,
            };
          }),
        history: roleVersions
          .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))
          .map((v) => this.toPublic(v, versions, today)),
      };
    });
  }

  /** One employee's pay: in force today, the next change, and every version that applies to them. */
  async forEmployee(
    employee: EmployeeEntity,
    now: Date = new Date(),
  ): Promise<PublicEmployeePay> {
    const today = localDate(now);
    const versions = await this.versions();
    const pay = payOn(versions, employee, today);
    const next = nextChange(versions, employee, today);
    return {
      employeeId: formatEmployeeId(employee.id),
      role: employee.role,
      current: pay ? { ...pay.rates, source: pay.source } : null,
      next: next ? this.toPublic(next, versions, today) : null,
      history: versions
        .filter(
          (v) =>
            (v.scope === 'employee' && v.employeeId === employee.id) ||
            (v.scope === 'role' && v.role === employee.role),
        )
        .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))
        .map((v) => this.toPublic(v, versions, today)),
    };
  }

  /**
   * A newly registered employee: their entered rates become an override from the hire date, unless
   * they're exactly their role's rate then (they're simply on the role rate).
   */
  async recordRegistration(
    employee: EmployeeEntity,
    rates: HourRates,
    actorName: string,
    now: Date = new Date(),
  ): Promise<void> {
    const from = employee.hireDate ?? localDate(now);
    const versions = await this.versions();
    const role = latest(
      versions.filter((v) => v.scope === 'role' && v.role === employee.role),
      from,
    );
    const same =
      role &&
      role.dayRate === rates.dayRate &&
      role.dayOtRate === rates.dayOtRate &&
      role.nightRate === rates.nightRate &&
      role.nightOtRate === rates.nightOtRate;
    if (same) return;
    await this.rates.save(
      this.rates.create({
        scope: 'employee',
        role: null,
        employeeId: employee.id,
        effectiveDate: from,
        dayRate: String(rates.dayRate),
        dayOtRate: String(rates.dayOtRate),
        nightRate: String(rates.nightRate),
        nightOtRate: String(rates.nightOtRate),
        reason: role
          ? 'Pay set on registration (different from the role rate)'
          : 'Pay set on registration',
        setBy: actorName,
        source: 'registration',
        adjustmentId: null,
      }),
    );
  }

  /** Re-point the `employees.*_rate` cache at the pay in force today. */
  async refreshCache(
    employeeIds?: number[],
    now: Date = new Date(),
  ): Promise<void> {
    const today = localDate(now);
    const [versions, people] = await Promise.all([
      this.versions(),
      employeeIds
        ? this.employees.find({ where: { id: In(employeeIds) } })
        : this.employees.find(),
    ]);
    for (const e of people) {
      const pay = payOn(versions, e, today);
      if (!pay) continue;
      const r = pay.rates;
      if (
        Number(e.dayRate) === r.dayRate &&
        Number(e.dayOtRate) === r.dayOtRate &&
        Number(e.nightRate) === r.nightRate &&
        Number(e.nightOtRate) === r.nightOtRate
      ) {
        continue;
      }
      e.dayRate = String(r.dayRate);
      e.dayOtRate = String(r.dayOtRate);
      e.nightRate = String(r.nightRate);
      e.nightOtRate = String(r.nightOtRate);
      await this.employees.save(e);
    }
  }

  private toPublic(
    v: PayVersion,
    all: PayVersion[],
    today: string,
  ): PublicPayVersion {
    const sameScope = all.filter(
      (x) =>
        x.scope === v.scope &&
        (v.scope === 'role'
          ? x.role === v.role
          : x.employeeId === v.employeeId),
    );
    const inForce = latest(sameScope, today);
    return {
      id: v.id,
      scope: v.scope,
      role: v.role,
      employeeId: v.employeeId === null ? null : formatEmployeeId(v.employeeId),
      effectiveDate: v.effectiveDate,
      ...ratesOf(v),
      reason: v.reason,
      setBy: v.setBy,
      source: v.source,
      adjustmentId: v.adjustmentId,
      status:
        v.effectiveDate > today
          ? 'scheduled'
          : inForce?.id === v.id
            ? 'current'
            : 'past',
    };
  }
}

function latest(vs: PayVersion[], date: string): PayVersion | null {
  return (
    vs
      .filter((v) => v.effectiveDate <= date)
      .sort(
        (a, b) => b.effectiveDate.localeCompare(a.effectiveDate) || b.id - a.id,
      )[0] ?? null
  );
}
