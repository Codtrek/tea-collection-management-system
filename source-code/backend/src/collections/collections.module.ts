import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';
import { DispatchModule } from '../dispatch/dispatch.module';
import { SystemSettingEntity } from '../admin/system-setting.entity';
import { EstateOwnerEntity } from '../estates/estate-owner.entity';
import { EstateEntity } from '../estates/estate.entity';
import { SettlementEntity } from '../estates/settlement.entity';
import { CollectionRecordEntity } from './collection-record.entity';
import { ComplaintEntity } from './complaint.entity';
import { DeliveryGradeLineEntity } from './delivery-grade-line.entity';
import { CollectionsController } from './collections.controller';
import { CollectionsService } from './collections.service';
import { CollectionSettingsService } from './collection-settings.service';
import { DeliveryGradeRevisionEntity } from './delivery-grade-revision.entity';
import { GradeCorrectionRequestEntity } from './grade-correction-request.entity';
import { GradingNotificationEntity } from './grading-notification.entity';
import { GradingNotificationService } from './grading-notification.service';
import { GradingNotificationTasks } from './grading-notification.tasks';
import { GradingService } from './grading.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CollectionRecordEntity,
      DeliveryGradeLineEntity,
      EstateEntity,
      ComplaintEntity,
      DeliveryGradeRevisionEntity,
      GradeCorrectionRequestEntity,
      GradingNotificationEntity,
      SettlementEntity,
      EstateOwnerEntity,
      SystemSettingEntity,
    ]),
    DispatchModule,
    UsersModule,
    AuditModule,
  ],
  controllers: [CollectionsController],
  providers: [
    CollectionsService,
    CollectionSettingsService,
    GradingService,
    GradingNotificationService,
    GradingNotificationTasks,
  ],
  exports: [CollectionSettingsService],
})
export class CollectionsModule {}
