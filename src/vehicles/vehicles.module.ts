// Module: decorador que define un módulo de Nest.
import { Module } from '@nestjs/common';
// TypeOrmModule.forFeature: registra el repositorio de la entidad Vehicle en este módulo.
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vehicle } from './entities/vehicle.entity';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';

// Módulo de vehículos: agrupa su entidad, su controlador y su servicio.
@Module({
  imports: [TypeOrmModule.forFeature([Vehicle])],
  controllers: [VehiclesController],
  providers: [VehiclesService],
})
export class VehiclesModule {}
