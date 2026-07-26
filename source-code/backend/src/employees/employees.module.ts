import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { EmployeeAttendanceEntity } from './employee-attendance.entity';
import { EmployeeEntity } from './employee.entity';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { PayrollRunEntity } from './payroll-run.entity';
import { SalaryAdvanceEntity } from './salary-advance.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmployeeEntity,
      EmployeeAttendanceEntity,
      SalaryAdvanceEntity,
      PayrollRunEntity,
    ]),
    UsersModule,
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService],
})
export class EmployeesModule {}
