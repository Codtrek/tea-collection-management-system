import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { CreateRouteDto } from './dto/create-route.dto';
import { ReasonDto } from './dto/reason.dto';
import { RoutesService } from './routes.service';

const FACTORY_ROLES = [
  'factory_admin',
  'factory_officer',
  'factory_manager',
] as const;

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('routes')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Roles(...FACTORY_ROLES)
  @Post()
  create(@Body() dto: CreateRouteDto) {
    return this.routesService.create(dto);
  }

  @Get()
  list(
    @Query('date') date: string,
    @Query('collectorId') collectorId?: string,
  ) {
    if (collectorId) {
      return this.routesService.findByCollector(Number(collectorId), date);
    }
    return this.routesService.findByDate(date);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.routesService.findById(id);
  }

  @Roles('collector')
  @Post(':id/start')
  async start(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: JwtPayload },
  ) {
    const collectorId = await this.routesService.resolveCollectorIdForUser(
      req.user.sub,
    );
    if (collectorId === null) {
      return {
        ok: false,
        error: 'No collector profile found for this account',
      };
    }
    return this.routesService.start(id, collectorId);
  }

  @Roles(...FACTORY_ROLES)
  @Post(':id/delay')
  delay(@Param('id', ParseIntPipe) id: number, @Body() dto: ReasonDto) {
    return this.routesService.delay(id, dto.reason);
  }

  @Roles(...FACTORY_ROLES)
  @Post(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number, @Body() dto: ReasonDto) {
    return this.routesService.cancel(id, dto.reason);
  }

  @Roles(...FACTORY_ROLES)
  @Post(':id/complete')
  complete(@Param('id', ParseIntPipe) id: number) {
    return this.routesService.complete(id);
  }
}
