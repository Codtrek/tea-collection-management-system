import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { CollectionRecordEntity } from '../collections/collection-record.entity';
import { PayrollRunEntity } from '../employees/payroll-run.entity';
import { CollectionsModule } from '../collections/collections.module';
import { EstateEntity } from '../estates/estate.entity';
import { SettlementEntity } from '../estates/settlement.entity';
import { FertilizerBatchEntity } from '../fertilizer/fertilizer-batch.entity';
import { StockMovementEntity } from '../fertilizer/stock-movement.entity';
import { UsersModule } from '../users/users.module';
import { ExpenseEntryEntity } from './expense-entry.entity';
import { ReportsController } from './reports.controller';
import { CollectionReportService } from './collection-report.service';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExpenseEntryEntity,
      // Read-only lookups for aggregation — Reports owns none of these
      // tables, it only reads what Collections/Estates/Employees already
      // write (same second-repository-binding pattern as Fertilizer's
      // read-only EstateEntity binding).
      CollectionRecordEntity,
      EstateEntity,
      SettlementEntity,
      PayrollRunEntity,
      // Write-offs — shown as "Stock lost", for information only.
      StockMovementEntity,
      FertilizerBatchEntity,
    ]),
    UsersModule,
    AuditModule,
    // CollectionSettingsService — the weight-mismatch tolerance RPT-01 flags against
    CollectionsModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService, CollectionReportService],
})
export class ReportsModule {}
