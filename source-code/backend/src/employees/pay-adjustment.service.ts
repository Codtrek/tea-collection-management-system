import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { DispatchAccessService } from '../dispatch/dispatch-access.service';
import { localDate } from '../dispatch/dispatch-map';
import { labelToKey } from '../reports/reports-map';
import type { PayAdjustmentDto } from './dto/pay-adjustment.dto';
import { normalizeNic } from './advance-schedule';
import { EmployeeAttendanceEntity } from './employee-attendance.entity';
import { formatEmployeeId, parseEmployeeId } from './employee-map';
import { EmployeeEntity } from './employee.entity';
import type { Actor } from './employees.service';
import {
  blockers,
  describeChange,
  preview,
  type ChangeSpec,
  type Preview,
  type PreviewEmployee,
} from './pay-adjustment-rules';
import {
  PayAdjustmentEntity,
  PayAdjustmentLineEntity,
} from './pay-adjustment.entity';
import { PayRateEntity } from './pay-rate.entity';
import { PayRatesService } from './pay-rates.service';
import { payOn } from './pay-resolution';
import { sumHours, type HourRates } from './payroll-gross';
import { PayrollRunEntity } from './payroll-run.entity';
import { PayrollSettingsService } from './payroll-settings.service';

export interface PublicPreview extends Omit<Preview, 'lines'> {
  lines: (Preview['lines'][number] & { employeeId: string })[];
  /** last month's hours are the cost basis */
  hoursMonth: string;
  blockers: string[];
}

export interface PublicPayAdjustment {
  id: number;
  status: 'pending' | 'approved' | 'rejected';
  scope: 'all' | 'role' | 'employees';
  role: string | null;
  change: ChangeSpec;
  changeLabel: string;
  effectiveDate: string;
  reason: string;
  decreaseAgreement: boolean;
  totalMonthlyChange: number;
  requestedBy: string;
  requestedAt: string;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
  lines: {
    employeeId: string;
    name: string;
    category: 'factory' | 'office';
    role: string;
    onOverride: boolean;
    old: HourRates;
    new: HourRates;
    hoursBasis: number;
    monthlyChange: number;
  }[];
  /** for the viewer: may they approve, and if not, why */
  approval: { canDecide: boolean; blockedReason: string | null };
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const HREF = '/employees/pay-rates';

/**
 * Pay adjustments (Administration-Addendum §8). `payRates: edit` prepares (the Manager);
 * `payRates: approve` approves or rejects (the Administrator). Preview and approval both run the
 * same pure rules (pay-adjustment-rules.ts) on the data as it is at that moment, so a change that
 * became invalid while it waited (a month processed, a minimum entered, its date passed) is
 * refused at approval. Nothing is written to pay_rates before approval; everything is audited.
 */
@Injectable()
export class PayAdjustmentService {
  constructor(
    @InjectRepository(PayAdjustmentEntity)
    private readonly adjustments: Repository<PayAdjustmentEntity>,
    @InjectRepository(PayRateEntity)
    private readonly rates: Repository<PayRateEntity>,
    @InjectRepository(EmployeeEntity)
    private readonly employees: Repository<EmployeeEntity>,
    @InjectRepository(EmployeeAttendanceEntity)
    private readonly attendance: Repository<EmployeeAttendanceEntity>,
    @InjectRepository(PayrollRunEntity)
    private readonly payroll: Repository<PayrollRunEntity>,
    private readonly payRates: PayRatesService,
    private readonly settings: PayrollSettingsService,
    private readonly access: DispatchAccessService,
    private readonly audit: AuditService,
  ) {}

  async preview(
    dto: PayAdjustmentDto,
    actor: Actor,
    now: Date = new Date(),
  ): Promise<PublicPreview> {
    await this.access.require(
      actor.role,
      'edit',
      'prepare pay changes',
      'payRates',
    );
    return (await this.compute(dto, now)).view;
  }

  async prepare(
    dto: PayAdjustmentDto,
    actor: Actor,
    now: Date = new Date(),
  ): Promise<PublicPayAdjustment> {
    await this.access.require(
      actor.role,
      'edit',
      'prepare pay changes',
      'payRates',
    );
    const reason = dto.reason?.trim() ?? '';
    if (reason.length < 3) {
      throw new BadRequestException('Say why pay is changing.');
    }
    const { view, preview: p } = await this.compute(dto, now);
    const why = blockers(p, !!dto.decreaseAgreement);
    if (why.length) throw new BadRequestException(why.join(' '));
    const saved = await this.adjustments.save(
      this.adjustments.create({
        status: 'pending',
        scope: dto.scope,
        role: dto.scope === 'role' ? (dto.role ?? null) : null,
        direction: dto.direction,
        kind: dto.kind,
        amount: String(dto.amount),
        rounding: dto.rounding,
        effectiveDate: dto.effectiveDate,
        reason,
        decreaseAgreement: !!dto.decreaseAgreement,
        totalMonthlyChange: String(p.totalMonthlyChange),
        requestedBy: actor.name,
        requestedByUserId: actor.sub ?? null,
        requestedAt: now,
        decidedBy: null,
        decidedByUserId: null,
        decidedAt: null,
        decisionReason: null,
        lines: p.lines.map((l) =>
          Object.assign(new PayAdjustmentLineEntity(), {
            employeeId: l.employeeId,
            employeeName: l.name,
            category: l.category,
            role: l.role,
            onOverride: l.onOverride,
            oldDayRate: String(l.old.dayRate),
            oldDayOtRate: String(l.old.dayOtRate),
            oldNightRate: String(l.old.nightRate),
            oldNightOtRate: String(l.old.nightOtRate),
            newDayRate: String(l.new.dayRate),
            newDayOtRate: String(l.new.dayOtRate),
            newNightRate: String(l.new.nightRate),
            newNightOtRate: String(l.new.nightOtRate),
            hoursBasis: String(l.hoursBasis),
            monthlyChange: String(l.monthlyChange),
          }),
        ),
      }),
    );
    await this.audit.record(actor, {
      action: 'Prepared pay change',
      module: 'Employee',
      record: `Pay change #${saved.id}`,
      recordHref: HREF,
      details: `${describeChange(this.spec(saved))} for ${view.lines.length} employee${view.lines.length === 1 ? '' : 's'} from ${dto.effectiveDate}; monthly cost ${signed(p.totalMonthlyChange)} — ${reason}`,
    });
    return this.toPublic(await this.find(saved.id), actor);
  }

  async list(actor: Actor): Promise<PublicPayAdjustment[]> {
    await this.access.require(
      actor.role,
      'view',
      'view pay changes',
      'payRates',
    );
    const rows = await this.adjustments.find({
      relations: { lines: true },
      order: { requestedAt: 'DESC' },
    });
    return Promise.all(rows.map((r) => this.toPublic(r, actor)));
  }

  async decide(
    id: number,
    decision: 'approve' | 'reject',
    reason: string | undefined,
    actor: Actor,
    now: Date = new Date(),
  ): Promise<PublicPayAdjustment> {
    await this.access.require(
      actor.role,
      'approve',
      'approve pay changes',
      'payRates',
    );
    const adj = await this.find(id);
    if (adj.status !== 'pending') {
      throw new ConflictException(
        `Pay change #${id} has already been ${adj.status}.`,
      );
    }
    const self = await this.selfBlock(adj, actor);
    if (self) throw new ForbiddenException(self);

    if (decision === 'reject') {
      if (!reason?.trim())
        throw new BadRequestException('Give a reason for rejecting it.');
      Object.assign(adj, {
        status: 'rejected',
        decidedBy: actor.name,
        decidedByUserId: actor.sub ?? null,
        decidedAt: now,
        decisionReason: reason.trim(),
      });
      await this.adjustments.save(adj);
      await this.audit.record(actor, {
        action: 'Rejected pay change',
        module: 'Employee',
        record: `Pay change #${id}`,
        recordHref: HREF,
        details: `${describeChange(this.spec(adj))} from ${adj.effectiveDate} — ${reason.trim()}`,
      });
      return this.toPublic(adj, actor);
    }

    // the same checks again, on today's data: processed months, minimums and the date may have moved
    const { preview: p } = await this.compute(
      {
        scope: 'employees',
        employeeIds: adj.lines.map((l) => formatEmployeeId(l.employeeId)),
        direction: adj.direction,
        kind: adj.kind,
        amount: Number(adj.amount),
        rounding: adj.rounding,
        effectiveDate: adj.effectiveDate,
      },
      now,
    );
    const why = blockers(p, adj.decreaseAgreement);
    if (why.length) {
      throw new ConflictException(
        `This change can’t be applied as it stands: ${why.join(' ')} Reject it and prepare a new one.`,
      );
    }
    await this.apply(adj, p, actor);
    Object.assign(adj, {
      status: 'approved',
      decidedBy: actor.name,
      decidedByUserId: actor.sub ?? null,
      decidedAt: now,
      decisionReason: reason?.trim() || null,
      totalMonthlyChange: String(p.totalMonthlyChange),
    });
    await this.adjustments.save(adj);
    await this.payRates.refreshCache(
      adj.lines.map((l) => l.employeeId),
      now,
    );
    await this.audit.record(actor, {
      action: 'Approved pay change',
      module: 'Employee',
      record: `Pay change #${id}`,
      recordHref: HREF,
      details: `${describeChange(this.spec(adj))} for ${adj.lines.length} employee${adj.lines.length === 1 ? '' : 's'} from ${adj.effectiveDate}; monthly cost ${signed(p.totalMonthlyChange)}. Prepared by ${adj.requestedBy}.`,
    });
    return this.toPublic(await this.find(id), actor);
  }

  /* ── helpers ── */

  /**
   * Writes the approved change to pay history. A role-wide change moves the ROLE rate for everyone
   * on it (one role version) and gives each person on their own rate a new override; a change for
   * selected people gives each of them an override.
   */
  private async apply(
    adj: PayAdjustmentEntity,
    p: Preview,
    actor: Actor,
  ): Promise<void> {
    const versions = await this.payRates.versions();
    const base = {
      effectiveDate: adj.effectiveDate,
      reason: adj.reason,
      setBy: actor.name,
      source: 'adjustment' as const,
      adjustmentId: adj.id,
    };
    const rows: Partial<PayRateEntity>[] = [];
    const roleWide = adj.scope !== 'employees';
    const roles = new Set<string>();
    for (const l of p.lines) {
      if (roleWide && !l.onOverride) {
        roles.add(l.role);
        continue;
      }
      rows.push({
        scope: 'employee',
        role: null,
        employeeId: l.employeeId,
        ...str(l.new),
        ...base,
      });
    }
    for (const role of roles) {
      const line = p.lines.find((l) => l.role === role && !l.onOverride)!;
      rows.push({
        scope: 'role',
        role,
        employeeId: null,
        ...str(line.new),
        ...base,
      });
    }
    for (const r of rows) {
      const clash = versions.some(
        (v) =>
          v.effectiveDate === r.effectiveDate &&
          (r.scope === 'role'
            ? v.scope === 'role' && v.role === r.role
            : v.scope === 'employee' && v.employeeId === r.employeeId),
      );
      if (clash) {
        throw new ConflictException(
          `${r.scope === 'role' ? `The ${r.role} role` : 'An employee in this change'} already has a pay change starting on ${r.effectiveDate}. Reject this one and pick another date.`,
        );
      }
    }
    await this.rates.save(rows.map((r) => this.rates.create(r)));
  }

  /** Requester, or someone included in the change (same NIC) — the advance rule, for a group. */
  private async selfBlock(
    adj: PayAdjustmentEntity,
    actor: Actor,
  ): Promise<string | null> {
    if (actor.sub !== undefined && adj.requestedByUserId === actor.sub) {
      return 'You prepared this pay change — someone else must approve it.';
    }
    const mine = normalizeNic(actor.nic);
    if (!mine) return null;
    const people = await this.employees.find();
    const nic = new Map(people.map((e) => [e.id, normalizeNic(e.nic)]));
    const me = adj.lines.find((l) => nic.get(l.employeeId) === mine);
    return me
      ? `This pay change includes you (${me.employeeName}) — someone else must approve it.`
      : null;
  }

  private async compute(
    dto: PayAdjustmentDto,
    now: Date,
  ): Promise<{ preview: Preview; view: PublicPreview }> {
    const today = localDate(now);
    const [people, versions, runs, settings] = await Promise.all([
      this.employees.find(),
      this.payRates.versions(),
      this.payroll.find({ where: { status: 'Processed' } }),
      this.settings.get(),
    ]);
    const active = people.filter((e) => e.status === 'Active');
    let chosen: EmployeeEntity[];
    if (dto.scope === 'all') chosen = active;
    else if (dto.scope === 'role')
      chosen = active.filter((e) => e.role === dto.role);
    else {
      const ids = new Set((dto.employeeIds ?? []).map(parseEmployeeId));
      chosen = active.filter((e) => ids.has(e.id));
    }
    chosen.sort((a, b) => a.name.localeCompare(b.name));

    // cost basis: hours in the last complete month
    const lastMonth = shiftMonth(today.slice(0, 7), -1);
    const attendance = await this.attendance.find();
    const dayBefore = addDays(dto.effectiveDate, -1);
    const employees: PreviewEmployee[] = chosen.map((e) => ({
      id: e.id,
      name: e.name,
      nic: e.nic,
      category: e.category ?? 'factory',
      role: e.role,
      // the pay the change is applied to: what's in force the day before it starts
      current: payOn(versions, e, dayBefore),
      hours: sumHours(
        attendance.filter(
          (a) => a.employeeId === e.id && a.date.startsWith(lastMonth),
        ),
      ),
      processedMonths: runs
        .filter((r) => r.employeeId === e.id)
        .map((r) => labelToKey(r.period))
        .filter(Boolean),
    }));
    const p = preview({
      employees,
      change: {
        direction: dto.direction,
        kind: dto.kind,
        amount: dto.amount,
        rounding: dto.rounding,
      },
      effectiveDate: dto.effectiveDate,
      today,
      standardHoursPerDay: settings.standardHoursPerDay,
      minimumDailyPay: settings.minimumDailyPay,
    });
    if (dto.scope === 'role' && !dto.role) p.errors.unshift('Pick the role.');
    return {
      preview: p,
      view: {
        ...p,
        lines: p.lines.map((l) => ({
          ...l,
          employeeId: formatEmployeeId(l.employeeId),
        })) as never,
        hoursMonth: lastMonth,
        blockers: blockers(p, !!dto.decreaseAgreement),
      },
    };
  }

  private async find(id: number): Promise<PayAdjustmentEntity> {
    const adj = await this.adjustments.findOne({
      where: { id },
      relations: { lines: true },
    });
    if (!adj) throw new NotFoundException(`Pay change #${id} not found.`);
    return adj;
  }

  private spec(a: PayAdjustmentEntity): ChangeSpec {
    return {
      direction: a.direction,
      kind: a.kind,
      amount: Number(a.amount),
      rounding: a.rounding,
    };
  }

  private async toPublic(
    a: PayAdjustmentEntity,
    actor: Actor,
  ): Promise<PublicPayAdjustment> {
    const level = await this.access.levelFor(actor.role, 'payRates');
    const blockedReason =
      a.status !== 'pending'
        ? null
        : level !== 'approve'
          ? 'Your role prepares pay changes; an Administrator approves them.'
          : await this.selfBlock(a, actor);
    const rates = (
      p: 'old' | 'new',
      l: PayAdjustmentLineEntity,
    ): HourRates => ({
      dayRate: Number(p === 'old' ? l.oldDayRate : l.newDayRate),
      dayOtRate: Number(p === 'old' ? l.oldDayOtRate : l.newDayOtRate),
      nightRate: Number(p === 'old' ? l.oldNightRate : l.newNightRate),
      nightOtRate: Number(p === 'old' ? l.oldNightOtRate : l.newNightOtRate),
    });
    return {
      id: a.id,
      status: a.status,
      scope: a.scope,
      role: a.role,
      change: this.spec(a),
      changeLabel: describeChange(this.spec(a)),
      effectiveDate: a.effectiveDate,
      reason: a.reason,
      decreaseAgreement: a.decreaseAgreement,
      totalMonthlyChange: Number(a.totalMonthlyChange),
      requestedBy: a.requestedBy,
      requestedAt: new Date(a.requestedAt).toISOString(),
      decidedBy: a.decidedBy,
      decidedAt: a.decidedAt ? new Date(a.decidedAt).toISOString() : null,
      decisionReason: a.decisionReason,
      lines: (a.lines ?? [])
        .sort((x, y) => x.employeeName.localeCompare(y.employeeName))
        .map((l) => ({
          employeeId: formatEmployeeId(l.employeeId),
          name: l.employeeName,
          category: l.category,
          role: l.role,
          onOverride: l.onOverride,
          old: rates('old', l),
          new: rates('new', l),
          hoursBasis: Number(l.hoursBasis),
          monthlyChange: Number(l.monthlyChange),
        })),
      approval: {
        canDecide: a.status === 'pending' && blockedReason === null,
        blockedReason,
      },
    };
  }
}

const str = (r: HourRates) => ({
  dayRate: String(r.dayRate),
  dayOtRate: String(r.dayOtRate),
  nightRate: String(r.nightRate),
  nightOtRate: String(r.nightOtRate),
});
const signed = (n: number) =>
  `${n >= 0 ? '+' : '−'}Rs. ${Math.abs(r2(n)).toLocaleString('en-LK')}`;

function shiftMonth(m: string, n: number): string {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
