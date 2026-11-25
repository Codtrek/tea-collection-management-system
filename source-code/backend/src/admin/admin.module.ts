import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { FactoryEmployee } from '../users/factory-employee.entity';
import { User } from '../users/user.entity';
import { UsersModule } from '../users/users.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { GradeRateEntity } from './grade-rate.entity';
import { TransportRateEntity } from './transport-rate.entity';
import { RolePermissionEntity } from './role-permission.entity';
import { SystemSettingEntity } from './system-setting.entity';
import { TransportRatesService } from './transport-rates.service';
import { SettlementEntity } from '../estates/settlement.entity';
import { CollectionRecordEntity } from '../collections/collection-record.entity';
import { EstateEntity } from '../estates/estate.entity';
import { EmployeeEntity } from '../employees/employee.entity';
import { DispatchAccessService } from '../dispatch/dispatch-access.service';
import { SystemUsersService } from './system-users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GradeRateEntity,
      TransportRateEntity,
      RolePermissionEntity,
      SystemSettingEntity,
      // Read/write of the user's status + read of their profile name for the
      // ADM-02 System Users tab (same cross-module repository-binding pattern
      // Reports uses for its read-only lookups).
      User,
      FactoryEmployee,
      // Users & Roles: an HR employee is the source of a portal login (and its link)
      EmployeeEntity,
      // transport (Administration-Addendum §4): the first version's earliest month and the preview
      SettlementEntity,
      CollectionRecordEntity,
      EstateEntity,
    ]),
    UsersModule,
    AuditModule,
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    TransportRatesService,
    SystemUsersService,
    // the matrix-driven read gate (administration:view), same check every module uses
    DispatchAccessService,
  ],
})
export class AdminModule {}
