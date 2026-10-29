// Validadores de class-validator que se colocan sobre las propiedades del DTO.
import {
  IsDateString, // texto con formato de fecha ISO
  IsEnum, // valor dentro de un enum
  IsInt, // número entero
  IsNotEmpty, // no vacío
  IsOptional, // el campo puede no venir en la petición
  IsString, // texto
  Min, // valor mínimo
} from 'class-validator';
import { MaintenanceStatus } from '../entities/maintenance.entity';

// DTO para cambiar el estado de un mantenimiento: PATCH /maintenances/:id/status
// Los campos de cierre (workDone, cost, finishedAt, finalMileage) son opcionales aquí,
// pero son OBLIGATORIOS cuando el nuevo estado es COMPLETED (lo revisa el servicio).
export class UpdateMaintenanceStatusDto {
  // Nuevo estado que se quiere asignar (obligatorio).
  @IsEnum(MaintenanceStatus)
  status: MaintenanceStatus;

  // Trabajo realizado (opcional; obligatorio para completar).
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  workDone?: string;

  // Costo final (opcional; obligatorio para completar). No puede ser negativo.
  @IsOptional()
  @IsInt()
  @Min(0)
  cost?: number;

  // Fecha y hora de finalización (opcional; obligatoria para completar).
  @IsOptional()
  @IsDateString({}, { message: 'The end date is invalid. Please enter it like this: 2026-11-02T09:00:00.000Z' })
  finishedAt?: string;

  // Kilometraje final (opcional; obligatorio para completar). No puede ser negativo.
  @IsOptional()
  @IsInt()
  @Min(0)
  finalMileage?: number;
}
