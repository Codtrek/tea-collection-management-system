import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolePermissionEntity } from '../admin/role-permission.entity';
import { SystemSettingEntity } from '../admin/system-setting.entity';
import { AuditModule } from '../audit/audit.module';
import { CollectionRecordEntity } from '../collections/collection-record.entity';
import { DeliveryGradeLineEntity } from '../collections/delivery-grade-line.entity';
import { EmployeeEntity } from '../employees/employee.entity';
import { EstateEntity } from '../estates/estate.entity';
import { RouteEntity } from '../estates/route.entity';
import { FactoryEmployee } from '../users/factory-employee.entity';
import { Factory } from '../users/factory.entity';
import { User } from '../users/user.entity';
import { UsersModule } from '../users/users.module';
import { AgentDayStatusEntity } from './agent-day-status.entity';
import { AgentDirectoryService } from './agent-directory.service';
import { AgentHistoryService } from './agent-history.service';
import { AgentProvisioningService } from './agent-provisioning.service';
import { AgentLocationPingEntity } from './agent-location-ping.entity';
import { AgentSelfService } from './agent-self.service';
import { CandidateRankingService } from './candidate-ranking.service';
import { CollectionAgentEntity } from './collection-agent.entity';
import { DevicePushTokenEntity } from './device-push-token.entity';
import { DispatchAccessService } from './dispatch-access.service';
import { DispatchAgentController } from './dispatch-agent.controller';
import { DispatchNotifier } from './dispatch-notifier.service';
import { DispatchSettingsService } from './dispatch-settings.service';
import { DispatchController } from './dispatch.controller';
import { DispatchService } from './dispatch.service';
import { DispatchTasks } from './dispatch.tasks';
import { NotificationEntity } from './notification.entity';
import { PositionCacheService } from './position-cache.service';
import { RouteAssignmentEntity } from './route-assignment.entity';
import { RouteLoadService } from './route-load.service';
import { RouteNeighbourEntity } from './route-neighbour.entity';
import { RouteResolverService } from './route-resolver.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      RouteAssignmentEntity,
      RouteNeighbourEntity,
      AgentDayStatusEntity,
      AgentLocationPingEntity,
      DevicePushTokenEntity,
      NotificationEntity,
      CollectionAgentEntity,
      FactoryEmployee,
      Factory,
      User,
      EmployeeEntity,
      RouteEntity,
      EstateEntity,
      CollectionRecordEntity,
      DeliveryGradeLineEntity,
      RolePermissionEntity,
      SystemSettingEntity,
    ]),
    UsersModule,
    AuditModule,
  ],
  controllers: [DispatchController, DispatchAgentController],
  providers: [
    RouteResolverService,
    RouteLoadService,
    CandidateRankingService,
    AgentDirectoryService,
    AgentHistoryService,
    AgentProvisioningService,
    DispatchNotifier,
    DispatchAccessService,
    DispatchSettingsService,
    PositionCacheService,
    DispatchService,
    AgentSelfService,
    DispatchTasks,
  ],
  exports: [
    RouteResolverService,
    AgentDirectoryService,
    AgentHistoryService,
    AgentProvisioningService,
    DispatchAccessService,
    DispatchNotifier,
    RouteLoadService,
  ],
})
export class DispatchModule {}
