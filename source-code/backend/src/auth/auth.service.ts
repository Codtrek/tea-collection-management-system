import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { DbRole } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import type { JwtPayload } from './jwt-payload.interface';
import { toAppRole, type AppRole } from './role-map';

export interface PublicUser {
  id: string;
  name: string;
  role: AppRole;
  phone: string;
  factory?: string;
  estate?: string;
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
    return {
      id: String(id),
      name: profile.name,
      role,
      phone,
      factory: profile.factory,
    };
  }
}
