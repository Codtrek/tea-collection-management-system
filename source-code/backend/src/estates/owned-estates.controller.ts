import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Req } from '@nestjs/common';
import { OwnerEmployeesService } from './owner-employees.service';
import type { Request } from 'express';
import { ExtractJwt } from 'passport-jwt';
import { AuthService } from '../auth/auth.service';
import { RegisterOwnedEstateDto } from './dto/register-owned-estate.dto';
import { EstatesService } from './estates.service';

@Controller('mobile/estates')
export class OwnedEstatesController {
  constructor(private readonly auth: AuthService, private readonly estates: EstatesService, private readonly employees: OwnerEmployeesService) {}

  private ownerId(req: Request) {
    return this.auth.requireEstateOwner(ExtractJwt.fromAuthHeaderAsBearerToken()(req));
  }

  @Get('employees')
  async directory(@Req() req: Request) {
    return this.employees.directory(await this.ownerId(req));
  }

  @Put(':estateId/managers/:employeeId')
  async assign(@Req() req: Request, @Param('estateId', ParseIntPipe) estateId: number, @Param('employeeId', ParseIntPipe) employeeId: number) {
    return this.employees.changeAssignment(await this.ownerId(req), employeeId, estateId, true);
  }

  @Delete(':estateId/managers/:employeeId')
  async resign(@Req() req: Request, @Param('estateId', ParseIntPipe) estateId: number, @Param('employeeId', ParseIntPipe) employeeId: number) {
    return this.employees.changeAssignment(await this.ownerId(req), employeeId, estateId, false);
  }

  @Post()
  async register(@Req() req: Request, @Body() dto: RegisterOwnedEstateDto) {
    const ownerId = await this.ownerId(req);
    return this.estates.registerForOwner(ownerId, dto);
  }
}
