import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';
import { type Observable, tap } from 'rxjs';
import {
  needsRefresh,
  SESSION_TOKEN_HEADER,
  signAgentToken,
} from './agent-session';
import { AGENT_ROLE, type AgentJwtPayload } from './jwt-payload.interface';

/**
 * The sliding half of the 30-day agent session (agent-session.ts). Registered globally, it acts
 * only on requests the agent guard has already accepted (`req.user` is a validated agent payload
 * whose `tv` matched the database), and only when the handler SUCCEEDS: a refused, revoked or
 * failed call never gets a new token.
 */
@Injectable()
export class AgentSessionInterceptor implements NestInterceptor {
  constructor(private readonly jwt: JwtService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const http = context.switchToHttp();
    const user = http.getRequest<{ user?: AgentJwtPayload }>().user;
    return next.handle().pipe(
      tap(() => {
        if (
          user?.role !== AGENT_ROLE ||
          !needsRefresh(user, Math.floor(Date.now() / 1000))
        ) {
          return;
        }
        const res = http.getResponse<Response>();
        if (res.headersSent) return;
        res.setHeader(
          SESSION_TOKEN_HEADER,
          signAgentToken(this.jwt, Number(user.sub), user.tv ?? 0),
        );
      }),
    );
  }
}
