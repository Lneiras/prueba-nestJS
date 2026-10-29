// Module: decorador que define un módulo de Nest.
import { Module } from '@nestjs/common';
// TypeOrmModule.forFeature: registra los repositorios que usa este módulo.
import { TypeOrmModule } from '@nestjs/typeorm';
// Entidades de otros módulos que este servicio también consulta (mecánico, vehículo, taller).
import { Mechanic } from '../mechanics/entities/mechanic.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { Workshop } from '../workshops/entities/workshop.entity';
import { Maintenance } from './entities/maintenance.entity';
import { ExternalController } from './external.controller';
import { MaintenancesController } from './maintenances.controller';
import { MaintenancesService } from './maintenances.service';

// Módulo de mantenimientos. Necesita los repositorios de las 4 entidades porque
// las reglas de negocio revisan vehículos, mecánicos y talleres.
@Module({
  imports: [
    TypeOrmModule.forFeature([Maintenance, Vehicle, Mechanic, Workshop]),
  ],
  // Dos controladores: el normal (con JWT) y el externo (con API key).
  controllers: [MaintenancesController, ExternalController],
  providers: [MaintenancesService],
})
export class MaintenancesModule {}
