import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TeaCollectionRecordEntity } from '../collection-records/entities/tea-collection-record.entity';
import { TeaReceivingRecordEntity } from '../collection-records/entities/tea-receiving-record.entity';
import { EstateEntity } from '../routes/entities/estate.entity';
import { TeaEstateOwnerEntity } from '../routes/entities/tea-estate-owner.entity';
import { MonthlyPaymentEntity } from './entities/monthly-payment.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MonthlyPaymentEntity,
      TeaReceivingRecordEntity,
      TeaCollectionRecordEntity,
      EstateEntity,
      TeaEstateOwnerEntity,
    ]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
