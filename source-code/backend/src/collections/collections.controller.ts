import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { UsersService } from '../users/users.service';
import type {
  PublicCollection,
  PublicCorrectionRequest,
  PublicRevision,
} from './collection-map';
import { type Actor, CollectionsService } from './collections.service';
import { GradingNotificationService } from './grading-notification.service';
import { type GradingContext, GradingService } from './grading.service';
import { CreateExceptionDto } from './dto/create-exception.dto';
import { DecideCorrectionDto } from './dto/decide-correction.dto';
import { RequestCorrectionDto } from './dto/request-correction.dto';
import { SetGradeLinesDto } from './dto/set-grade-lines.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';

type AuthedRequest = Request & { user: JwtPayload };

@Controller('collections')
@UseGuards(JwtAuthGuard)
export class CollectionsController {
  constructor(
    private readonly collectionsService: CollectionsService,
    private readonly grading: GradingService,
    private readonly ownerNotifications: GradingNotificationService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  findAll(): Promise<PublicCollection[]> {
    return this.collectionsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<PublicCollection> {
    return this.grading.decorate(await this.collectionsService.findById(id));
  }

  /** Estate weight, tolerance, usual range — what the grading review step warns against. */
  @Get(':id/grading-context')
  gradingContext(@Param('id') id: string): Promise<GradingContext> {
    return this.grading.context(id);
  }

  @Get(':id/revisions')
  revisions(@Param('id') id: string): Promise<PublicRevision[]> {
    return this.grading.listRevisions(id);
  }

  @Get(':id/corrections')
  corrections(@Param('id') id: string): Promise<PublicCorrectionRequest[]> {
    return this.grading.listCorrections(id);
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

  /**
   * Factory-side grading — grade lines are never written by agents or owners. The first save
   * grades + confirms; while the delivery is OPEN the same call edits it (a reason is required).
   */
  @Put(':id/grade-lines')
  async setGradeLines(
    @Param('id') id: string,
    @Body() dto: SetGradeLinesDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicCollection> {
    await this.grading.setGradeLines(id, dto, await this.resolveActor(req));
    return this.findOne(id);
  }

  /** End the OPEN window now (also releases the held owner notification). */
  @Post(':id/finalize')
  async finalize(
    @Param('id') id: string,
    @Req() req: AuthedRequest,
  ): Promise<PublicCollection> {
    await this.grading.finalize(id, await this.resolveActor(req));
    return this.findOne(id);
  }

  @Post(':id/corrections')
  async requestCorrection(
    @Param('id') id: string,
    @Body() dto: RequestCorrectionDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicCorrectionRequest> {
    return this.grading.requestCorrection(id, dto, await this.resolveActor(req));
  }

  @Post('corrections/:requestId/approve')
  async approveCorrection(
    @Param('requestId', ParseIntPipe) requestId: number,
    @Body() dto: DecideCorrectionDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicCollection> {
    const id = await this.grading.approveCorrection(requestId, dto, await this.resolveActor(req));
    return this.findOne(id);
  }

  @Post('corrections/:requestId/reject')
  async rejectCorrection(
    @Param('requestId', ParseIntPipe) requestId: number,
    @Body() dto: DecideCorrectionDto,
    @Req() req: AuthedRequest,
  ): Promise<PublicCollection> {
    const id = await this.grading.rejectCorrection(requestId, dto, await this.resolveActor(req));
    return this.findOne(id);
  }

  /** Officer resend of a failed owner notification. */
  @Post(':id/notification/resend')
  async resendNotification(
    @Param('id') id: string,
    @Req() req: AuthedRequest,
  ): Promise<PublicCollection> {
    const actor = await this.resolveActor(req);
    await this.grading.requireGradingEdit(actor);
    await this.ownerNotifications.assertDelivery(id);
    await this.ownerNotifications.resend(id, actor);
    return this.findOne(id);
  }

  /** Resolves the JWT's `sub` to the acting user's display name + role for stamping. */
  private async resolveActor(req: AuthedRequest): Promise<Actor> {
    const profile = await this.usersService.getProfile(Number(req.user.sub));
    return {
      name: profile?.name ?? 'Unknown',
      role: req.user.role,
      sub: Number(req.user.sub),
    };
  }
}
