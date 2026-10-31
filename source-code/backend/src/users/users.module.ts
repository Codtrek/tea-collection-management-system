import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FactoryEmployee } from './factory-employee.entity';
import { Factory } from './factory.entity';
import { EstateManager } from './estate-manager.entity';
import { EstateEmployee } from './estate-employee.entity';
import { User } from './user.entity';
import { UsersService } from './users.service';
import { EstateEntity } from '../estates/estate.entity';
import { EstateOwnerEntity } from '../estates/estate-owner.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      FactoryEmployee,
      Factory,
      EstateOwnerEntity,
      EstateManager,
      EstateEmployee,
      EstateEntity,
    ]),
  ],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
