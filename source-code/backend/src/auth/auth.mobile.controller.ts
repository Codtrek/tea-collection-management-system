import { AuthGuard } from '@nestjs/passport';
import { UsersService } from '../users/users.service';
import { UpdateOwnerProfileDto } from './dto/update-owner-profile.dto';
import { Body, Controller, Get, Patch, Post, Req, UseGuards , HttpCode } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService, type LoginResult, type PublicUser } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

import type { JwtPayload } from './jwt-payload.interface';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('auth/mobile')
export class AuthMobileController {
  constructor(private readonly authService: AuthService, private readonly usersService: UsersService) {}

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

  @UseGuards(AuthGuard('estate-owner'))
  @Get('me')
  me(@Req() req: Request & { user: JwtPayload }): Promise<PublicUser> {
    return this.usersService.getOwnerDetails(Number(req.user.sub));
  }
  @UseGuards(AuthGuard('estate-owner'))
  @Patch('me')
  updateMe(@Req() req: Request & { user: JwtPayload }, @Body() dto: UpdateOwnerProfileDto) {
    return this.usersService.updateOwnerDetails(Number(req.user.sub), dto);
  }
}
