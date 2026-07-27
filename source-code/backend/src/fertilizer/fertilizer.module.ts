import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstateEntity } from '../estates/estate.entity';
import { UsersModule } from '../users/users.module';
import { FertilizerBatchEntity } from './fertilizer-batch.entity';
import { FertilizerRequestEntity } from './fertilizer-request.entity';
import { FertilizerController } from './fertilizer.controller';
import { FertilizerService } from './fertilizer.service';
import { StockMovementEntity } from './stock-movement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FertilizerBatchEntity,
      StockMovementEntity,
      FertilizerRequestEntity,
      // Read-only lookup for estate name + owner id when logging/deciding a
      // request — same entity Estates registers, just a second repository
      // binding onto the same table.
      EstateEntity,
    ]),
    UsersModule,
  ],
  controllers: [FertilizerController],
  providers: [FertilizerService],
})
export class FertilizerModule {}
