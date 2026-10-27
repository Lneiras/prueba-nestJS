import { IsBoolean } from 'class-validator';

// Con esto  activamos o ponemos inactivo un mecánico o un taller.
// Ejemplo: { "isActive": false }
export class UpdateActiveDto {
  @IsBoolean()
  isActive: boolean;
}
