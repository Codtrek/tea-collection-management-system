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
import { Route } from '../routes/route.entity';

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
      // Mapped only so Estate can declare its `route_id` foreign key.
      Route,
    ]),
  ],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
