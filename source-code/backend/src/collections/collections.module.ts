import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';
import { DispatchModule } from '../dispatch/dispatch.module';
import { EstateEntity } from '../estates/estate.entity';
import { CollectionRecordEntity } from './collection-record.entity';
import { ComplaintEntity } from './complaint.entity';
import { DeliveryGradeLineEntity } from './delivery-grade-line.entity';
import { CollectionsController } from './collections.controller';
import { CollectionsService } from './collections.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CollectionRecordEntity,
      DeliveryGradeLineEntity,
      EstateEntity,
      ComplaintEntity,
    ]),
    DispatchModule,
    UsersModule,
    AuditModule,
  ],
  controllers: [CollectionsController],
  providers: [CollectionsService],
})
export class CollectionsModule {}
