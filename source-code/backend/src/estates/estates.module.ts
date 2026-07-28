import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';
import { EstateAdvanceEntity } from './estate-advance.entity';
import { EstateDocumentEntity } from './estate-document.entity';
import { EstateOwnerEntity } from './estate-owner.entity';
import { EstateEntity } from './estate.entity';
import { EstatesController } from './estates.controller';
import { EstatesService } from './estates.service';
import { RouteEntity } from './route.entity';
import { SettlementEntity } from './settlement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EstateEntity,
      EstateOwnerEntity,
      EstateDocumentEntity,
      EstateAdvanceEntity,
      SettlementEntity,
      RouteEntity,
    ]),
    UsersModule,
    AuditModule,
  ],
  controllers: [EstatesController],
  providers: [EstatesService],
})
export class EstatesModule {}
