import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import {
  AuthService,
  type AgentLoginResult,
  type LoginResult,
  type PublicUser,
} from './auth.service';
import { AgentJwtGuard } from './agent-jwt.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AgentJwtPayload, JwtPayload } from './jwt-payload.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto): Promise<LoginResult> {
    return this.authService.login(dto.phone, dto.password);
  }

  /** Mobile collection-agent sign-in — a separate token audience from the portal. */
  @Post('agent/login')
  agentLogin(@Body() dto: LoginDto): Promise<AgentLoginResult> {
    return this.authService.agentLogin(dto.phone, dto.password);
  }

  /** The temporary password a newly registered agent was given must be changed before anything else works. */
  @UseGuards(AgentJwtGuard)
  @Post('agent/change-password')
  async changeAgentPassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: Request & { user: AgentJwtPayload },
  ): Promise<{ ok: true }> {
    await this.authService.changeAgentPassword(
      Number(req.user.sub),
      dto.currentPassword,
      dto.newPassword,
    );
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request & { user: JwtPayload }): Promise<PublicUser> {
    return this.authService.me(Number(req.user.sub));
  }
}
