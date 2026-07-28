import { Injectable, UnauthorizedException } from '@nestjs/common';
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
import type { JwtPayload } from './jwt-payload.interface';
import { toAppRole, type AppRole } from './role-map';

export interface PublicUser {
  id: string;
  name: string;
  role: AppRole;
  phone: string;
  factory: string;
  /** The role's server-stored permission map — the portal's `can()` reads this. */
  permissions: Record<ModuleKey, PermissionLevel>;
}

export interface LoginResult {
  accessToken: string;
  user: PublicUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(RolePermissionEntity)
    private readonly permissionRepo: Repository<RolePermissionEntity>,
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
    const publicUser = await this.buildPublicUser(
      user.id,
      user.phone,
      user.role,
    );
    const payload: JwtPayload = { sub: String(user.id), role: publicUser.role };
    const accessToken = this.jwtService.sign(payload);

    return { accessToken, user: publicUser };
  }

  async me(userId: number): Promise<PublicUser> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Account no longer exists.');
    }
    return this.buildPublicUser(user.id, user.phone, user.role);
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
