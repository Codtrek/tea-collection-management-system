import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollectionRecordEntity } from '../collections/collection-record.entity';
import { CollectionsModule } from '../collections/collections.module';
import { CollectionAgentEntity } from '../dispatch/collection-agent.entity';
import { DispatchModule } from '../dispatch/dispatch.module';
import { RouteAssignmentEntity } from '../dispatch/route-assignment.entity';
import { EmployeeAttendanceEntity } from '../employees/employee-attendance.entity';
import { EmployeeEntity } from '../employees/employee.entity';
import { RouteEntity } from '../estates/route.entity';
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
    ]),
    DispatchModule,
    HolidaysModule,
    CollectionsModule,
  ],
  controllers: [PerformanceController],
  providers: [PerformanceService],
  exports: [PerformanceService],
})
export class PerformanceModule {}
