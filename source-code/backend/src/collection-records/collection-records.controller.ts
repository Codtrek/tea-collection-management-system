import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { CollectionRecordsService } from './collection-records.service';
import { CreateCollectionRecordDto } from './dto/create-collection-record.dto';
import { ReceiveCollectionDto } from './dto/receive-collection.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('collection-records')
export class CollectionRecordsController {
  constructor(
    private readonly collectionRecordsService: CollectionRecordsService,
  ) {}

  @Roles('collector')
  @Post()
  async create(
    @Body() dto: CreateCollectionRecordDto,
    @Req() req: { user: JwtPayload },
  ) {
    const collectorId =
      await this.collectionRecordsService.resolveCollectorIdForUser(
        req.user.sub,
      );
    if (collectorId === null) {
      return {
        ok: false,
        error: 'No collector profile found for this account',
      };
    }
    return this.collectionRecordsService.create(dto, collectorId);
  }

  @Roles('collector')
  @Post(':id/confirm-owner')
  confirmOwner(@Param('id', ParseIntPipe) id: number) {
    return this.collectionRecordsService.confirmOwner(id);
  }

  @Roles('collector')
  @Get('mine')
  async listMine(@Req() req: { user: JwtPayload }) {
    const collectorId =
      await this.collectionRecordsService.resolveCollectorIdForUser(
        req.user.sub,
      );
    if (collectorId === null) return [];
    return this.collectionRecordsService.listForCollector(collectorId);
  }

  @Roles('receiving_officer')
  @Get('pending')
  listPending() {
    return this.collectionRecordsService.listPendingReceiving();
  }

  @Roles('receiving_officer')
  @Post(':id/receive')
  async receive(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReceiveCollectionDto,
    @Req() req: { user: JwtPayload },
  ) {
    const officer =
      await this.collectionRecordsService.resolveReceivingOfficerForUser(
        req.user.sub,
      );
    if (officer === null) {
      return {
        ok: false,
        error: 'No receiving officer profile found for this account',
      };
    }
    return this.collectionRecordsService.receive(id, dto, {
      ...officer,
      raisedByUserId: req.user.sub,
    });
  }
}
