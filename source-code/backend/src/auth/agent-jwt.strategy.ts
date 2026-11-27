import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { checkAgentSession } from './agent-session';
import type { AgentJwtPayload } from './jwt-payload.interface';

/**
 * Accepts ONLY mobile collection-agent tokens (strategy name: 'jwt-agent'), and re-reads the
 * user on every request — see `checkAgentSession`. One primary-key lookup, no cache, on purpose.
 */
@Injectable()
export class AgentJwtStrategy extends PassportStrategy(Strategy, 'jwt-agent') {
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

  async validate(
    req: Request,
    payload: AgentJwtPayload,
  ): Promise<AgentJwtPayload> {
    const id = Number(payload.sub);
    const user = Number.isInteger(id)
      ? await this.users.findOne({ where: { id } })
      : null;
    return checkAgentSession(user, payload, req.originalUrl ?? req.url ?? '');
  }
}
