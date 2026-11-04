import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { DispatchModule } from '../dispatch/dispatch.module';
import { RouteScheduleOverrideEntity } from '../dispatch/route-schedule.entity';
import { EmployeeAttendanceEntity } from '../employees/employee-attendance.entity';
import { EmployeeEntity } from '../employees/employee.entity';
import { RouteEntity } from '../estates/route.entity';
import { FertilizerModule } from '../fertilizer/fertilizer.module';
import { UsersModule } from '../users/users.module';
import { EmployeeRestDayEntity } from './employee-rest-day.entity';
import { HolidayTypeEntity } from './holiday-type.entity';
import { HolidayEntity } from './holiday.entity';
import { HolidayService } from './holiday.service';
import { HolidaysController } from './holidays.controller';
import { WeeklyHolidayRuleEntity } from './weekly-holiday-rule.entity';

/** The holiday calendar (Attendance-Leave-Addendum) — read by attendance, leave and payroll. */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      HolidayEntity,
      HolidayTypeEntity,
      WeeklyHolidayRuleEntity,
      EmployeeRestDayEntity,
      EmployeeAttendanceEntity,
      EmployeeEntity,
      RouteEntity,
      RouteScheduleOverrideEntity,
    ]),
    DispatchModule,
    FertilizerModule,
    UsersModule,
    AuditModule,
  ],
  controllers: [HolidaysController],
  providers: [HolidayService],
  exports: [HolidayService],
})
export class HolidaysModule {}
