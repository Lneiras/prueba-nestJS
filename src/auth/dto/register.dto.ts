// Validadores de class-validator que se colocan sobre las propiedades del DTO.
import {
  IsEmail, // el valor debe tener formato de correo
  IsEnum, // el valor debe pertenecer a un enum (lista de valores permitidos)
  IsNotEmpty, // el valor no puede estar vacío
  IsString, // el valor debe ser texto
  MinLength, // longitud mínima del texto
} from 'class-validator';
// Enum con los roles posibles (ADMIN, TECHNICIAN).
import { UserRole } from '../../users/entities/user.entity';

// DTO del registro: describe el cuerpo que se envía a POST /auth/register.
export class RegisterDto {
  // Nombre del usuario: texto obligatorio.
  @IsString()
  @IsNotEmpty()
  name: string;

  // Correo: debe tener formato válido y será único en la base de datos.
  @IsEmail()
  email: string;

  // Contraseña: mínimo 6 caracteres. Luego se guarda con hash (bcrypt), nunca en texto plano.
  @IsString()
  @MinLength(6)
  password: string;

  // Solo se aceptan los roles ADMIN o TECHNICIAN (los valores del enum UserRole).
  @IsEnum(UserRole)
  role: UserRole;
}
