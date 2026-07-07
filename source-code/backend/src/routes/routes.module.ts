import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CollectorEntity } from './entities/collector.entity';
import { EstateEntity } from './entities/estate.entity';
import { FactoryEmployeeEntity } from './entities/factory-employee.entity';
import { NotificationEntity } from './entities/notification.entity';
import { RouteStopEntity } from './entities/route-stop.entity';
import { RouteEntity } from './entities/route.entity';
import { TeaEstateOwnerEntity } from './entities/tea-estate-owner.entity';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RouteEntity,
      RouteStopEntity,
      NotificationEntity,
      EstateEntity,
      TeaEstateOwnerEntity,
      FactoryEmployeeEntity,
      CollectorEntity,
    ]),
  ],
  controllers: [RoutesController],
  providers: [RoutesService],
})
export class RoutesModule {}
