import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ExtractJwt } from 'passport-jwt';
import { AuthService } from '../auth/auth.service';
import { RegisterOwnedEstateDto } from './dto/register-owned-estate.dto';
import { EstatesService } from './estates.service';

@Controller('mobile/estates')
export class OwnedEstatesController {
  constructor(private readonly auth: AuthService, private readonly estates: EstatesService) {}

  @Post()
  async register(@Req() req: Request, @Body() dto: RegisterOwnedEstateDto) {
    const ownerId = await this.auth.requireEstateOwner(ExtractJwt.fromAuthHeaderAsBearerToken()(req));
    return this.estates.registerForOwner(ownerId, dto);
  }
}
