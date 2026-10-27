import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HealthModule } from './health/health.module';
import { MaintenancesModule } from './maintenances/maintenances.module';
import { MechanicsModule } from './mechanics/mechanics.module';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { WorkshopsModule } from './workshops/workshops.module';

@Module({
  imports: [
    // "isGlobal" evita tener que importar ConfigModule en cada módulo.
    ConfigModule.forRoot({ isGlobal: true }),

    // Conexión a PostgreSQL. Usamos forRootAsync porque necesitamos esperar
    // a que ConfigService haya leído el .env antes de armar la configuración.
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: Number(config.get<string>('DB_PORT')),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        // Amazon RDS con PostgreSQL 15 o superior EXIGE conexión cifrada (SSL).
        // Por eso en AWS usamos DB_SSL=true y en local DB_SSL=false.
        ssl:
          config.get<string>('DB_SSL') === 'true'
            ? { rejectUnauthorized: false }
            : false,
        // Registra automáticamente las entidades que se declaren con forFeature.
        autoLoadEntities: true,
        // Crea y actualiza las tablas según las entidades
        synchronize: true,
      }),
    }),

    HealthModule,
    AuthModule,
    UsersModule,
    VehiclesModule,
    MechanicsModule,
    WorkshopsModule,
    MaintenancesModule,
  ],
  providers: [
    // Filtro global: todos los errores salen con el mismo formato.
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // Interceptor global: todas las respuestas exitosas salen con el mismo formato.
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule {}
