import { Body, Controller, Get, Post, Req, UseGuards , HttpCode } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService, type LoginResult, type PublicUser } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterEstateManagerDto } from './dto/register-estate-manager.dto';
import { ExtractJwt } from 'passport-jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { JwtPayload } from './jwt-payload.interface';
import { SkipThrottle } from '@nestjs/throttler';
import { PortalOnly } from './permissions';

@Controller('auth/mobile')
export class AuthMobileController {
  constructor(private readonly authService: AuthService) {}

  @SkipThrottle({short: true , medium:true , long:true})
  @Post('login')
  login(@Body() dto: LoginDto): Promise<LoginResult> {
    return this.authService.login(dto.phone, dto.password);
  }

  @SkipThrottle({short: true , medium:true , long:true})
  @Post('register')
  register(@Body() dto: RegisterDto): Promise<LoginResult> {
    return this.authService.register(
      dto.name,
      dto.phone,
      dto.nic,
      dto.password,
    );
  }

  @Post('estate-managers')
  registerManager(@Req() req: Request, @Body() dto: RegisterEstateManagerDto) {
    return this.authService.registerEstateManager(ExtractJwt.fromAuthHeaderAsBearerToken()(req), dto);
  }

  @PortalOnly()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request & { user: JwtPayload }): Promise<PublicUser> {
    return this.authService.me(Number(req.user.sub));
  }
}
