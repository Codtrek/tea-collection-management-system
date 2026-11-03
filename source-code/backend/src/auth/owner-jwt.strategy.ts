import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtPayload } from './jwt-payload.interface';

@Injectable()
export class OwnerJwtStrategy extends PassportStrategy(Strategy, 'estate-owner') {
  constructor(config: ConfigService) {
    super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), ignoreExpiration: false, secretOrKey: config.getOrThrow<string>('JWT_SECRET') });
  }
  validate(payload: JwtPayload): JwtPayload {
    if (payload.role !== 'Estate Owner' || !/^\d+$/.test(payload.sub) || Number(payload.sub) < 1) {
      throw new UnauthorizedException('An estate owner account is required.');
    }
    return payload;
  }
}
