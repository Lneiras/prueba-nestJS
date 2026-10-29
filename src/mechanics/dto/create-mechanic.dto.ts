// Validadores de class-validator que se colocan sobre las propiedades del DTO.
import {
  IsEmail, // formato de correo
  IsInt, // número entero
  IsNotEmpty, // no vacío
  IsOptional, // el campo puede no venir
  IsString, // texto
} from 'class-validator';

// DTO para crear un mecánico: describe el cuerpo que se envía a POST /mechanics.
export class CreateMechanicDto {
  // Nombre del mecánico (obligatorio).
  @IsString()
  @IsNotEmpty()
  name: string;

  // Correo del mecánico (obligatorio, con formato válido).
  @IsEmail()
  email: string;

  // Especialidad (obligatoria).
  @IsString()
  @IsNotEmpty()
  specialty: string;

  // Id del usuario TECHNICIAN que usará este mecánico para entrar al sistema.
  // Es opcional: si no se envía, el mecánico no tiene usuario asociado.
  @IsOptional()
  @IsInt()
  userId?: number;
}
