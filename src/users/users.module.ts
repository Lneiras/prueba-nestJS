// Module: decorador que define un módulo de Nest.
import { Module } from '@nestjs/common';
// TypeOrmModule.forFeature: registra los repositorios de las entidades de este módulo.
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

// Módulo de usuarios. Exporta UsersService para que AuthModule y MechanicsModule lo usen.
@Module({
  // Registra el repositorio de la entidad User para poder usarlo en el servicio.
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService],
  // "exports" permite que otros módulos inyecten UsersService.
  exports: [UsersService],
})
export class UsersModule {}
