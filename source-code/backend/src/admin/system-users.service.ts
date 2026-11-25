import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { FACTORY_DB_ROLES, toDbRole, toPortalRole } from '../auth/role-map';
import { EmployeeEntity } from '../employees/employee.entity';
import { isAgentRole } from '../employees/employee-roles';
import { FactoryEmployee } from '../users/factory-employee.entity';
import { Factory } from '../users/factory.entity';
import { User } from '../users/user.entity';
import {
  formatUserId,
  parseUserId,
  type PortalRole,
  type PublicSystemUser,
  type SystemUserStatus,
} from './admin-map';
import type { Actor } from './admin.service';
import type {
  CreateSystemUserDto,
  UpdateSystemUserDto,
} from './dto/system-user.dto';
import {
  actionsFor,
  assignableRoles,
  assignRoleRefusal,
  deactivateRefusal,
  editRefusal,
  manageRefusal,
  reactivateRefusal,
  resetRefusal,
  roleChangeRefusal,
  unlockRefusal,
  type RuleActor,
  type RuleTarget,
} from './user-rules';

export interface EligibleEmployee {
  id: number;
  name: string;
  nic: string;
  contact: string | null;
  jobTitle: string;
}

export interface LinkSuggestion {
  userId: string;
  userName: string;
  employeeId: number;
  employeeName: string;
  nic: string;
}

/** Returned once, never stored in plain text or logged. */
export interface IssuedPassword {
  user: PublicSystemUser;
  temporaryPassword: string;
}

/** 12 chars from a CSPRNG (≈72 bits) — the same generator agent provisioning uses. */
export function generateTemporaryPassword(): string {
  return randomBytes(9).toString('base64url');
}

const BCRYPT_COST = 10;

/**
 * ADM-02 System Users (Users-Roles-Addendum §5). Every write goes through the pure rules in
 * `user-rules.ts`; every change is audited with before → after; deactivate / role change / reset
 * bump `users.token_version`, so the user's existing token is refused on its next request.
 */
@Injectable()
export class SystemUsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(FactoryEmployee)
    private readonly feRepo: Repository<FactoryEmployee>,
    @InjectRepository(EmployeeEntity)
    private readonly employeeRepo: Repository<EmployeeEntity>,
    private readonly audit: AuditService,
  ) {}

  // ── reads ────────────────────────────────────────────────────────

  async list(
    actor: Actor,
    now: Date = new Date(),
  ): Promise<PublicSystemUser[]> {
    const users = (await this.userRepo.find()).filter((u) =>
      FACTORY_DB_ROLES.includes(u.role),
    );
    const profiles = await this.feRepo.find();
    const employees = await this.employeeRepo.find();
    const activeAdmins = countActiveAdmins(users);
    const ra = ruleActor(actor);
    return users
      .map((u) =>
        this.toPublic(u, ra, activeAdmins, now, {
          name: profiles.find((p) => p.user_id === u.id)?.name,
          employee: employees.find((e) => e.userId === u.id) ?? null,
        }),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /** HR employees who can be given a portal login: active, no login yet, not a collection agent. */
  async eligibleEmployees(
    actor: Actor,
  ): Promise<{ employees: EligibleEmployee[]; assignableRoles: PortalRole[] }> {
    this.assertManage(actor);
    const employees = await this.employeeRepo.find();
    const nicsWithLogin = new Set(
      (await this.feRepo.find()).map((p) => norm(p.nic)),
    );
    return {
      employees: employees
        .filter(
          (e) =>
            e.userId === null &&
            e.status === 'Active' &&
            !isAgentRole(e.role) &&
            !nicsWithLogin.has(norm(e.nic)),
        )
        .map((e) => ({
          id: e.id,
          name: e.name,
          nic: e.nic,
          contact: e.contact,
          jobTitle: e.role,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      assignableRoles: assignableRoles(ruleActor(actor)),
    };
  }

  /** Portal users not linked to an HR record whose NIC matches an unlinked employee — proposals only. */
  async linkSuggestions(actor: Actor): Promise<LinkSuggestion[]> {
    this.assertManage(actor);
    const users = (await this.userRepo.find()).filter((u) =>
      FACTORY_DB_ROLES.includes(u.role),
    );
    const profiles = await this.feRepo.find();
    const employees = await this.employeeRepo.find();
    const out: LinkSuggestion[] = [];
    for (const u of users) {
      if (employees.some((e) => e.userId === u.id)) continue;
      const p = profiles.find((x) => x.user_id === u.id);
      if (!p?.nic) continue;
      const match = employees.find(
        (e) =>
          e.userId === null &&
          !isAgentRole(e.role) &&
          norm(e.nic) === norm(p.nic),
      );
      if (match) {
        out.push({
          userId: formatUserId(u.id),
          userName: p.name,
          employeeId: match.id,
          employeeName: match.name,
          nic: match.nic,
        });
      }
    }
    return out;
  }

  // ── writes ───────────────────────────────────────────────────────

  async create(
    dto: CreateSystemUserDto,
    actor: Actor,
  ): Promise<IssuedPassword> {
    const ra = ruleActor(actor);
    refuse(manageRefusal(ra) ?? assignRoleRefusal(ra, dto.role));

    const employee = await this.employeeRepo.findOne({
      where: { id: dto.employeeId },
    });
    if (!employee) throw new NotFoundException('No such employee.');
    if (employee.userId !== null) {
      throw new ConflictException('This employee already has a login.');
    }
    if (isAgentRole(employee.role)) {
      throw new ConflictException(
        'Collection agents get a mobile login from the Employees page, not a portal login.',
      );
    }
    if (employee.status !== 'Active') {
      throw new ConflictException(
        'Only an active employee can be given a login.',
      );
    }
    // one person = one NIC = one login: stops anyone (an Administrator included) holding a second
    // account — e.g. a Manager login — that would get around the no-self-approval checks
    const profiles = await this.feRepo.find();
    if (profiles.some((p) => norm(p.nic) === norm(employee.nic))) {
      throw new ConflictException('This person already has a portal login.');
    }
    const phone = (dto.phone ?? employee.contact ?? '').trim();
    if (!/^(?:\+94|0)\d{9}$/.test(phone)) {
      throw new BadRequestException(
        'The employee has no valid phone number on record; enter one.',
      );
    }
    await this.assertPhoneFree(phone, null);
    const email = cleanEmail(dto.email);
    await this.assertEmailFree(email, null);

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_COST);
    const dbRole = toDbRole(dto.role);

    const user = await this.userRepo.manager.transaction(async (m) => {
      const factory =
        profiles.find((p) => p.user_id === actor.sub)?.factory_id ??
        (
          await m.getRepository(Factory).find({ take: 1, order: { id: 'ASC' } })
        )[0]?.id;
      if (!factory) throw new ConflictException('No factory is set up yet.');
      const saved = await m.getRepository(User).save(
        m.getRepository(User).create({
          phone,
          email,
          name: employee.name.trim().slice(0, 32),
          password_hash: passwordHash,
          role: dbRole,
          status: 'active',
          must_change_password: true,
          token_version: 0,
          failed_login_count: 0,
          locked_until: null,
        }),
      );
      await m.getRepository(FactoryEmployee).save(
        m.getRepository(FactoryEmployee).create({
          user_id: saved.id,
          factory_id: factory,
          name: employee.name,
          nic: employee.nic,
          role: dbRole,
          is_active: true,
        }),
      );
      await m
        .getRepository(EmployeeEntity)
        .update({ id: employee.id }, { userId: saved.id, hasLogin: true });
      return saved;
    });

    const pub = await this.publicOf(user.id, actor);
    await this.record(actor, 'Created portal user', pub, {
      after: {
        name: pub.name,
        role: pub.role,
        phone,
        email,
        employeeId: employee.id,
      },
      details: `${pub.name} · ${pub.role} · linked to employee ${employee.name}`,
    });
    return { user: pub, temporaryPassword };
  }

  async update(
    formattedId: string,
    dto: UpdateSystemUserDto,
    actor: Actor,
  ): Promise<PublicSystemUser> {
    const { user, target, activeAdmins } = await this.load(formattedId);
    const ra = ruleActor(actor);
    refuse(editRefusal(ra, target));
    const profile = await this.feRepo.findOne({ where: { user_id: user.id } });

    const before = {
      name: profile?.name ?? user.name,
      phone: user.phone,
      email: user.email,
      role: target.role,
    };
    const after = { ...before };

    if (dto.role !== undefined && dto.role !== target.role) {
      refuse(roleChangeRefusal(ra, target, dto.role, activeAdmins));
      after.role = dto.role;
    }
    if (dto.name !== undefined && dto.name.trim() !== before.name) {
      after.name = dto.name.trim();
    }
    if (dto.phone !== undefined && dto.phone !== user.phone) {
      await this.assertPhoneFree(dto.phone, user.id);
      after.phone = dto.phone;
    }
    if (dto.email !== undefined) {
      const email = cleanEmail(dto.email);
      if (email !== user.email) {
        await this.assertEmailFree(email, user.id);
        after.email = email;
      }
    }
    const changed = (Object.keys(after) as (keyof typeof after)[]).filter(
      (k) => after[k] !== before[k],
    );
    if (changed.length === 0) return this.publicOf(user.id, actor);

    const roleChanged = after.role !== before.role;
    await this.userRepo.manager.transaction(async (m) => {
      await m.getRepository(User).update(
        { id: user.id },
        {
          name: after.name.slice(0, 32),
          phone: after.phone,
          email: after.email,
          role: toDbRole(after.role),
          // a role change applies on the user's next request: their old token is refused
          ...(roleChanged ? { token_version: user.token_version + 1 } : {}),
        },
      );
      if (profile) {
        await m
          .getRepository(FactoryEmployee)
          .update(
            { user_id: user.id },
            { name: after.name, role: toDbRole(after.role) },
          );
      }
    });

    const pub = await this.publicOf(user.id, actor);
    await this.record(
      actor,
      roleChanged ? 'Changed user role' : 'Edited user',
      pub,
      {
        before: pick(before, changed),
        after: pick(after, changed),
        reason: dto.reason?.trim() || undefined,
        details: changed
          .map(
            (k) =>
              `${k}: ${String(before[k] ?? '—')} → ${String(after[k] ?? '—')}`,
          )
          .join('; '),
      },
    );
    return pub;
  }

  async deactivate(
    formattedId: string,
    reason: string | undefined,
    actor: Actor,
  ) {
    const { user, target, activeAdmins } = await this.load(formattedId);
    refuse(deactivateRefusal(ruleActor(actor), target, activeAdmins));
    await this.userRepo.update(
      { id: user.id },
      { status: 'suspended', token_version: user.token_version + 1 },
    );
    const pub = await this.publicOf(user.id, actor);
    await this.record(actor, 'Deactivated user', pub, {
      before: { status: 'Active' },
      after: { status: 'Inactive' },
      reason: reason?.trim() || undefined,
      details: 'Portal access revoked; signed out everywhere',
    });
    return pub;
  }

  async reactivate(formattedId: string, actor: Actor) {
    const { user, target } = await this.load(formattedId);
    refuse(reactivateRefusal(ruleActor(actor), target));
    await this.userRepo.update(
      { id: user.id },
      { status: 'active', failed_login_count: 0, locked_until: null },
    );
    const pub = await this.publicOf(user.id, actor);
    await this.record(actor, 'Reactivated user', pub, {
      before: { status: 'Inactive' },
      after: { status: 'Active' },
      details: 'Portal access restored',
    });
    return pub;
  }

  /** Issues a new temporary password (shown once), forces a change at next sign-in, signs them out. */
  async resetPassword(
    formattedId: string,
    actor: Actor,
  ): Promise<IssuedPassword> {
    const { user, target } = await this.load(formattedId);
    refuse(resetRefusal(ruleActor(actor), target));
    const temporaryPassword = generateTemporaryPassword();
    await this.userRepo.update(
      { id: user.id },
      {
        password_hash: await bcrypt.hash(temporaryPassword, BCRYPT_COST),
        must_change_password: true,
        token_version: user.token_version + 1,
        failed_login_count: 0,
        locked_until: null,
      },
    );
    const pub = await this.publicOf(user.id, actor);
    await this.record(actor, 'Reset password', pub, {
      details:
        'Temporary password issued; change required at next sign-in; signed out everywhere',
    });
    return { user: pub, temporaryPassword };
  }

  async unlock(formattedId: string, actor: Actor) {
    const { user, target } = await this.load(formattedId);
    refuse(unlockRefusal(ruleActor(actor), target));
    await this.userRepo.update(
      { id: user.id },
      { failed_login_count: 0, locked_until: null },
    );
    const pub = await this.publicOf(user.id, actor);
    await this.record(actor, 'Unlocked user', pub, {
      before: { status: 'Locked' },
      after: { status: pub.status },
      details: 'Login lock cleared early',
    });
    return pub;
  }

  /** Confirmed link of a portal user to their HR record (NICs must match; never automatic). */
  async link(formattedId: string, employeeId: number, actor: Actor) {
    const { user, target } = await this.load(formattedId);
    refuse(editRefusal(ruleActor(actor), target));
    const employees = await this.employeeRepo.find();
    if (employees.some((e) => e.userId === user.id)) {
      throw new ConflictException(
        'This user is already linked to an employee.',
      );
    }
    const employee = employees.find((e) => e.id === employeeId);
    if (!employee) throw new NotFoundException('No such employee.');
    if (employee.userId !== null) {
      throw new ConflictException(
        'That employee is already linked to another login.',
      );
    }
    if (isAgentRole(employee.role)) {
      throw new ConflictException(
        'Collection agents are linked through their mobile login.',
      );
    }
    const profile = await this.feRepo.findOne({ where: { user_id: user.id } });
    if (!profile || norm(profile.nic) !== norm(employee.nic)) {
      throw new ConflictException(
        'The NIC on this login doesn’t match the employee’s NIC; check both records first.',
      );
    }
    await this.employeeRepo.update(
      { id: employee.id },
      { userId: user.id, hasLogin: true },
    );
    const pub = await this.publicOf(user.id, actor);
    await this.record(actor, 'Linked user to employee', pub, {
      before: { employee: null },
      after: { employee: { id: employee.id, name: employee.name } },
      details: `Linked to ${employee.name}`,
    });
    return pub;
  }

  async unlink(formattedId: string, actor: Actor) {
    const { user, target } = await this.load(formattedId);
    refuse(editRefusal(ruleActor(actor), target));
    const employee = await this.employeeRepo.findOne({
      where: { userId: user.id },
    });
    if (!employee)
      throw new ConflictException('This user isn’t linked to an employee.');
    await this.employeeRepo.update(
      { id: employee.id },
      { userId: null, hasLogin: false },
    );
    const pub = await this.publicOf(user.id, actor);
    await this.record(actor, 'Unlinked user from employee', pub, {
      before: { employee: { id: employee.id, name: employee.name } },
      after: { employee: null },
      details: `Unlinked from ${employee.name}`,
    });
    return pub;
  }

  // ── helpers ──────────────────────────────────────────────────────

  private assertManage(actor: Actor): void {
    refuse(manageRefusal(ruleActor(actor)));
  }

  private async load(formattedId: string) {
    const id = parseUserId(formattedId);
    const user = Number.isNaN(id)
      ? null
      : await this.userRepo.findOne({ where: { id } });
    if (!user || !FACTORY_DB_ROLES.includes(user.role)) {
      throw new NotFoundException('No such portal user.');
    }
    const all = (await this.userRepo.find()).filter((u) =>
      FACTORY_DB_ROLES.includes(u.role),
    );
    return {
      user,
      target: ruleTarget(user, new Date()),
      activeAdmins: countActiveAdmins(all),
    };
  }

  private async publicOf(
    userId: number,
    actor: Actor,
  ): Promise<PublicSystemUser> {
    const all = (await this.userRepo.find()).filter((u) =>
      FACTORY_DB_ROLES.includes(u.role),
    );
    const user = all.find((u) => u.id === userId);
    if (!user) throw new NotFoundException('No such portal user.');
    const profile = await this.feRepo.findOne({ where: { user_id: userId } });
    const employee = await this.employeeRepo.findOne({ where: { userId } });
    return this.toPublic(
      user,
      ruleActor(actor),
      countActiveAdmins(all),
      new Date(),
      {
        name: profile?.name,
        employee,
      },
    );
  }

  private toPublic(
    u: User,
    actor: RuleActor,
    activeAdmins: number,
    now: Date,
    extra: { name?: string; employee: EmployeeEntity | null },
  ): PublicSystemUser {
    const target = ruleTarget(u, now);
    return {
      id: formatUserId(u.id),
      name: extra.name ?? u.name ?? 'Unknown',
      role: target.role,
      phone: u.phone,
      email: u.email ?? null,
      status: statusOf(u, now),
      lastLogin: u.last_login_at
        ? new Date(u.last_login_at).toISOString()
        : null,
      lockedUntil:
        target.locked && u.locked_until
          ? new Date(u.locked_until).toISOString()
          : null,
      linkedEmployee: extra.employee
        ? { id: extra.employee.id, name: extra.employee.name }
        : null,
      isSelf: u.id === actor.id,
      actions: actionsFor(actor, target, activeAdmins),
    };
  }

  private async assertPhoneFree(phone: string, exceptId: number | null) {
    const other = await this.userRepo.findOne({ where: { phone } });
    if (other && other.id !== exceptId) {
      throw new ConflictException(
        'Another account already uses this phone number.',
      );
    }
  }

  private async assertEmailFree(email: string | null, exceptId: number | null) {
    if (!email) return;
    const all = await this.userRepo.find();
    if (
      all.some((u) => u.id !== exceptId && u.email?.toLowerCase() === email)
    ) {
      throw new ConflictException('Another account already uses this email.');
    }
  }

  private record(
    actor: Actor,
    action: string,
    target: PublicSystemUser,
    extra: {
      before?: Record<string, unknown>;
      after?: Record<string, unknown>;
      reason?: string;
      details?: string;
    },
  ) {
    return this.audit.record(
      { name: actor.name, role: actor.role, sub: actor.sub },
      {
        action,
        module: 'Administration',
        record: `${target.id} ${target.name}`.slice(0, 120),
        recordHref: '/admin/users',
        ...extra,
      },
    );
  }
}

// ── pure helpers ──────────────────────────────────────────────────

function norm(nic: string | null | undefined): string {
  return (nic ?? '').trim().toUpperCase();
}

function cleanEmail(email: string | undefined | null): string | null {
  const e = (email ?? '').trim().toLowerCase();
  if (!e) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
    throw new BadRequestException('Enter a valid email address');
  }
  return e;
}

function pick<T extends Record<string, unknown>>(o: T, keys: (keyof T)[]) {
  return Object.fromEntries(keys.map((k) => [k, o[k]])) as Record<
    string,
    unknown
  >;
}

function refuse(reason: string | null): void {
  if (!reason) return;
  if (
    /last active Administrator|already (in)?active|isn’t locked/.test(reason)
  ) {
    throw new ConflictException(reason);
  }
  throw new ForbiddenException(reason);
}

export function isLocked(u: Pick<User, 'locked_until'>, now: Date): boolean {
  return !!u.locked_until && new Date(u.locked_until).getTime() > now.getTime();
}

export function statusOf(u: User, now: Date): SystemUserStatus {
  if (u.status === 'suspended') return 'Inactive';
  return isLocked(u, now) ? 'Locked' : 'Active';
}

function ruleTarget(u: User, now: Date): RuleTarget {
  return {
    id: u.id,
    role: toPortalRole(u.role),
    active: u.status !== 'suspended',
    locked: isLocked(u, now),
  };
}

function ruleActor(actor: Actor): RuleActor {
  return { id: actor.sub, role: actor.role as PortalRole };
}

function countActiveAdmins(users: User[]): number {
  return users.filter(
    (u) => u.role === 'factory_admin' && u.status !== 'suspended',
  ).length;
}
