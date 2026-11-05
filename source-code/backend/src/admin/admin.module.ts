import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { FactoryEmployee } from '../users/factory-employee.entity';
import { User } from '../users/user.entity';
import { UsersModule } from '../users/users.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { GradeRateEntity } from './grade-rate.entity';
import { RolePermissionEntity } from './role-permission.entity';
import { SystemSettingEntity } from './system-setting.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GradeRateEntity,
      RolePermissionEntity,
      SystemSettingEntity,
      // Read/write of the user's status + read of their profile name for the
      // ADM-02 System Users tab (same cross-module repository-binding pattern
      // Reports uses for its read-only lookups).
      User,
      FactoryEmployee,
    ]),
    UsersModule,
    AuditModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
