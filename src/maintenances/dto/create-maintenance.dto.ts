import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
} from 'class-validator';
import { MaintenanceType } from '../entities/maintenance.entity';

export class CreateMaintenanceDto {
  @IsEnum(MaintenanceType)
  type: MaintenanceType;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsInt()
  @Min(0)
  mileage: number;

  // Fechas en formato ISO. Ejemplo: "2026-10-30T07:30:00.000Z"
  @IsDateString({}, { message: 'The start date is invalid. Please enter it like this: 2026-11-02T07:30:00.000Z' })
  scheduledAt: string;

  @IsDateString({}, { message: 'The end date is invalid. Please enter it like this: 2026-11-02T07:30:00.000Z' })
  scheduledEnd: string;

  @IsInt()
  vehicleId: number;

  @IsInt()
  mechanicId: number;

  @IsInt()
  workshopId: number;
}
