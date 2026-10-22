import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FactoryEmployee } from './factory-employee.entity';
import { Factory } from './factory.entity';
import { Estate } from './estate.entity';
import { EstateOwner } from './estate-owner.entity';
import { EstateManager } from './estate-manager.entity';
import { EstateEmployee } from './estate-employee.entity';
import { User } from './user.entity';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      FactoryEmployee,
      Factory,
      EstateOwner,
      EstateManager,
      EstateEmployee,
      Estate,
    ]),
  ],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
