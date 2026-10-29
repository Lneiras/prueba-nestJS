// Validadores de class-validator: IsString (texto) e IsNotEmpty (no vacío).
import { IsNotEmpty, IsString } from 'class-validator';

// DTO para crear un taller: describe el cuerpo que se envía a POST /workshops.
export class CreateWorkshopDto {
  // Nombre del taller (obligatorio).
  @IsString()
  @IsNotEmpty()
  name: string;

  // Dirección del taller (obligatoria).
  @IsString()
  @IsNotEmpty()
  address: string;
}
