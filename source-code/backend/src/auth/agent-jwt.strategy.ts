import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AGENT_ROLE, type AgentJwtPayload } from './jwt-payload.interface';

/** Accepts ONLY mobile collection-agent tokens (strategy name: 'jwt-agent'). */
@Injectable()
export class AgentJwtStrategy extends PassportStrategy(Strategy, 'jwt-agent') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: AgentJwtPayload): AgentJwtPayload {
    if (payload.role !== AGENT_ROLE) {
      throw new UnauthorizedException(
        'This endpoint is for collection agents only.',
      );
    }
    return payload;
  }
}
