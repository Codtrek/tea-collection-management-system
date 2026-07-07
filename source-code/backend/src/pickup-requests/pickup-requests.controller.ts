import {
  Body,
  Controller,
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
import { CreatePickupRequestDto } from './dto/create-pickup-request.dto';
import { ReasonDto } from './dto/reason.dto';
import { PickupRequestsService } from './pickup-requests.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pickup-requests')
export class PickupRequestsController {
  constructor(private readonly pickupRequestsService: PickupRequestsService) {}

  @Roles('estate_owner')
  @Post()
  async create(
    @Body() dto: CreatePickupRequestDto,
    @Req() req: { user: JwtPayload },
  ) {
    const ownerId = await this.pickupRequestsService.resolveOwnerIdForUser(
      req.user.sub,
    );
    if (ownerId === null) {
      return {
        ok: false,
        error: 'No estate owner profile found for this account',
      };
    }
    return this.pickupRequestsService.create(dto, ownerId);
  }

  @Roles('collector')
  @Post(':id/accept')
  accept(@Param('id', ParseIntPipe) id: number) {
    return this.pickupRequestsService.accept(id);
  }

  @Roles('collector')
  @Post(':id/decline')
  decline(@Param('id', ParseIntPipe) id: number, @Body() dto: ReasonDto) {
    return this.pickupRequestsService.decline(id, dto.reason);
  }

  @Roles('collector')
  @Post(':id/on-the-way')
  markOnTheWay(@Param('id', ParseIntPipe) id: number) {
    return this.pickupRequestsService.markOnTheWay(id);
  }

  @Roles('collector')
  @Post(':id/picked-up')
  markPickedUp(@Param('id', ParseIntPipe) id: number) {
    return this.pickupRequestsService.markPickedUp(id);
  }

  @Roles('estate_owner')
  @Post(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.pickupRequestsService.cancel(id);
  }
}
