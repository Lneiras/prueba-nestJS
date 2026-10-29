// Module: decorador que define un módulo de Nest.
import { Module } from '@nestjs/common';
// TypeOrmModule.forFeature: registra los repositorios que usa este módulo.
import { TypeOrmModule } from '@nestjs/typeorm';
// UsersModule: necesario para validar el usuario ligado al mecánico.
import { UsersModule } from '../users/users.module';
import { Mechanic } from './entities/mechanic.entity';
import { MechanicsController } from './mechanics.controller';
import { MechanicsService } from './mechanics.service';

// Módulo de mecánicos: su entidad, controlador y servicio.
@Module({
  // Registra el repositorio de Mechanic y trae UsersModule para poder usar UsersService.
  imports: [TypeOrmModule.forFeature([Mechanic]), UsersModule],
  controllers: [MechanicsController],
  providers: [MechanicsService],
})
export class MechanicsModule {}
