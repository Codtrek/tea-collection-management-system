import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { PORTAL_ROLES } from '../admin/admin-map';
import { User } from '../users/user.entity';
import { AGENT_ROLE, type JwtPayload } from './jwt-payload.interface';
import { checkPortalSession } from './session-check';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  /** One primary-key lookup per request — see `checkPortalSession`. No cache, on purpose. */
  async validate(req: Request, payload: JwtPayload): Promise<JwtPayload> {
    // A mobile agent token is signed with the same secret — it must NOT open the portal API.
    if (
      (payload.role as string) === AGENT_ROLE ||
      !(PORTAL_ROLES as string[]).includes(payload.role)
    ) {
      throw new UnauthorizedException(
        'This token cannot access the factory portal.',
      );
    }
    const id = Number(payload.sub);
    const user = Number.isInteger(id)
      ? await this.users.findOne({ where: { id } })
      : null;
    return checkPortalSession(user, payload, req.originalUrl ?? req.url ?? '');
  }
}
