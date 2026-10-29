// Validadores de class-validator que se colocan sobre las propiedades del DTO.
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

// DTO del login: describe el cuerpo que debe enviar el cliente a POST /auth/login.
// Si los datos no cumplen, el ValidationPipe responde 400 antes de llegar al servicio.
export class LoginDto {
  // El correo debe tener formato válido (ejemplo: usuario@dominio.com).
  @IsEmail()
  email: string;

  // La contraseña debe ser texto y no puede estar vacía.
  @IsString()
  @IsNotEmpty()
  password: string;
}
