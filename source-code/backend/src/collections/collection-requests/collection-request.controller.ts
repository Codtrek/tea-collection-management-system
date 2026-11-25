import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { ExtractJwt } from 'passport-jwt';
import type { JwtPayload } from '../../auth/jwt-payload.interface';
import { CollectionRequestService } from './collection-request.service';
import { CollectionRequestDto } from './dto/create-collection-request.dto';
import { PatchCollectionRequestDto } from './dto/patch-collection-request.dto';

@Controller('collection-request')
export class CollectionRequestController {
  constructor(
    private readonly collectionRequests: CollectionRequestService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('create')
  async create(@Body() dto: CollectionRequestDto, @Req() req: Request) {
    const { userId, role } = await this.authenticate(req);
    return this.collectionRequests.create(dto, userId, role);
  }

  @Get()
  async listForOwner(@Req() req: Request) {
    const { userId, role } = await this.authenticate(req);
    return this.collectionRequests.listForOwner(userId, role);
  }

  @Get('estates')
  async listOwnerEstates(@Req() req: Request) {
    const { userId, role } = await this.authenticate(req);
    return this.collectionRequests.listOwnerEstates(userId, role);
  }

  @Get(':id')
  async getOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const { userId, role } = await this.authenticate(req);
    return this.collectionRequests.getOne(id, userId, role);
  }

  @Put(':id')
  async replace(@Param('id', ParseIntPipe) id: number, @Body() dto: CollectionRequestDto, @Req() req: Request) {
    const { userId, role } = await this.authenticate(req);
    return this.collectionRequests.updatePending(id, { estateId: dto.estateId, notes: dto.notes ?? null }, userId, role);
  }

  @Patch(':id')
  async patch(@Param('id', ParseIntPipe) id: number, @Body() dto: PatchCollectionRequestDto, @Req() req: Request) {
    const { userId, role } = await this.authenticate(req);
    return this.collectionRequests.updatePending(id, dto, userId, role);
  }

  @Delete(':id')
  async deletePending(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const { userId, role } = await this.authenticate(req);
    return this.collectionRequests.deletePending(id, userId, role);
  }

  private async authenticate(req: Request) {
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

    return { userId, role: actor.role };
  }
}
