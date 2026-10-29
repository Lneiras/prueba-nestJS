// Module: decorador que define un módulo de Nest.
import { Module } from '@nestjs/common';
// ConfigService: lee las variables del .env (JWT_SECRET, JWT_EXPIRES_IN).
import { ConfigService } from '@nestjs/config';
// APP_GUARD registra un guard de forma global: se aplica a TODAS las rutas.
import { APP_GUARD } from '@nestjs/core';
// JwtModule: módulo que firma y verifica tokens JWT. JwtSignOptions: tipo de las opciones de firma.
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
// Traemos UsersModule porque AuthService necesita buscar usuarios.
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

// Módulo de autenticación: login, registro, JWT y guards globales.
@Module({
  imports: [
    UsersModule,
    // Configura cómo se firman los tokens: secreto y duración.
    // registerAsync espera a que ConfigService tenga los valores del .env.
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        // Clave secreta para firmar el token (viene del .env, nunca escrita en el código).
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          // Tiempo de vida del token, por ejemplo "1h".
          expiresIn: config.get<string>(
            'JWT_EXPIRES_IN',
          ) as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    // Guards globales: se ejecutan en el orden de la lista.
    // Primero se valida el token (quién eres) y después el rol (qué puedes hacer).
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
