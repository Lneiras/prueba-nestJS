import { PartialType } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { VehicleStatus } from '../entities/vehicle.entity';
import { CreateVehicleDto } from './create-vehicle.dto';

// PartialType hace que todos los campos de CreateVehicleDto sean opcionales.
export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {
  // Solo se puede poner AVAILABLE o INACTIVE a mano.
  // IN_MAINTENANCE lo cambia el sistema según el estado del mantenimiento.
  @IsOptional()
  @IsIn([VehicleStatus.AVAILABLE, VehicleStatus.INACTIVE])
  status?: VehicleStatus.AVAILABLE | VehicleStatus.INACTIVE;
}
