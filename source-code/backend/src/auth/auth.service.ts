import {
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { RolePermissionEntity } from '../admin/role-permission.entity';
import {
  roleMapFromRows,
  type ModuleKey,
  type PermissionLevel,
} from '../admin/admin-map';
import { AuditService, SYSTEM_ACTOR } from '../audit/audit.service';
import type { DbRole, User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { AgentDirectoryService } from '../dispatch/agent-directory.service';
import { signAgentToken } from './agent-session';
import type { JwtPayload } from './jwt-payload.interface';
import type { RegisterEstateManagerDto } from './dto/register-estate-manager.dto';
import { toAppRole, toPortalRole, type AppRole } from './role-map';

export interface PublicUser {
  id: string;
  name: string;
  role: AppRole;
  phone: string;
  /** Factory-side roles only. */
  factory?: string;
  /**
   * The role's server-stored permission map — the portal's `can()` reads this.
   * Factory-side roles only; estate roles have no portal permissions.
   */
  permissions?: Record<ModuleKey, PermissionLevel>;
  /** Estate-side roles only. */
  estate?: string;
  /** Portal: a temporary password is in use — every route but /auth/me and change-password is refused. */
  mustChangePassword?: boolean;
}

export interface LoginResult {
  accessToken: string;
  user: PublicUser;
  /** Portal: true while a temporary password is in use — the portal sends the user to change it. */
  mustChangePassword?: boolean;
}

/** 5 wrong passwords in a row lock the login for 15 minutes (Users-Roles-Addendum §7). */
export const LOCKOUT_THRESHOLD = 5;
export const LOCKOUT_MINUTES = 15;

export function lockedMinutesLeft(
  user: Pick<User, 'locked_until'>,
  now: Date,
): number {
  if (!user.locked_until) return 0;
  const ms = new Date(user.locked_until).getTime() - now.getTime();
  return ms > 0 ? Math.ceil(ms / 60_000) : 0;
}

export interface AgentLoginResult {
  accessToken: string;
  agent: { id: number; name: string; phone: string; role: string };
  /** true while the one-time temporary password is still in use — the app must force a change */
  mustChangePassword: boolean;
}

export interface AgentSessionResult {
  agent: { id: number; name: string; phone: string; role: string };
  mustChangePassword: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(RolePermissionEntity)
    private readonly permissionRepo: Repository<RolePermissionEntity>,
    private readonly agentDirectory: AgentDirectoryService,
    @Optional() private readonly audit?: AuditService,
  ) {}

  /**
   * Lockout gate shared by portal, mobile and agent sign-in: a locked login is refused even with
   * the right password; a wrong password counts towards the lock; a right one resets the count.
   */
  private async verifyPassword(
    user: User,
    password: string,
    now: Date = new Date(),
  ): Promise<void> {
    const left = lockedMinutesLeft(user, now);
    if (left > 0) {
      throw new UnauthorizedException(
        `Too many wrong passwords. Try again in ${left} minute${left === 1 ? '' : 's'}.`,
      );
    }
    if (!(await bcrypt.compare(password, user.password_hash))) {
      const failures = (user.failed_login_count ?? 0) + 1;
      if (failures >= LOCKOUT_THRESHOLD) {
        const until = new Date(now.getTime() + LOCKOUT_MINUTES * 60_000);
        await this.usersService.setLoginFailures(user.id, 0, until);
        await this.audit?.record(SYSTEM_ACTOR, {
          action: 'Locked user after failed sign-ins',
          module: 'Administration',
          record: `USR-${String(user.id).padStart(4, '0')} ${user.name ?? ''}`
            .trim()
            .slice(0, 120),
          recordHref: '/admin/users',
          details: `${LOCKOUT_THRESHOLD} wrong passwords in a row; locked for ${LOCKOUT_MINUTES} minutes`,
          after: { lockedUntil: until.toISOString() },
        });
        throw new UnauthorizedException(
          `Too many wrong passwords. Try again in ${LOCKOUT_MINUTES} minutes.`,
        );
      }
      await this.usersService.setLoginFailures(user.id, failures, null);
      throw new UnauthorizedException('The password is incorrect.');
    }
    if ((user.failed_login_count ?? 0) > 0 || user.locked_until) {
      await this.usersService.setLoginFailures(user.id, 0, null);
    }
  }

  async login(phone: string, password: string): Promise<LoginResult> {
    const user = await this.usersService.findByPhone(phone);

    if (!user) {
      throw new UnauthorizedException(
        'No account found with this phone number.',
      );
    }

    return this.loginWithUser(user, password);
  }


  /**
   * Unified mobile login for Estate Owners, Estate Managers,
   * and Collection Agents.
   */

  async mobileLogin(
    phone: string,
    password: string,
  ): Promise<LoginResult | AgentLoginResult> {
    const user = await this.usersService.findByPhone(phone);

    if (!user) {
      throw new UnauthorizedException(
        'No account found with this phone number.',
      );
    }

    // Allow only the three roles supported by the mobile app.
    if (
      user.role !== 'estate_owner' &&
      user.role !== 'estate_manager' &&
      user.role !== 'collection_agent'
    ) {
      throw new UnauthorizedException(
        'This account does not have a mobile dashboard.',
      );
    }



    if (user.role === 'collection_agent') {
      return this.agentLoginWithUser(user, password);
    }

    return this.loginWithUser(user, password);
  }



  async requireEstateOwner(token: string | null) {
    if (!token) throw new UnauthorizedException();
    const actor = await this.jwtService.verifyAsync<JwtPayload>(token).catch(() => {
      throw new UnauthorizedException();
    });
    const ownerId = Number(actor.sub);
    if (!Number.isSafeInteger(ownerId) || ownerId < 1) throw new UnauthorizedException();
    if (actor.role !== 'Estate Owner') throw new ForbiddenException();
    const owner = await this.usersService.findById(ownerId);
    if (owner?.role !== 'estate_owner' || owner.status !== 'active') throw new ForbiddenException();
    return ownerId;
  }

  async registerEstateManager(token: string | null, dto: RegisterEstateManagerDto) {
    const ownerId = await this.requireEstateOwner(token);
    if (dto.dateOfBirth > new Date().toISOString().slice(0, 10)) {
      throw new BadRequestException('Date of birth cannot be in the future.');
    }
    const hash = await bcrypt.hash(dto.password, 10);
    return this.usersService.createEstateManager(ownerId, dto, hash);
  }

  async register(
    name: string,
    phone: string,
    nic: string,
    password: string,
  ): Promise<LoginResult> {
    const [existingPhone, existingNic] = await Promise.all([
      this.usersService.findByPhone(phone),
      this.usersService.findByNic(nic),
    ]);
    if (existingPhone) {
      throw new ConflictException(
        'An account already exists for this phone number.',
      );
    }
    if (existingNic) {
      throw new ConflictException('An account already exists for this NIC.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.usersService.createEstateOwner(
      name,
      phone,
      nic,
      passwordHash,
    );

    const accessToken = await this.jwtService.signAsync({
      sub: String(user.id),
      role: 'Estate Owner',
    });

    return {
      accessToken,
      user: {
        id: String(user.id),
        name,
        role: 'Estate Owner',
        phone: user.phone,
      },
    };
  }

  /**
   * Direct agent sign-in endpoint for clients that authenticate agents separately.
   * The mobile app uses mobileLogin() to choose the correct session by account role.
   */
  
  





  
   

  async agentLogin(
    phone: string,
    password: string,
  ): Promise<AgentLoginResult> {
    const user = await this.usersService.findByPhone(phone);

    if (!user) {
      throw new UnauthorizedException(
        'No account found with this phone number.',
      );
    }

    return this.agentLoginWithUser(user, password);
  }

  async agentSession(userId: number): Promise<AgentSessionResult> {
    const user = await this.usersService.findById(userId);
    if (!user || user.role !== 'collection_agent') {
      throw new UnauthorizedException(
        'This account is not a collection agent.',
      );
    }
    if (user.status === 'suspended') {
      throw new ForbiddenException({
        code: 'AGENT_SESSION_INVALID',
        message: 'This login has been suspended. Contact your factory.',
      });
    }

    const [agent, role] = await Promise.all([
      this.agentDirectory.byUserId(userId),
      this.agentDirectory.roleByUserId(userId),
    ]);
    if (!agent || !role) {
      throw new ForbiddenException({
        code: 'AGENT_SESSION_INVALID',
        message: 'This account is not an active collection agent.',
      });
    }

    return {
      agent: {
        id: agent.agentId,
        name: agent.name,
        phone: user.phone,
        role,
      },
      mustChangePassword: user.must_change_password,
    };
  }














  private async loginWithUser(
    user: User,
    password: string,
  ): Promise<LoginResult> {
    await this.verifyPassword(user, password);

    if (user.status === 'suspended') {
      throw new UnauthorizedException(
        'This account has been suspended. Contact an administrator.',
      );
    }

    await this.usersService.markLogin(user.id);

    switch (user.role) {
      case 'estate_owner': {
        const publicUser = await this.buildEstateOwnerPublicUser(
          user.id,
          user.phone,
          user.role,
        );

        const payload: JwtPayload = {
          sub: String(user.id),
          role: publicUser.role,
        };

        return {
          accessToken: this.jwtService.sign(payload),
          user: publicUser,
        };
      }

      case 'estate_manager': {
        const publicUser = await this.buildEstateManagerPublicUser(
          user.id,
          user.phone,
          user.role,
        );

        const payload: JwtPayload = {
          sub: String(user.id),
          role: publicUser.role,
        };

        return {
          accessToken: this.jwtService.sign(payload),
          user: publicUser,
        };
      }

      default: {
        const publicUser = await this.buildPublicUser(
          user.id,
          user.phone,
          user.role,
        );

        const payload: JwtPayload = {
          sub: String(user.id),
          role: publicUser.role,
          tv: user.token_version ?? 0,
        };

        return {
          accessToken: this.jwtService.sign(payload),
          user: {
            ...publicUser,
            mustChangePassword: user.must_change_password,
          },
          mustChangePassword: user.must_change_password,
        };
      }
    }
  }


 







  private async agentLoginWithUser(
    user: User,
    password: string,
  ): Promise<AgentLoginResult> {
    await this.verifyPassword(user, password);

    if (user.status === 'suspended') {
      throw new UnauthorizedException(
        'This account has been suspended. Contact your factory.',
      );
    }

    const agent =
      user.role === 'collection_agent'
        ? await this.agentDirectory.byUserId(user.id)
        : null;
    const role = agent ? await this.agentDirectory.roleByUserId(user.id) : null;

    if (!agent || !role) {
      throw new UnauthorizedException(
        'This account is not a collection agent.',
      );
    }

    await this.usersService.markLogin(user.id);

    return {
      // 30 days, sliding; carries the token version (agent-session.ts)
      accessToken: signAgentToken(
        this.jwtService,
        user.id,
        user.token_version ?? 0,
      ),
      agent: {
        id: agent.agentId,
        name: agent.name,
        phone: user.phone,
        role,
      },
      mustChangePassword: user.must_change_password,
    };
  }
 








  /** First sign-in: swap the one-time temporary password for the agent's own. */
  /**
   * Bumps `token_version`, so every other agent session (another phone, a stolen token) ends on
   * its next request; returns a fresh token for this device, which the app must save.
   */
  async changeAgentPassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ accessToken: string }> {
    const user = await this.usersService.findById(userId);
    if (!user || user.role !== 'collection_agent') {
      throw new UnauthorizedException(
        'This account is not a collection agent.',
      );
    }
    if (!(await bcrypt.compare(currentPassword, user.password_hash))) {
      throw new UnauthorizedException('The current password is incorrect.');
    }
    if (currentPassword === newPassword) {
      throw new ConflictException(
        'Choose a new password different from the current one.',
      );
    }
    const tv = await this.usersService.setPassword(
      userId,
      await bcrypt.hash(newPassword, 10),
      { bumpTokenVersion: true },
    );
    return { accessToken: signAgentToken(this.jwtService, userId, tv) };
  }

  /** Agent sign-out: ends this login's sessions (the version bump refuses every agent token). */
  async agentLogout(userId: number): Promise<void> {
    await this.usersService.bumpTokenVersion(userId);
  }

  /**
   * Portal password change — also how a temporary password is replaced at first sign-in. Bumps
   * `token_version` (signs out every other session) and returns a fresh token for this one.
   */
  async changePortalPassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<LoginResult> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('Account no longer exists.');
    if (!(await bcrypt.compare(currentPassword, user.password_hash))) {
      throw new UnauthorizedException('The current password is incorrect.');
    }
    if (currentPassword === newPassword) {
      throw new ConflictException(
        'Choose a new password different from the current one.',
      );
    }
    const tv = await this.usersService.setPassword(
      userId,
      await bcrypt.hash(newPassword, 10),
      { bumpTokenVersion: true },
    );
    await this.audit?.record(
      { name: user.name, role: toPortalRole(user.role), sub: user.id },
      {
        action: 'Changed own password',
        module: 'Administration',
        record: `USR-${String(user.id).padStart(4, '0')} ${user.name ?? ''}`
          .trim()
          .slice(0, 120),
        details: user.must_change_password
          ? 'Temporary password replaced at sign-in'
          : 'Password changed; other sessions signed out',
      },
    );
    const publicUser = await this.buildPublicUser(
      user.id,
      user.phone,
      user.role,
    );
    const payload: JwtPayload = {
      sub: String(user.id),
      role: publicUser.role,
      tv,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      user: { ...publicUser, mustChangePassword: false },
      mustChangePassword: false,
    };
  }

  async me(userId: number): Promise<PublicUser> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Account no longer exists.');
    }
    if (user.role === 'estate_owner') {
      return this.buildEstateOwnerPublicUser(user.id, user.phone, user.role);
    } else if (user.role === 'estate_manager') {
      return this.buildEstateManagerPublicUser(user.id, user.phone, user.role);
    }
    return {
      ...(await this.buildPublicUser(user.id, user.phone, user.role)),
      mustChangePassword: user.must_change_password,
    };
  }
  private async buildEstateManagerPublicUser(
    id: number,
    phone: string,
    dbRole: DbRole,
  ): Promise<PublicUser> {
    const role = toAppRole(dbRole);
    const profile = await this.usersService.getEstateManagerProfile(id);

    if (!profile) {
      throw new UnauthorizedException(
        'No Estate Owner profile found for this account.',
      );
    }
    return {
      id: String(id),
      name: profile.name,
      role,
      phone,
      estate: profile.estate,
    };
  }
  private async buildEstateOwnerPublicUser(
    id: number,
    phone: string,
    dbRole: DbRole,
  ): Promise<PublicUser> {
    const role = toAppRole(dbRole);
    const profile = await this.usersService.getEstateOwnerProfile(id);

    if (!profile) {
      throw new UnauthorizedException(
        'No Estate Owner profile found for this account.',
      );
    }
    return {
      id: String(id),
      name: profile.name,
      role,
      phone,
      estate: profile.estate,
    };
  }

  private async buildPublicUser(
    id: number,
    phone: string,
    dbRole: DbRole,
  ): Promise<PublicUser> {
    const role = toPortalRole(dbRole);
    const profile = await this.usersService.getProfile(id);
    if (!profile) {
      throw new UnauthorizedException(
        'No employee profile found for this account.',
      );
    }
    // Server-driven permissions: the role's map from `role_permissions`. Empty
    // if unseeded — the portal falls back to its DEFAULT_PERMISSIONS constant.
    const permRows = await this.permissionRepo.find({ where: { role } });
    return {
      id: String(id),
      name: profile.name,
      role,
      phone,
      factory: profile.factory,
      permissions: roleMapFromRows(permRows, role),
    };
  }
}
