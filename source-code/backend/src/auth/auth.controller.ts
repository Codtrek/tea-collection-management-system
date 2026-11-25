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
import { SkipThrottle } from '@nestjs/throttler';
import { PortalOnly } from './permissions';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @SkipThrottle({ short: true, medium: true, long:true })
  @Post('login')
  login(@Body() dto: LoginDto): Promise<LoginResult> {
    return this.authService.login(dto.phone, dto.password);
  }

  /** Mobile collection-agent sign-in — a separate token audience from the portal. */
  @Post('agent/login')
  agentLogin(@Body() dto: LoginDto): Promise<AgentLoginResult> {
    return this.authService.agentLogin(dto.phone, dto.password);
  }



  
  @SkipThrottle({ short: true, medium: true, long: true })
  @Post('mobile/login')
  mobileLogin(
    @Body() dto: LoginDto,
  ): Promise<LoginResult | AgentLoginResult> {
    return this.authService.mobileLogin(dto.phone, dto.password);
  }

  /** The temporary password a newly registered agent was given must be changed before anything else works. */
  @UseGuards(AgentJwtGuard)
  @Post('agent/change-password')
  async changeAgentPassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: Request & { user: AgentJwtPayload },
  ): Promise<{ ok: true; accessToken: string }> {
    const { accessToken } = await this.authService.changeAgentPassword(
      Number(req.user.sub),
      dto.currentPassword,
      dto.newPassword,
    );
    // The change ends every other session; this device continues with the new token.
    return { ok: true, accessToken };
  }

  /** Agent sign-out: the current token (and any other for this login) stops working. */
  @UseGuards(AgentJwtGuard)
  @Post('agent/logout')
  async agentLogout(
    @Req() req: Request & { user: AgentJwtPayload },
  ): Promise<{ ok: true }> {
    await this.authService.agentLogout(Number(req.user.sub));
    return { ok: true };
  }

  /**
   * Portal password change (and the forced change after a temporary password). Returns a fresh
   * token: the change bumps the token version, which ends every other session.
   */
  @PortalOnly()
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: Request & { user: JwtPayload },
  ): Promise<LoginResult> {
    return this.authService.changePortalPassword(
      Number(req.user.sub),
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @PortalOnly()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request & { user: JwtPayload }): Promise<PublicUser > {
    return this.authService.me(Number(req.user.sub));
  }
}
