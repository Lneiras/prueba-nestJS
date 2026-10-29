// Column: columna de tabla. Entity: marca la clase como tabla. PrimaryGeneratedColumn: id autonumérico.
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Estados posibles de un vehículo. El sistema los cambia según sus mantenimientos.
export enum VehicleStatus {
  AVAILABLE = 'AVAILABLE', // disponible para asignarle un mantenimiento
  IN_MAINTENANCE = 'IN_MAINTENANCE', // tiene un mantenimiento en proceso
  INACTIVE = 'INACTIVE', // dado de baja: no admite nuevos mantenimientos
}

// Entidad Vehicle: representa la tabla "vehicles".
@Entity('vehicles')
export class Vehicle {
  // Llave primaria autonumérica.
  @PrimaryGeneratedColumn()
  id: number;

  // unique: no puede haber dos vehículos con la misma placa.
  @Column({ unique: true })
  plate: string;

  // Marca del vehículo (por ejemplo Chevrolet).
  @Column()
  brand: string;

  // Modelo del vehículo (por ejemplo NPR).
  @Column()
  model: string;

  // Año de fabricación. "int" = número entero en la base de datos.
  @Column({ type: 'int' })
  year: number;

  // Kilometraje actual del vehículo. Se actualiza al completar un mantenimiento.
  @Column({ type: 'int' })
  mileage: number;

  // Estado del vehículo. Por defecto nace como AVAILABLE.
  @Column({
    type: 'enum',
    enum: VehicleStatus,
    default: VehicleStatus.AVAILABLE,
  })
  status: VehicleStatus;
}
