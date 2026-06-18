import { Injectable } from '@nestjs/common';
import { CreatePickupDto } from './dto/create-pickup.dto';
import { UpdatePickupDto } from './dto/update-pickup.dto';

@Injectable()
export class PickupService {
  create(createPickupDto: CreatePickupDto) {
    return 'This action adds a new pickup';
  }

  findAll() {
    return `This action returns all pickup`;
  }

  findOne(id: number) {
    return `This action returns a #${id} pickup`;
  }

  update(id: number, updatePickupDto: UpdatePickupDto) {
    return `This action updates a #${id} pickup`;
  }

  remove(id: number) {
    return `This action removes a #${id} pickup`;
  }
}
