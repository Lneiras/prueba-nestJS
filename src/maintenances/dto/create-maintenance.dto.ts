// Validadores de class-validator que se colocan sobre las propiedades del DTO.
import {
  IsDateString, // texto con formato de fecha ISO (ejemplo: 2026-11-02T07:30:00.000Z)
  IsEnum, // valor dentro de un enum
  IsInt, // número entero
  IsNotEmpty, // no vacío
  IsString, // texto
  Min, // valor mínimo
} from 'class-validator';
import { MaintenanceType } from '../entities/maintenance.entity';

// DTO para crear un mantenimiento: describe el cuerpo que se envía a POST /maintenances.
export class CreateMaintenanceDto {
  // Tipo: solo PREVENTIVE o CORRECTIVE.
  @IsEnum(MaintenanceType)
  type: MaintenanceType;

  // Descripción del trabajo (obligatoria).
  @IsString()
  @IsNotEmpty()
  description: string;

  // Kilometraje (entero, no negativo). El servicio valida que no sea menor al del vehículo.
  @IsInt()
  @Min(0)
  mileage: number;

  // Fechas en formato ISO. Ejemplo: "2026-10-30T07:30:00.000Z"
  // El mensaje de error se personaliza con el segundo argumento.
  @IsDateString({}, { message: 'The start date is invalid. Please enter it like this: 2026-11-02T07:30:00.000Z' })
  scheduledAt: string;

  @IsDateString({}, { message: 'The end date is invalid. Please enter it like this: 2026-11-02T07:30:00.000Z' })
  scheduledEnd: string;

  // Ids del vehículo, del mecánico y del taller (números enteros).
  // Que existan y estén activos se valida en el servicio.
  @IsInt()
  vehicleId: number;

  @IsInt()
  mechanicId: number;

  @IsInt()
  workshopId: number;
}
