import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogEntity } from '../audit/audit-log.entity';
import { AuditModule } from '../audit/audit.module';
import { CollectionRecordEntity } from '../collections/collection-record.entity';
import { FertilizerBatchEntity } from '../fertilizer/fertilizer-batch.entity';
import { FertilizerChargeEntity } from '../fertilizer/fertilizer-charge.entity';
import { FertilizerRequestEntity } from '../fertilizer/fertilizer-request.entity';
import { StockMovementEntity } from '../fertilizer/stock-movement.entity';
import { UsersModule } from '../users/users.module';
import { EstateAdvanceEntity } from './estate-advance.entity';
import { EstateDocumentEntity } from './estate-document.entity';
import { EstateOwnerEntity } from './estate-owner.entity';
import { EstateEntity } from './estate.entity';
import { EstateLifetimeService } from './estate-lifetime.service';
import { EstatesController } from './estates.controller';
import { EstatesService } from './estates.service';
import { RouteEntity } from './route.entity';
import { SettlementEntity } from './settlement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EstateEntity,
      EstateOwnerEntity,
      EstateDocumentEntity,
      EstateAdvanceEntity,
      SettlementEntity,
      RouteEntity,
      // Read-only lookups for the Estate Owner Lifetime History slice
      // (EST-03 amended + EST-10, EST-01 directory) — same cross-module
      // repository-binding pattern Fertilizer/Reports use. AuditModule only
      // exports AuditService, not its repository provider, so AuditLogEntity
      // is bound again here for @InjectRepository to work in this module.
      CollectionRecordEntity,
      FertilizerRequestEntity,
      FertilizerChargeEntity,
      StockMovementEntity,
      FertilizerBatchEntity,
      AuditLogEntity,
    ]),
    UsersModule,
    AuditModule,
  ],
  controllers: [EstatesController],
  providers: [EstatesService, EstateLifetimeService],
})
export class EstatesModule {}
