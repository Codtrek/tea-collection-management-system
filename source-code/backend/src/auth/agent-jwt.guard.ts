import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AgentJwtGuard extends AuthGuard('jwt-agent') {}
