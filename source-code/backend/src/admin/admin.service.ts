import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import type { AppRole } from '../auth/role-map';
import { toAppRole } from '../auth/role-map';
import { FactoryEmployee } from '../users/factory-employee.entity';
import { User } from '../users/user.entity';
import {
  formatGradeRateId,
  formatUserId,
  parseUserId,
  rowsToMatrix,
  type PermissionMatrix,
  type PortalRole,
  type PublicGradeRate,
  type PublicSystemUser,
} from './admin-map';
import { CreateGradeRateDto } from './dto/create-grade-rate.dto';
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
const FACTORY_DB_ROLES = ['factory_admin', 'factory_officer', 'factory_manager'];

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(GradeRateEntity)
    private readonly gradeRateRepo: Repository<GradeRateEntity>,
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

  async listGradeRates(): Promise<PublicGradeRate[]> {
    const rows = await this.gradeRateRepo.find({
      order: { effectiveDate: 'DESC' },
    });
    // Newest effective date is "current"; rows are already DESC-ordered.
    const currentId = rows[0]?.id;
    return rows.map((r) => ({
      id: r.id,
      superRate: Number(r.superRate),
      normalRate: Number(r.normalRate),
      effectiveDate: r.effectiveDate,
      setBy: r.setBy,
      current: r.id === currentId,
    }));
  }

  async createGradeRate(
    dto: CreateGradeRateDto,
    actor: Actor,
  ): Promise<PublicGradeRate> {
    this.assertIsAdmin(actor);
    const year = new Date(dto.effectiveDate).getFullYear();
    const seq = (await this.gradeRateRepo.count()) + 1;
    const entity = this.gradeRateRepo.create({
      id: formatGradeRateId(year, seq),
      superRate: String(dto.superRate),
      normalRate: String(dto.normalRate),
      effectiveDate: dto.effectiveDate,
      setBy: actor.name,
    });
    await this.gradeRateRepo.save(entity);

    await this.audit.record(
      { name: actor.name, role: actor.role, sub: actor.sub },
      {
        action: 'Updated grade rates',
        module: 'Administration',
        record: `Rates effective ${dto.effectiveDate}`,
        details: `Super Rs. ${dto.superRate}/kg · Normal Rs. ${dto.normalRate}/kg`,
      },
    );

    // The just-added version is current iff it has the latest effective date.
    const list = await this.listGradeRates();
    return list.find((r) => r.id === entity.id)!;
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
      if (entry.role === 'Administrator' && entry.level !== 'approve') {
        throw new ForbiddenException(
          'The Administrator role always keeps full access and cannot be changed.',
        );
      }
    }

    for (const entry of dto.entries) {
      if (entry.role === 'Administrator') continue; // never persist admin rows
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
        details: `${dto.entries.filter((e) => e.role !== 'Administrator').length} cell(s) saved`,
      },
    );

    return this.getPermissionMatrix();
  }

  // ── ADM-03 — system settings ────────────────────────────────────

  async getSettings(): Promise<Record<string, unknown>> {
    const rows = await this.settingRepo.find();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  async updateSettings(
    dto: UpdateSettingsDto,
    actor: Actor,
  ): Promise<Record<string, unknown>> {
    this.assertIsAdmin(actor);
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
    const factoryUsers = users.filter((u) =>
      FACTORY_DB_ROLES.includes(u.role),
    );
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

  async suspendUser(formattedId: string, actor: Actor): Promise<PublicSystemUser> {
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
