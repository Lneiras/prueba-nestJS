// PartialType: crea un DTO igual a otro pero con todos sus campos opcionales.
import { PartialType } from '@nestjs/swagger';
import { CreateMechanicDto } from './create-mechanic.dto';

// DTO para actualizar un mecánico (PATCH). Todos los campos pasan a ser opcionales.
export class UpdateMechanicDto extends PartialType(CreateMechanicDto) {}
