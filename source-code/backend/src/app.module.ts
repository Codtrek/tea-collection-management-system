import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModule } from './admin/admin.module';
import { AuditModule } from './audit/audit.module';
import { ThrottlerModule, seconds } from '@nestjs/throttler';
import { IdentityThrottlerGuard } from './auth/identity-throttler.guard';

import { AuthModule } from './auth/auth.module';
import { CollectionsModule } from './collections/collections.module';
import { DispatchModule } from './dispatch/dispatch.module';
import { EmployeesModule } from './employees/employees.module';
import { EstatesModule } from './estates/estates.module';
import { FertilizerModule } from './fertilizer/fertilizer.module';
import { ReportsModule } from './reports/reports.module';
import { UsersModule } from './users/users.module';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    ThrottlerModule.forRoot({
      throttlers: [
        {
          name : 'short',
          ttl : seconds(10),
          limit : 15,
        },
        {
          name : 'medium',
          ttl : seconds(60),
          limit : 120
        },
        {
          name : 'long',
          ttl : seconds(600),
          limit : 600
        },
        {
          name: 'auth',
          ttl: seconds(60),
          limit: 5,
          skipIf: (context) => {
            const req = context.switchToHttp().getRequest();
            const path = String(
            req.originalUrl ?? req.url ?? '',
          )
            .split('?')[0]
            .toLowerCase();

          return !/\/auth\/(?:mobile\/)?(?:login|register)\/?$/.test(
            path,
          );
          },
        }
      ],
      errorMessage : "Try again in shortly",
      storage: new ThrottlerStorageRedisService(
        process.env.REDIS_URL,
      ),
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.getOrThrow<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),

    UsersModule,
    AuthModule,
    CollectionsModule,
    DispatchModule,
    EstatesModule,
    EmployeesModule,
    FertilizerModule,
    ReportsModule,
    AuditModule,
    AdminModule,
  ],

  providers: [
    {
      provide: APP_GUARD,
      useClass: IdentityThrottlerGuard,
    },
  ],
})
export class AppModule {}