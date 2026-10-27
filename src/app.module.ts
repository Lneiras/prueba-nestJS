import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthModule } from './health/health.module';

// Módulo raíz: aquí se conectan todas las piezas de la aplicación.
@Module({
  imports: [
    // Lee el archivo .env y deja sus variables disponibles en toda la aplicación.
    // "isGlobal" evita tener que importar ConfigModule en cada módulo.
    ConfigModule.forRoot({ isGlobal: true }),

    // Conexión a PostgreSQL. Usamos forRootAsync porque necesitamos esperar
    // a que ConfigService haya leído el .env antes de armar la configuración.
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        // Las variables de entorno siempre son texto, por eso convertimos el puerto a número.
        port: Number(config.get<string>('DB_PORT')),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        // Amazon RDS con PostgreSQL 15 o superior EXIGE conexión cifrada (SSL).
        // Por eso en AWS usamos DB_SSL=true y en local DB_SSL=false.
        // rejectUnauthorized: false cifra la conexión sin verificar el certificado de RDS.
        // Sirve para este proyecto; en producción real se usaría el certificado oficial de RDS.
        ssl:
          config.get<string>('DB_SSL') === 'true'
            ? { rejectUnauthorized: false }
            : false,
        // Registra automáticamente las entidades que se declaren con forFeature.
        autoLoadEntities: true,
        // Crea y actualiza las tablas según las entidades. Es cómodo para empezar,
        // pero en producción se usarían migraciones.
        synchronize: true,
      }),
    }),

    HealthModule,
  ],
})
export class AppModule {}
