import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateMechanicDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  specialty: string;

  // Id del usuario TECHNICIAN que usará este mecánico para entrar al sistema.
  @IsOptional()
  @IsInt()
  userId?: number;
}
