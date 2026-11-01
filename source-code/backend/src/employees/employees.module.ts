import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { DispatchModule } from '../dispatch/dispatch.module';
import { FertilizerModule } from '../fertilizer/fertilizer.module';
import { UsersModule } from '../users/users.module';
import { EmployeeAttendanceEntity } from './employee-attendance.entity';
import { EmployeeEntity } from './employee.entity';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { PayrollRunEntity } from './payroll-run.entity';
import { SalaryAdvanceEntity } from './salary-advance.entity';
import { RouteEntity } from '../estates/route.entity';
import { AdvanceViewService } from './advance-view.service';
import { EmployeeRoutesService } from './employee-routes.service';
import { PayrollViewService } from './payroll-view.service';
import { AdvanceRecoveryEntity } from './advance-recovery.entity';
import { PayrollSettingsService } from './payroll-settings.service';
import { SystemSettingEntity } from '../admin/system-setting.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmployeeEntity,
      EmployeeAttendanceEntity,
      SalaryAdvanceEntity,
      PayrollRunEntity,
      RouteEntity,
      AdvanceRecoveryEntity,
      SystemSettingEntity,
    ]),
    UsersModule,
    AuditModule,
    // agent provisioning (registering a Tea Collecting Agent) + their collection history
    DispatchModule,
    // an agent's fertilizer delivery history
    FertilizerModule,
  ],
  controllers: [EmployeesController],
  providers: [
    EmployeesService,
    AdvanceViewService,
    EmployeeRoutesService,
    PayrollViewService,
    PayrollSettingsService,
  ],
})
export class EmployeesModule {}
