// Module: decorador que define un módulo de Nest (agrupa controladores, servicios y dependencias).
import { Module } from '@nestjs/common';
// ConfigModule carga el archivo .env; ConfigService permite leer sus variables.
import { ConfigModule, ConfigService } from '@nestjs/config';
// APP_FILTER y APP_INTERCEPTOR registran un filtro e interceptor de forma global.
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
// TypeOrmModule conecta la aplicación con PostgreSQL a través de TypeORM.
import { TypeOrmModule } from '@nestjs/typeorm';
// Módulos de la aplicación (cada uno maneja una parte del sistema).
import { AuthModule } from './auth/auth.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HealthModule } from './health/health.module';
import { MaintenancesModule } from './maintenances/maintenances.module';
import { MechanicsModule } from './mechanics/mechanics.module';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { WorkshopsModule } from './workshops/workshops.module';

// Módulo raíz: une todas las piezas de la aplicación.
@Module({
  imports: [
    // "isGlobal" evita tener que importar ConfigModule en cada módulo.
    ConfigModule.forRoot({ isGlobal: true }),

    // Conexión a PostgreSQL. Usamos forRootAsync porque necesitamos esperar
    // a que ConfigService haya leído el .env antes de armar la configuración.
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      // useFactory: función que arma la configuración de la conexión con los datos del .env.
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
        // Crea y actualiza las tablas según las entidades.
        // Práctico para la prueba; en un proyecto real se usarían migraciones.
        synchronize: true,
      }),
    }),

    // Módulos de la aplicación. El orden no afecta su funcionamiento.
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
// Clase vacía: el decorador @Module es suficiente para que Nest la use como módulo raíz.
export class AppModule {}
