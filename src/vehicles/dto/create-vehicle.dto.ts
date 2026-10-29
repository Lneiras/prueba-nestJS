// Validadores de class-validator: IsInt (entero), IsNotEmpty (no vacío), IsString (texto), Min (mínimo).
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

// DTO para crear un vehículo: describe el cuerpo que se envía a POST /vehicles.
export class CreateVehicleDto {
  // Placa: texto obligatorio (luego el servicio la normaliza y valida que sea única).
  @IsString()
  @IsNotEmpty()
  plate: string;

  // Marca: texto obligatorio.
  @IsString()
  @IsNotEmpty()
  brand: string;

  // Modelo: texto obligatorio.
  @IsString()
  @IsNotEmpty()
  model: string;

  // Año: número entero, no menor a 1900.
  @IsInt()
  @Min(1900)
  year: number;

  // Kilometraje: número entero, no negativo.
  @IsInt()
  @Min(0)
  mileage: number;
}
