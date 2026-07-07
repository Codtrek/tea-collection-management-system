import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CollectionRecordsModule } from './collection-records/collection-records.module';
import { PaymentsModule } from './payments/payments.module';
import { PickupRequestsModule } from './pickup-requests/pickup-requests.module';
import { RoutesModule } from './routes/routes.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.getOrThrow<string>('DATABASE_URL'),
        autoLoadEntities: true,
        // Schema is owned by source-code/database/init.sql, not TypeORM migrations.
        synchronize: false,
      }),
    }),
    UsersModule,
    AuthModule,
    RoutesModule,
    PickupRequestsModule,
    CollectionRecordsModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
