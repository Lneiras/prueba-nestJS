// IsBoolean: validador que comprueba que el valor sea true o false.
import { IsBoolean } from 'class-validator';

// DTO para activar o inactivar un mecánico o un taller.
// Ejemplo de cuerpo de la petición: { "isActive": false }
export class UpdateActiveDto {
  // El campo debe llegar obligatoriamente como booleano.
  @IsBoolean()
  isActive: boolean;
}
