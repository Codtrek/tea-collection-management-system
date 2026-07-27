import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollectionRecordEntity } from '../collections/collection-record.entity';
import { PayrollRunEntity } from '../employees/payroll-run.entity';
import { SettlementEntity } from '../estates/settlement.entity';
import { UsersModule } from '../users/users.module';
import { ExpenseEntryEntity } from './expense-entry.entity';
import { ReportsController } from './reports.controller';
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
      SettlementEntity,
      PayrollRunEntity,
    ]),
    UsersModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
