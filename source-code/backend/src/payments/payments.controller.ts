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
import { GeneratePaymentDto } from './dto/generate-payment.dto';
import { PaymentsService } from './payments.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Roles('factory_admin')
  @Post()
  create(@Body() dto: GeneratePaymentDto) {
    return this.paymentsService.generateForMonth(dto);
  }

  @Roles('factory_admin')
  @Post(':id/finalize')
  finalize(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.finalize(id);
  }

  @Roles('factory_admin')
  @Get()
  listAll() {
    return this.paymentsService.listAll();
  }

  @Roles('estate_owner')
  @Get('mine')
  async listMine(@Req() req: { user: JwtPayload }) {
    const ownerId = await this.paymentsService.resolveOwnerIdForUser(
      req.user.sub,
    );
    if (ownerId === null) return [];
    return this.paymentsService.listForOwner(ownerId);
  }
}
