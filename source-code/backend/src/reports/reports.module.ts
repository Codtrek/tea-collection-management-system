import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { CollectionRecordEntity } from '../collections/collection-record.entity';
import { EmployeeAttendanceEntity } from '../employees/employee-attendance.entity';
import { EmployeeEntity } from '../employees/employee.entity';
import { PayrollRunEntity } from '../employees/payroll-run.entity';
import { SalaryAdvanceEntity } from '../employees/salary-advance.entity';
import { EstateAdvanceRecoveryEntity } from '../estates/estate-advance-recovery.entity';
import { EstateAdvanceEntity } from '../estates/estate-advance.entity';
import { GradeRateEntity } from '../admin/grade-rate.entity';
import { SystemSettingEntity } from '../admin/system-setting.entity';
import { DispatchModule } from '../dispatch/dispatch.module';
import { CollectionsModule } from '../collections/collections.module';
import { EstateEntity } from '../estates/estate.entity';
import { SettlementEntity } from '../estates/settlement.entity';
import { FertilizerBatchEntity } from '../fertilizer/fertilizer-batch.entity';
import { StockMovementEntity } from '../fertilizer/stock-movement.entity';
import { UsersModule } from '../users/users.module';
import { ExpenseCategoryEntity } from './expense-category.entity';
import { ExpenseEntryEntity } from './expense-entry.entity';
import { ExpenseReceiptEntity } from './expense-receipt.entity';
import { ReportsController } from './reports.controller';
import { CollectionReportService } from './collection-report.service';
import { FinanceService } from './finance.service';
import { LeafPurchaseService } from './leaf-purchase.service';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExpenseEntryEntity,
      ExpenseCategoryEntity,
      ExpenseReceiptEntity,
      // the expense edit window (system_settings.expenses)
      SystemSettingEntity,
      // Read-only lookups for aggregation — Reports owns none of these
      // tables, it only reads what Collections/Estates/Employees already
      // write (same second-repository-binding pattern as Fertilizer's
      // read-only EstateEntity binding).
      CollectionRecordEntity,
      EstateEntity,
      SettlementEntity,
      PayrollRunEntity,
      // Leaf Purchase Report — rate versions (written by ADM-01)
      GradeRateEntity,
      // Expense report (FinanceService): stock purchases + write-offs, wages, advances
      StockMovementEntity,
      FertilizerBatchEntity,
      EmployeeEntity,
      EmployeeAttendanceEntity,
      SalaryAdvanceEntity,
      EstateAdvanceEntity,
      EstateAdvanceRecoveryEntity,
    ]),
    UsersModule,
    AuditModule,
    // CollectionSettingsService — the weight-mismatch tolerance RPT-01 flags against
    CollectionsModule,
    // DispatchAccessService — the data-driven `expenses` / `administration` permission checks
    DispatchModule,
  ],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    CollectionReportService,
    FinanceService,
    LeafPurchaseService,
  ],
})
export class ReportsModule {}
