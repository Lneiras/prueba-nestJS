// PartialType: crea un DTO igual a otro pero con todos sus campos opcionales.
import { PartialType } from '@nestjs/swagger';
// IsIn: el valor debe estar en una lista. IsOptional: el campo puede no venir.
import { IsIn, IsOptional } from 'class-validator';
import { VehicleStatus } from '../entities/vehicle.entity';
import { CreateVehicleDto } from './create-vehicle.dto';

// DTO para actualizar un vehículo (PATCH). Todos sus campos son opcionales.
// PartialType hace que los campos de CreateVehicleDto (placa, marca, modelo...) sean opcionales.
export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {
  // Campo extra: estado. Solo se puede poner AVAILABLE o INACTIVE a mano.
  // IN_MAINTENANCE lo pone el sistema según el estado del mantenimiento.
  @IsOptional()
  @IsIn([VehicleStatus.AVAILABLE, VehicleStatus.INACTIVE])
  status?: VehicleStatus.AVAILABLE | VehicleStatus.INACTIVE;
}
