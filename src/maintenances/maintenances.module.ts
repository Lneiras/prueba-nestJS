import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mechanic } from '../mechanics/entities/mechanic.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { Workshop } from '../workshops/entities/workshop.entity';
import { Maintenance } from './entities/maintenance.entity';
import { ExternalController } from './external.controller';
import { MaintenancesController } from './maintenances.controller';
import { MaintenancesService } from './maintenances.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Maintenance, Vehicle, Mechanic, Workshop]),
  ],
  controllers: [MaintenancesController, ExternalController],
  providers: [MaintenancesService],
})
export class MaintenancesModule {}
