import { PartialType } from '@nestjs/swagger';
import { CreateMechanicDto } from './create-mechanic.dto';

// Todos los campos de CreateMechanicDto pasan a ser opcionales.
export class UpdateMechanicDto extends PartialType(CreateMechanicDto) {}
