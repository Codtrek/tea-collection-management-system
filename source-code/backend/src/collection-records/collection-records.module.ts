import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PickupRequestEntity } from '../pickup-requests/entities/pickup-request.entity';
import { CollectorEntity } from '../routes/entities/collector.entity';
import { EstateEntity } from '../routes/entities/estate.entity';
import { FactoryEmployeeEntity } from '../routes/entities/factory-employee.entity';
import { CollectionRecordsController } from './collection-records.controller';
import { CollectionRecordsService } from './collection-records.service';
import { ComplaintEntity } from './entities/complaint.entity';
import { ReceivingOfficerEntity } from './entities/receiving-officer.entity';
import { TeaCollectionRecordEntity } from './entities/tea-collection-record.entity';
import { TeaReceivingRecordEntity } from './entities/tea-receiving-record.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TeaCollectionRecordEntity,
      TeaReceivingRecordEntity,
      ComplaintEntity,
      ReceivingOfficerEntity,
      PickupRequestEntity,
      EstateEntity,
      FactoryEmployeeEntity,
      CollectorEntity,
    ]),
  ],
  controllers: [CollectionRecordsController],
  providers: [CollectionRecordsService],
})
export class CollectionRecordsModule {}
