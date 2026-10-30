import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PORTAL_ROLES } from '../admin/admin-map';
import { AGENT_ROLE, type JwtPayload } from './jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    // A mobile agent token is signed with the same secret — it must NOT open the portal API.
    if (
      (payload.role as string) === AGENT_ROLE ||
      !PORTAL_ROLES.includes(payload.role)
    ) {
      throw new UnauthorizedException(
        'This token cannot access the factory portal.',
      );
    }
    return payload;
  }
}
