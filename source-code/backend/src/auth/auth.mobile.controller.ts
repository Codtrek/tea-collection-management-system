import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService, type LoginResult, type PublicUser } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { JwtPayload } from './jwt-payload.interface';

@Controller('auth/mobile')
export class AuthMobileController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto): Promise<LoginResult> {
    return this.authService.login(dto.phone, dto.password);
  }

  @Post('register')
  register(@Body() dto: RegisterDto): Promise<LoginResult> {
    return this.authService.register(
      dto.name,
      dto.phoneNumber,
      dto.nic,
      dto.password,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request & { user: JwtPayload }): Promise<PublicUser> {
    return this.authService.me(Number(req.user.sub));
  }
}
