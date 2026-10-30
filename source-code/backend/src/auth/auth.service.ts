import {
  ConflictException,
  Injectable,
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
import type { DbRole } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { AgentDirectoryService } from '../dispatch/agent-directory.service';
import {
  AGENT_ROLE,
  type AgentJwtPayload,
  type JwtPayload,
} from './jwt-payload.interface';
import { toAppRole, type AppRole } from './role-map';

export interface PublicUser {
  id: string;
  name: string;
  role: AppRole;
  phone: string;
  factory: string;
  /** The role's server-stored permission map — the portal's `can()` reads this. */
  permissions: Record<ModuleKey, PermissionLevel>;
  factory?: string;
  estate?: string;
}

export interface LoginResult {
  accessToken: string;
  user: PublicUser;
}

export interface AgentLoginResult {
  accessToken: string;
  agent: { id: number; name: string; phone: string };
  /** true while the one-time temporary password is still in use — the app must force a change */
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
  ) {}

  async login(phone: string, password: string): Promise<LoginResult> {
    const user = await this.usersService.findByPhone(phone);
    if (!user) {
      throw new UnauthorizedException(
        'No account found with this phone number.',
      );
    }
    if (!(await bcrypt.compare(password, user.password_hash))) {
      throw new UnauthorizedException('The password is incorrect.');
    }
    if (user.status === 'suspended') {
      throw new UnauthorizedException(
        'This account has been suspended. Contact an administrator.',
      );
    }

    await this.usersService.markLogin(user.id);
    switch (user.role) {
      case 'estate_owner': {
        const estateOwnerPublicUser = await this.buildEstateOwnerPublicUser(
          user.id,
          user.phone,
          user.role,
        );
        const payload: JwtPayload = {
          sub: String(user.id),
          role: estateOwnerPublicUser.role,
        };
        return {
          accessToken: this.jwtService.sign(payload),
          user: estateOwnerPublicUser,
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
        };
        return {
          accessToken: this.jwtService.sign(payload),
          user: publicUser,
        };
      }
    }
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
   * Mobile sign-in for collection agents (phone + password). Issues an AGENT-role
   * token that the portal API refuses; only `/dispatch/me/*` accepts it.
   */
  async agentLogin(phone: string, password: string): Promise<AgentLoginResult> {
    const user = await this.usersService.findByPhone(phone);
    if (!user) {
      throw new UnauthorizedException(
        'No account found with this phone number.',
      );
    }
    if (!(await bcrypt.compare(password, user.password_hash))) {
      throw new UnauthorizedException('The password is incorrect.');
    }
    if (user.status === 'suspended') {
      throw new UnauthorizedException(
        'This account has been suspended. Contact your factory.',
      );
    }
    const agent =
      user.role === 'collection_agent'
        ? await this.agentDirectory.byUserId(user.id)
        : null;
    if (!agent) {
      throw new UnauthorizedException(
        'This account is not a collection agent.',
      );
    }
    await this.usersService.markLogin(user.id);
    const payload: AgentJwtPayload = { sub: String(user.id), role: AGENT_ROLE };
    return {
      accessToken: this.jwtService.sign(payload),
      agent: { id: agent.agentId, name: agent.name, phone: user.phone },
      mustChangePassword: user.must_change_password,
    };
  }

  /** First sign-in: swap the one-time temporary password for the agent's own. */
  async changeAgentPassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
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
    await this.usersService.setPassword(
      userId,
      await bcrypt.hash(newPassword, 10),
    );
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
    return this.buildPublicUser(user.id, user.phone, user.role);
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
    const role = toAppRole(dbRole);
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
