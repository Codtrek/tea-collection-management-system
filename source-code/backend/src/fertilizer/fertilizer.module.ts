import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemSettingEntity } from '../admin/system-setting.entity';
import { AuditModule } from '../audit/audit.module';
import { AgentDayStatusEntity } from '../dispatch/agent-day-status.entity';
import { DevicePushTokenEntity } from '../dispatch/device-push-token.entity';
import { DispatchModule } from '../dispatch/dispatch.module';
import { EstateOwnerEntity } from '../estates/estate-owner.entity';
import { EstateEntity } from '../estates/estate.entity';
import { RouteEntity } from '../estates/route.entity';
import { UsersModule } from '../users/users.module';
import { FertilizerAgentController } from './fertilizer-agent.controller';
import { FertilizerAllocationEntity } from './fertilizer-allocation.entity';
import { FertilizerBatchEntity } from './fertilizer-batch.entity';
import { FertilizerChargeEntity } from './fertilizer-charge.entity';
import { FertilizerDeliveryEntity } from './fertilizer-delivery.entity';
import { FertilizerDeliveryService } from './fertilizer-delivery.service';
import { FertilizerItemPriceEntity } from './fertilizer-item-price.entity';
import { FertilizerNotificationEntity } from './fertilizer-notification.entity';
import { FertilizerNotificationService } from './fertilizer-notification.service';
import { FertilizerNotificationTasks } from './fertilizer-notification.tasks';
import { FertilizerPaymentEntity } from './fertilizer-payment.entity';
import { FertilizerRequestEventEntity } from './fertilizer-request-event.entity';
import { FertilizerRequestEntity } from './fertilizer-request.entity';
import { FertilizerRequestService } from './fertilizer-request.service';
import { FertilizerSettingsService } from './fertilizer-settings.service';
import { FertilizerStockLedger } from './fertilizer-stock-ledger.service';
import { FertilizerViewService } from './fertilizer-view.service';
import { FertilizerController } from './fertilizer.controller';
import { FertilizerService } from './fertilizer.service';
import { StockMovementEntity } from './stock-movement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FertilizerBatchEntity,
      StockMovementEntity,
      FertilizerRequestEntity,
      FertilizerChargeEntity,
      FertilizerAllocationEntity,
      FertilizerDeliveryEntity,
      FertilizerRequestEventEntity,
      FertilizerItemPriceEntity,
      FertilizerPaymentEntity,
      FertilizerNotificationEntity,
      // Read-only lookups bound a second time here (same pattern as before): estate name /
      // route / owner, the agent's shift, push tokens ("Stored, not delivered"), settings.
      EstateEntity,
      EstateOwnerEntity,
      RouteEntity,
      AgentDayStatusEntity,
      DevicePushTokenEntity,
      SystemSettingEntity,
    ]),
    UsersModule,
    AuditModule,
    // route schedule, route → agent resolver, agent identity, permission checks, owner notifier
    DispatchModule,
  ],
  controllers: [FertilizerController, FertilizerAgentController],
  providers: [
    FertilizerService,
    FertilizerStockLedger,
    FertilizerSettingsService,
    FertilizerViewService,
    FertilizerRequestService,
    FertilizerDeliveryService,
    FertilizerNotificationService,
    FertilizerNotificationTasks,
  ],
})
export class FertilizerModule {}
