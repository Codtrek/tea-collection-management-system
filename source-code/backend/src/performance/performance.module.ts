import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollectionRecordEntity } from '../collections/collection-record.entity';
import { CollectionsModule } from '../collections/collections.module';
import { CollectionAgentEntity } from '../dispatch/collection-agent.entity';
import { DispatchModule } from '../dispatch/dispatch.module';
import { RouteAssignmentEntity } from '../dispatch/route-assignment.entity';
import { EmployeeAttendanceEntity } from '../employees/employee-attendance.entity';
import { EmployeeEntity } from '../employees/employee.entity';
import { EstateEntity } from '../estates/estate.entity';
import { RouteEntity } from '../estates/route.entity';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';
import { PerformanceNoteEntity } from './performance-note.entity';
import { FertilizerDeliveryEntity } from '../fertilizer/fertilizer-delivery.entity';
import { HolidaysModule } from '../holidays/holidays.module';
import { PerformanceController } from './performance.controller';
import { PerformanceService } from './performance.service';

/** Performance (Performance-Addendum): one service computes every measure from real records. */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmployeeEntity,
      CollectionAgentEntity,
      EmployeeAttendanceEntity,
      CollectionRecordEntity,
      FertilizerDeliveryEntity,
      RouteAssignmentEntity,
      RouteEntity,
      EstateEntity,
      PerformanceNoteEntity,
    ]),
    DispatchModule,
    HolidaysModule,
    CollectionsModule,
    AuditModule,
    UsersModule,
  ],
  controllers: [PerformanceController],
  providers: [PerformanceService],
  exports: [PerformanceService],
})
export class PerformanceModule {}
