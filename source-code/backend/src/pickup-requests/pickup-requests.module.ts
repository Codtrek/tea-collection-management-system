import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RouteStopEntity } from '../routes/entities/route-stop.entity';
import { RouteEntity } from '../routes/entities/route.entity';
import { TeaEstateOwnerEntity } from '../routes/entities/tea-estate-owner.entity';
import { PickupRequestEntity } from './entities/pickup-request.entity';
import { PickupRequestsController } from './pickup-requests.controller';
import { PickupRequestsService } from './pickup-requests.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PickupRequestEntity,
      RouteStopEntity,
      RouteEntity,
      TeaEstateOwnerEntity,
    ]),
  ],
  controllers: [PickupRequestsController],
  providers: [PickupRequestsService],
})
export class PickupRequestsModule {}
