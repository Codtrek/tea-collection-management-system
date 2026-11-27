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
import { localDate } from '../dispatch/dispatch-map';
import type { AppRole } from '../auth/role-map';
import {
  cellLock,
  needsReason,
  SEPARATED_ADMIN_LEVELS,
  type PermissionChange,
  type PermissionLevel,
  formatGradeRateId,
  maskAccount,
  type FactoryProfile,
  type PublicFactoryProfile,
  rowsToMatrix,
  type PermissionMatrix,
  type PublicGradeRate,
} from './admin-map';
import {
  CreateGradeRateDto,
  UpdateFactoryProfileDto,
} from './dto/create-grade-rate.dto';
import {
  cancelError,
  newVersionError,
  versionBefore,
  versionStatus,
  type VersionRefusal,
} from './versioning';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { GradeRateEntity } from './grade-rate.entity';
import { RolePermissionEntity } from './role-permission.entity';
import { SystemSettingEntity } from './system-setting.entity';

/** Acting user — `sub` (users.id) is carried so self-suspend can be blocked. */
export interface Actor {
  name: string;
  role: AppRole;
  sub: number;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(GradeRateEntity)
    private readonly gradeRateRepo: Repository<GradeRateEntity>,
    @InjectRepository(RolePermissionEntity)
    private readonly permissionRepo: Repository<RolePermissionEntity>,
    @InjectRepository(SystemSettingEntity)
    private readonly settingRepo: Repository<SystemSettingEntity>,
    private readonly audit: AuditService,
  ) {}

  // ── ADM-01 — grade rates ────────────────────────────────────────

  /**
   * Versions newest first. "Current" is the live version in force TODAY (Colombo calendar); a
   * later one is "scheduled"; a cancelled one is kept and shown as such (Administration-Addendum §3).
   */
  async listGradeRates(now: Date = new Date()): Promise<PublicGradeRate[]> {
    const rows = await this.gradeRateRepo.find({
      order: { effectiveDate: 'DESC' },
    });
    const today = localDate(now);
    return rows.map((r) => {
      const status = versionStatus(r, rows, today);
      return {
        id: r.id,
        superRate: Number(r.superRate),
        normalRate: Number(r.normalRate),
        effectiveDate: r.effectiveDate,
        setBy: r.setBy,
        reason: r.reason,
        status,
        current: status === 'current',
        scheduled: status === 'scheduled',
        cancelled: cancelledOf(r),
      };
    });
  }

  /**
   * Publishes a new rate version (versioning.ts): a reason, today or later, one live version per
   * date, never identical to the version it follows. Rates apply by DELIVERY date, so a version
   * starting today also prices deliveries already recorded today (the portal warns about this).
   */
  async createGradeRate(
    dto: CreateGradeRateDto,
    actor: Actor,
    now: Date = new Date(),
  ): Promise<PublicGradeRate> {
    const rows = await this.gradeRateRepo.find();
    const before = versionBefore(rows, dto.effectiveDate);
    refuse(
      newVersionError(
        rows,
        dto.effectiveDate,
        localDate(now),
        (v) =>
          Number(v.superRate) === dto.superRate &&
          Number(v.normalRate) === dto.normalRate,
        'grade rate',
        dto.reason,
      ),
    );
    const year = new Date(dto.effectiveDate).getFullYear();
    const seq = rows.length + 1;
    const entity = this.gradeRateRepo.create({
      id: formatGradeRateId(year, seq),
      superRate: String(dto.superRate),
      normalRate: String(dto.normalRate),
      effectiveDate: dto.effectiveDate,
      setBy: actor.name,
      reason: dto.reason.trim(),
      cancelledAt: null,
      cancelledBy: null,
      cancelReason: null,
    });
    await this.gradeRateRepo.save(entity);

    const was = before
      ? `Super Rs. ${Number(before.superRate)} → ${dto.superRate}/kg · Normal Rs. ${Number(before.normalRate)} → ${dto.normalRate}/kg`
      : `Super Rs. ${dto.superRate}/kg · Normal Rs. ${dto.normalRate}/kg`;
    await this.audit.record(
      { name: actor.name, role: actor.role, sub: actor.sub },
      {
        action: 'Updated grade rates',
        module: 'Administration',
        record: `Rates effective ${dto.effectiveDate}`,
        recordHref: SETUP_HREF,
        details: `${was} — ${dto.reason.trim()}`,
      },
    );

    const list = await this.listGradeRates(now);
    return list.find((r) => r.id === entity.id)!;
  }

  /** Cancels a scheduled version before it starts. Kept and audited, never deleted. */
  async cancelGradeRate(
    id: string,
    reason: string,
    actor: Actor,
    now: Date = new Date(),
  ): Promise<PublicGradeRate[]> {
    const row = await this.gradeRateRepo.findOne({ where: { id } });
    if (!row)
      throw new NotFoundException(`Grade-rate version ${id} not found.`);
    const why = cancelError(row, localDate(now), reason);
    if (why) throw new BadRequestException(why);
    row.cancelledAt = now;
    row.cancelledBy = actor.name;
    row.cancelReason = reason.trim();
    await this.gradeRateRepo.save(row);
    await this.audit.record(
      { name: actor.name, role: actor.role, sub: actor.sub },
      {
        action: 'Cancelled scheduled grade rates',
        module: 'Administration',
        record: `Rates effective ${row.effectiveDate}`,
        recordHref: SETUP_HREF,
        details: `Super Rs. ${Number(row.superRate)}/kg · Normal Rs. ${Number(row.normalRate)}/kg — ${reason.trim()}`,
      },
    );
    return this.listGradeRates(now);
  }

  // ── ADM-01 — factory profile (Administration-Addendum §2) ─────────

  async getFactoryProfile(actor: Actor): Promise<PublicFactoryProfile> {
    this.assertIsAdmin(actor);
    return toPublicProfile(await this.readProfile());
  }

  async updateFactoryProfile(
    dto: UpdateFactoryProfileDto,
    actor: Actor,
  ): Promise<PublicFactoryProfile> {
    const before = await this.readProfile();
    const accountNumber =
      dto.accountNumber === undefined
        ? before.bank.accountNumber
        : dto.accountNumber.replace(/\s/g, '');
    if (accountNumber && !/^\d{6,20}$/.test(accountNumber)) {
      throw new BadRequestException(
        'The account number should be 6 to 20 digits.',
      );
    }
    const after: FactoryProfile = {
      name: dto.name.trim(),
      registrationNo: dto.registrationNo.trim(),
      address: dto.address.trim(),
      contact: dto.contact.trim(),
      email: dto.email.trim(),
      bank: {
        bank: dto.bank.trim(),
        branch: dto.branch.trim(),
        accountName: dto.accountName.trim(),
        accountNumber,
      },
    };
    const flat = (p: FactoryProfile) => ({
      name: p.name,
      registrationNo: p.registrationNo,
      address: p.address,
      contact: p.contact,
      email: p.email,
      bank: p.bank.bank,
      branch: p.bank.branch,
      accountName: p.bank.accountName,
      // never the full number in the audit log
      accountNumber: maskAccount(p.bank.accountNumber),
    });
    const a = flat(before);
    const b = flat(after);
    const changed = (Object.keys(b) as (keyof typeof b)[]).filter(
      (k) => a[k] !== b[k],
    );
    if (changed.length === 0) return toPublicProfile(before);
    await this.settingRepo.save(
      this.settingRepo.create({
        key: FACTORY_PROFILE_KEY,
        value: after,
        updatedBy: actor.name,
        updatedAt: new Date(),
      }),
    );
    await this.audit.record(
      { name: actor.name, role: actor.role, sub: actor.sub },
      {
        action: 'Updated factory details',
        module: 'Administration',
        record: 'Factory profile',
        recordHref: SETUP_HREF,
        details: changed
          .map((k) => `${k}: ${a[k] || '—'} → ${b[k] || '—'}`)
          .join(' · '),
      },
    );
    return toPublicProfile(after);
  }

  private async readProfile(): Promise<FactoryProfile> {
    const row = await this.settingRepo.findOne({
      where: { key: FACTORY_PROFILE_KEY },
    });
    const v = (row?.value ?? {}) as Partial<FactoryProfile>;
    const s = (x: unknown) => (typeof x === 'string' ? x : '');
    return {
      name: s(v.name),
      registrationNo: s(v.registrationNo),
      address: s(v.address),
      contact: s(v.contact),
      email: s(v.email),
      bank: {
        bank: s(v.bank?.bank),
        branch: s(v.bank?.branch),
        accountName: s(v.bank?.accountName),
        accountNumber: s(v.bank?.accountNumber),
      },
    };
  }

  // ── ADM-02 — permission matrix ──────────────────────────────────

  async getPermissionMatrix(): Promise<PermissionMatrix> {
    const rows = await this.permissionRepo.find();
    return rowsToMatrix(rows);
  }

  /**
   * Saves the cells that changed (Users-Roles-Addendum §4). Locked cells are refused even
   * unchanged (the portal never sends them): the Administrator is pinned to `approve`, except on
   * the separated keys where it is capped at None/View. A reason is required when a change
   * touches `approve` or a finance key. One transaction, one audit row with before → after.
   */
  async updatePermissions(
    dto: UpdatePermissionsDto,
    actor: Actor,
  ): Promise<PermissionMatrix> {
    this.assertIsAdmin(actor);

    for (const entry of dto.entries) {
      const lock = cellLock(entry.role, entry.module);
      if (lock === 'pinned') {
        throw new ForbiddenException(
          'The Administrator keeps full access on this key; it can’t be changed.',
        );
      }
      if (lock === 'capped' && !SEPARATED_ADMIN_LEVELS.includes(entry.level)) {
        throw new ForbiddenException(
          'The Administrator audits this duty: its access here can only be None or View.',
        );
      }
    }

    const current = await this.permissionRepo.find();
    const levelOf = (role: string, module: string): PermissionLevel =>
      (current.find((r) => r.role === role && r.module === module)?.level as
        | PermissionLevel
        | undefined) ?? 'none';
    const changes: PermissionChange[] = [];
    const seen = new Set<string>();
    for (const e of dto.entries) {
      const k = `${e.role}:${e.module}`;
      if (seen.has(k)) {
        throw new BadRequestException(
          `${e.role} · ${e.module} was sent twice.`,
        );
      }
      seen.add(k);
      const from = levelOf(e.role, e.module);
      // a missing row reads as `none`; still write it so the matrix is complete
      const missing = !current.some(
        (r) => r.role === e.role && r.module === e.module,
      );
      if (from !== e.level || missing) {
        changes.push({ role: e.role, module: e.module, from, to: e.level });
      }
    }
    const real = changes.filter((c) => c.from !== c.to);
    const reason = dto.reason?.trim() || undefined;
    if (needsReason(real) && !reason) {
      throw new BadRequestException(
        'A reason is required when a change touches an approval level or a finance key.',
      );
    }
    if (changes.length === 0) return this.getPermissionMatrix();

    await this.permissionRepo.manager.transaction(async (m) => {
      for (const c of changes) {
        await m.save(
          RolePermissionEntity,
          this.permissionRepo.create({
            role: c.role,
            module: c.module,
            level: c.to,
          }),
        );
      }
    });

    if (real.length > 0) {
      const cell = (c: PermissionChange) => `${c.role} · ${c.module}`;
      await this.audit.record(
        { name: actor.name, role: actor.role, sub: actor.sub },
        {
          action: 'Updated role permissions',
          module: 'Administration',
          record: 'Permission matrix',
          details: real
            .map((c) => `${cell(c)}: ${c.from} → ${c.to}`)
            .join('; ')
            .slice(0, 2000),
          before: Object.fromEntries(real.map((c) => [cell(c), c.from])),
          after: Object.fromEntries(real.map((c) => [cell(c), c.to])),
          reason,
        },
      );
    }

    return this.getPermissionMatrix();
  }

  // ── ADM-03 — system settings ────────────────────────────────────

  async getSettings(): Promise<Record<string, unknown>> {
    const rows = await this.settingRepo.find();
    // the factory profile (bank account) has its own masked, audited endpoint
    return Object.fromEntries(
      rows
        .filter((r) => r.key !== FACTORY_PROFILE_KEY)
        .map((r) => [r.key, r.value]),
    );
  }

  async updateSettings(
    dto: UpdateSettingsDto,
    actor: Actor,
  ): Promise<Record<string, unknown>> {
    this.assertIsAdmin(actor);
    if (FACTORY_PROFILE_KEY in dto.settings) {
      throw new BadRequestException(
        'Factory details are changed in Factory Setup → General Info.',
      );
    }
    const now = new Date();
    for (const [key, value] of Object.entries(dto.settings)) {
      await this.settingRepo.save(
        this.settingRepo.create({
          key,
          value,
          updatedBy: actor.name,
          updatedAt: now,
        }),
      );
    }

    await this.audit.record(
      { name: actor.name, role: actor.role, sub: actor.sub },
      {
        action: 'Updated system settings',
        module: 'Administration',
        record: 'System settings',
        details: `${Object.keys(dto.settings).length} setting(s) saved`,
      },
    );

    return this.getSettings();
  }

  // ── helpers ─────────────────────────────────────────────────────

  /** Every Administration write is Administrator-only (`administration: 'approve'`). */
  private assertIsAdmin(actor: Actor): void {
    if (actor.role !== 'Administrator') {
      throw new ForbiddenException(
        'Only an Administrator can change administration settings.',
      );
    }
  }
}

export const SETUP_HREF = '/admin/factory-setup';
const FACTORY_PROFILE_KEY = 'factoryProfile';

/** past / identical / missing reason → 400; a date clash → 409. */
export function refuse(r: VersionRefusal | null): void {
  if (!r) return;
  throw r.kind === 'clash'
    ? new ConflictException(r.message)
    : new BadRequestException(r.message);
}

export function cancelledOf(r: {
  cancelledAt: Date | null;
  cancelledBy: string | null;
  cancelReason: string | null;
}) {
  return r.cancelledAt
    ? {
        at: new Date(r.cancelledAt).toISOString(),
        by: r.cancelledBy,
        reason: r.cancelReason,
      }
    : null;
}

function toPublicProfile(p: FactoryProfile): PublicFactoryProfile {
  return {
    name: p.name,
    registrationNo: p.registrationNo,
    address: p.address,
    contact: p.contact,
    email: p.email,
    bank: {
      bank: p.bank.bank,
      branch: p.bank.branch,
      accountName: p.bank.accountName,
      accountNumberMasked: maskAccount(p.bank.accountNumber),
    },
  };
}
