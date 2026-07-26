import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { UsersService } from '../users/users.service';
import type { PublicCollection } from './collection-map';
import { type Actor, CollectionsService } from './collections.service';
import { CreateExceptionDto } from './dto/create-exception.dto';
import { FlagCollectionDto } from './dto/flag-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';

type AuthedRequest = Request & { user: JwtPayload };

@Controller('collections')
@UseGuards(JwtAuthGuard)
export class CollectionsController {
  constructor(
    private readonly collectionsService: CollectionsService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  findAll(): Promise<PublicCollection[]> {
    return this.collectionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<PublicCollection> {
    return this.collectionsService.findById(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCollectionDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicCollection> {
    return this.collectionsService.update(
      id,
      dto,
      await this.resolveActor(req),
    );
  }

  @Post()
  async createException(
    @Body() dto: CreateExceptionDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicCollection> {
    return this.collectionsService.createException(
      dto,
      await this.resolveActor(req),
    );
  }

  @Post(':id/flag')
  async flag(
    @Param('id') id: string,
    @Body() dto: FlagCollectionDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicCollection> {
    return this.collectionsService.flag(id, dto, await this.resolveActor(req));
  }

  /** Resolves the JWT's `sub` to the acting user's display name + role for stamping. */
  private async resolveActor(req: AuthedRequest): Promise<Actor> {
    const profile = await this.usersService.getProfile(Number(req.user.sub));
    return { name: profile?.name ?? 'Unknown', role: req.user.role };
  }
}
