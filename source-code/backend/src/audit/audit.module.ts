import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogEntity } from './audit-log.entity';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

/**
 * Cross-cutting: exports `AuditService` so every write module (Collections,
 * Estates, Employees, Fertilizer, Reports, Admin) can record a trail entry
 * after a successful mutation. Imported by each of those modules.
 */
@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntity])],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
