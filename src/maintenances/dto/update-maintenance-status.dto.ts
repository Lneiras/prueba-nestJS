import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { MaintenanceStatus } from '../entities/maintenance.entity';

export class UpdateMaintenanceStatusDto {
  @IsEnum(MaintenanceStatus)
  status: MaintenanceStatus;


  @IsOptional()
  @IsString()
  @IsNotEmpty()
  workDone?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsDateString({}, { message: 'The end date is invalid. Please enter it like this: 2026-11-02T09:00:00.000Z' })
  finishedAt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  finalMileage?: number;
}
