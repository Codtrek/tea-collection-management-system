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
import { toAppRole } from '../auth/role-map';
import { FactoryEmployee } from '../users/factory-employee.entity';
import { User } from '../users/user.entity';
import {
  ADMIN_EDITABLE_MODULES,
  formatGradeRateId,
  maskAccount,
  type FactoryProfile,
  type PublicFactoryProfile,
  type PublicTransportRate,
  formatUserId,
  parseUserId,
  rowsToMatrix,
  type ModuleKey,
  type PermissionMatrix,
  type PortalRole,
  type PublicGradeRate,
  type PublicSystemUser,
} from './admin-map';
import {
  CreateGradeRateDto,
  CreateTransportRateDto,
  UpdateFactoryProfileDto,
} from './dto/create-grade-rate.dto';
import { TransportRateEntity } from './transport-rate.entity';
import {
  toTransportVersion,
  transportStatus,
  type TransportStatus,
} from './transport-rules';
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

/** DB roles that own a factory-portal login, in display order. */
const FACTORY_DB_ROLES = [
  'factory_admin',
  'factory_officer',
  'factory_manager',
];

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(GradeRateEntity)
    private readonly gradeRateRepo: Repository<GradeRateEntity>,
    @InjectRepository(TransportRateEntity)
    private readonly transportRepo: Repository<TransportRateEntity>,
    @InjectRepository(RolePermissionEntity)
    private readonly permissionRepo: Repository<RolePermissionEntity>,
    @InjectRepository(SystemSettingEntity)
    private readonly settingRepo: Repository<SystemSettingEntity>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(FactoryEmployee)
    private readonly factoryEmployeeRepo: Repository<FactoryEmployee>,
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
    this.assertIsAdmin(actor);
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
    this.assertIsAdmin(actor);
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

  // ── ADM-01 — transport rates (Administration-Addendum §4) ─────────

  async listTransportRates(
    now: Date = new Date(),
  ): Promise<{ versions: PublicTransportRate[]; status: TransportStatus }> {
    const rows = await this.transportRepo.find({
      order: { effectiveDate: 'DESC' },
    });
    const today = localDate(now);
    return {
      versions: rows.map((r) => ({
        id: r.id,
        effectiveDate: r.effectiveDate,
        basis: r.basis,
        rate: Number(r.rate),
        minimumCharge: Number(r.minimumCharge),
        basisConfirmed: r.basisConfirmed,
        setBy: r.setBy,
        reason: r.reason,
        status: versionStatus(r, rows, today),
        cancelled: cancelledOf(r),
      })),
      status: transportStatus(rows.map(toTransportVersion), today),
    };
  }

  async createTransportRate(
    dto: CreateTransportRateDto,
    actor: Actor,
    now: Date = new Date(),
  ): Promise<{ versions: PublicTransportRate[]; status: TransportStatus }> {
    this.assertIsAdmin(actor);
    const rows = await this.transportRepo.find();
    const before = versionBefore(rows, dto.effectiveDate);
    refuse(
      newVersionError(
        rows,
        dto.effectiveDate,
        localDate(now),
        (v) =>
          v.basis === dto.basis &&
          Number(v.rate) === dto.rate &&
          Number(v.minimumCharge) === dto.minimumCharge &&
          v.basisConfirmed === dto.basisConfirmed,
        'transport rate',
        dto.reason,
      ),
    );
    await this.transportRepo.save(
      this.transportRepo.create({
        effectiveDate: dto.effectiveDate,
        basis: dto.basis,
        rate: String(dto.rate),
        minimumCharge: String(dto.minimumCharge),
        basisConfirmed: dto.basisConfirmed,
        reason: dto.reason.trim(),
        setBy: actor.name,
        cancelledAt: null,
        cancelledBy: null,
        cancelReason: null,
      }),
    );
    const show = (b: string, r: number | string, m: number | string) =>
      `Rs. ${Number(r)} ${b === 'per_km' ? 'per km' : 'per kg'}, minimum Rs. ${Number(m)}`;
    await this.audit.record(
      { name: actor.name, role: actor.role, sub: actor.sub },
      {
        action: 'Updated transport rates',
        module: 'Administration',
        record: `Transport effective ${dto.effectiveDate}`,
        recordHref: SETUP_HREF,
        details: `${before ? `${show(before.basis, before.rate, before.minimumCharge)} → ` : ''}${show(dto.basis, dto.rate, dto.minimumCharge)}${dto.basisConfirmed ? ' (basis confirmed)' : ' (basis not confirmed)'} — ${dto.reason.trim()}`,
      },
    );
    return this.listTransportRates(now);
  }

  async cancelTransportRate(
    id: number,
    reason: string,
    actor: Actor,
    now: Date = new Date(),
  ): Promise<{ versions: PublicTransportRate[]; status: TransportStatus }> {
    this.assertIsAdmin(actor);
    const row = await this.transportRepo.findOne({ where: { id } });
    if (!row)
      throw new NotFoundException(`Transport-rate version ${id} not found.`);
    const why = cancelError(row, localDate(now), reason);
    if (why) throw new BadRequestException(why);
    row.cancelledAt = now;
    row.cancelledBy = actor.name;
    row.cancelReason = reason.trim();
    await this.transportRepo.save(row);
    await this.audit.record(
      { name: actor.name, role: actor.role, sub: actor.sub },
      {
        action: 'Cancelled scheduled transport rates',
        module: 'Administration',
        record: `Transport effective ${row.effectiveDate}`,
        recordHref: SETUP_HREF,
        details: reason.trim(),
      },
    );
    return this.listTransportRates(now);
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
    this.assertIsAdmin(actor);
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

  async updatePermissions(
    dto: UpdatePermissionsDto,
    actor: Actor,
  ): Promise<PermissionMatrix> {
    this.assertIsAdmin(actor);

    for (const entry of dto.entries) {
      // The Administrator role is immutable — the factory always keeps one
      // unrestricted account. Reject a real downgrade; allow the no-op.
      if (
        entry.role === 'Administrator' &&
        entry.level !== 'approve' &&
        !ADMIN_EDITABLE_MODULES.includes(entry.module as ModuleKey)
      ) {
        throw new ForbiddenException(
          'The Administrator role always keeps full access and cannot be changed.',
        );
      }
    }

    for (const entry of dto.entries) {
      // Never persist Administrator rows — except the separation-of-duties modules.
      if (
        entry.role === 'Administrator' &&
        !ADMIN_EDITABLE_MODULES.includes(entry.module as ModuleKey)
      ) {
        continue;
      }
      await this.permissionRepo.save(
        this.permissionRepo.create({
          role: entry.role,
          module: entry.module,
          level: entry.level,
        }),
      );
    }

    await this.audit.record(
      { name: actor.name, role: actor.role, sub: actor.sub },
      {
        action: 'Updated role permissions',
        module: 'Administration',
        record: 'Permission matrix',
        details: `${dto.entries.filter((e) => e.role !== 'Administrator' || ADMIN_EDITABLE_MODULES.includes(e.module as ModuleKey)).length} cell(s) saved`,
      },
    );

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

  // ── ADM-02 — system users ───────────────────────────────────────

  async listUsers(): Promise<PublicSystemUser[]> {
    const users = await this.userRepo.find();
    const factoryUsers = users.filter((u) => FACTORY_DB_ROLES.includes(u.role));
    const profiles = await this.factoryEmployeeRepo.find();
    const nameByUserId = new Map(profiles.map((p) => [p.user_id, p.name]));

    return factoryUsers
      .map((u) => ({
        id: formatUserId(u.id),
        name: nameByUserId.get(u.id) ?? 'Unknown',
        role: toAppRole(u.role),
        phone: u.phone,
        status: (u.status === 'suspended' ? 'Suspended' : 'Active') as
          | 'Active'
          | 'Suspended',
        lastLogin: u.last_login_at ? u.last_login_at.toISOString() : null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async suspendUser(
    formattedId: string,
    actor: Actor,
  ): Promise<PublicSystemUser> {
    this.assertIsAdmin(actor);
    const id = parseUserId(formattedId);
    if (id === actor.sub) {
      throw new ForbiddenException('You cannot suspend your own account.');
    }
    const user = await this.findFactoryUser(id);
    user.status = 'suspended';
    await this.userRepo.save(user);

    await this.audit.record(
      { name: actor.name, role: actor.role, sub: actor.sub },
      {
        action: 'Suspended user',
        module: 'Administration',
        record: formattedId,
        details: 'Portal access revoked',
      },
    );

    return this.toPublicUser(user);
  }

  async resetPassword(
    formattedId: string,
    actor: Actor,
  ): Promise<{ ok: true }> {
    this.assertIsAdmin(actor);
    const id = parseUserId(formattedId);
    const user = await this.findFactoryUser(id);

    // No email infra until Phase 3 — this records the intent (the portal frames
    // it as "a reset link is emailed"; the admin never sees/sets the password).
    await this.audit.record(
      { name: actor.name, role: actor.role, sub: actor.sub },
      {
        action: 'Sent password reset link',
        module: 'Administration',
        record: formattedId,
        details: `Reset link issued to ${user.phone}`,
      },
    );

    return { ok: true };
  }

  // ── helpers ─────────────────────────────────────────────────────

  private async findFactoryUser(id: number): Promise<User> {
    const user = Number.isNaN(id)
      ? null
      : await this.userRepo.findOne({ where: { id } });
    if (!user || !FACTORY_DB_ROLES.includes(user.role)) {
      throw new NotFoundException('No such portal user.');
    }
    return user;
  }

  private async toPublicUser(user: User): Promise<PublicSystemUser> {
    const profile = await this.factoryEmployeeRepo.findOne({
      where: { user_id: user.id },
    });
    return {
      id: formatUserId(user.id),
      name: profile?.name ?? 'Unknown',
      role: toAppRole(user.role),
      phone: user.phone,
      status: user.status === 'suspended' ? 'Suspended' : 'Active',
      lastLogin: user.last_login_at ? user.last_login_at.toISOString() : null,
    };
  }

  /** Every Administration write is Administrator-only (`administration: 'approve'`). */
  private assertIsAdmin(actor: Actor): void {
    if (actor.role !== 'Administrator') {
      throw new ForbiddenException(
        'Only an Administrator can change administration settings.',
      );
    }
  }
}

const SETUP_HREF = '/admin/factory-setup';
const FACTORY_PROFILE_KEY = 'factoryProfile';

/** past / identical / missing reason → 400; a date clash → 409. */
function refuse(r: VersionRefusal | null): void {
  if (!r) return;
  throw r.kind === 'clash'
    ? new ConflictException(r.message)
    : new BadRequestException(r.message);
}

function cancelledOf(r: {
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
