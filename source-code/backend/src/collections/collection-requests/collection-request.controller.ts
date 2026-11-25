import {
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { ExtractJwt } from 'passport-jwt';
import type { JwtPayload } from '../../auth/jwt-payload.interface';
import { CollectionRequestService } from './collection-request.service';
import { CollectionRequestDto } from './dto/create-collection-request.dto';

@Controller('collection-request')
export class CollectionRequestController {
  constructor(
    private readonly collectionRequests: CollectionRequestService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('create')
  async create(@Body() dto: CollectionRequestDto, @Req() req: Request) {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (!token) throw new UnauthorizedException();

    const actor = await this.jwtService
      .verifyAsync<JwtPayload>(token)
      .catch(() => {
        throw new UnauthorizedException();
      });
    const userId = Number(actor?.sub);
    if (!Number.isInteger(userId) || userId < 1) {
      throw new UnauthorizedException();
    }

    return this.collectionRequests.create(dto, userId, actor.role);
  }
}
