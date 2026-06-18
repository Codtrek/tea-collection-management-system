import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PickupService } from './pickup.service';
import { CreatePickupDto } from './dto/create-pickup.dto';
import { UpdatePickupDto } from './dto/update-pickup.dto';

@Controller('pickup')
export class PickupController {
  constructor(private readonly pickupService: PickupService) {}

  @Post()
  create(@Body() createPickupDto: CreatePickupDto) {
    return this.pickupService.create(createPickupDto);
  }

  @Get()
  findAll() {
    return this.pickupService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pickupService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePickupDto: UpdatePickupDto) {
    return this.pickupService.update(+id, updatePickupDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.pickupService.remove(+id);
  }
}
