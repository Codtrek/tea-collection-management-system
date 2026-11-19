import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CollectionsModule } from '../collections/collections.module';
import { DispatchModule } from '../dispatch/dispatch.module';
import { EmployeesModule } from '../employees/employees.module';
import { EstatesModule } from '../estates/estates.module';
import { FertilizerModule } from '../fertilizer/fertilizer.module';
import { HolidaysModule } from '../holidays/holidays.module';
import { ReportsModule } from '../reports/reports.module';
import { UsersModule } from '../users/users.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

/**
 * Dashboard-Addendum: owns no table and no calculation. It reads the services the linked pages
 * use (each module exports them for this), so a dashboard count always equals its list.
 */
@Module({
  imports: [
    AuditModule,
    CollectionsModule,
    DispatchModule,
    EmployeesModule,
    EstatesModule,
    FertilizerModule,
    HolidaysModule,
    ReportsModule,
    UsersModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
