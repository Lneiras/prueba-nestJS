// Column: columna de tabla. Entity: marca la clase como tabla. JoinColumn: nombre de la llave foránea.
// ManyToOne: relación "muchos a uno". PrimaryGeneratedColumn: id autonumérico.
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Mechanic } from '../../mechanics/entities/mechanic.entity';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';
import { Workshop } from '../../workshops/entities/workshop.entity';

// Tipos de mantenimiento: preventivo (programado) o correctivo (por una falla).
export enum MaintenanceType {
  PREVENTIVE = 'PREVENTIVE',
  CORRECTIVE = 'CORRECTIVE',
}

// Estados del mantenimiento a lo largo de su ciclo de vida.
export enum MaintenanceStatus {
  SCHEDULED = 'SCHEDULED', // programado, aún no empieza
  IN_PROGRESS = 'IN_PROGRESS', // en proceso (el vehículo está en taller)
  COMPLETED = 'COMPLETED', // terminado (estado final)
  CANCELLED = 'CANCELLED', // cancelado (estado final)
}

// Entidad Maintenance: representa la tabla "maintenances".
@Entity('maintenances')
export class Maintenance {
  // Llave primaria autonumérica.
  @PrimaryGeneratedColumn()
  id: number;

  // Tipo del mantenimiento (PREVENTIVE o CORRECTIVE), guardado como enum de PostgreSQL.
  @Column({ type: 'enum', enum: MaintenanceType })
  type: MaintenanceType;

  // Descripción del trabajo a realizar. "text" permite textos largos.
  @Column({ type: 'text' })
  description: string;

  // Kilometraje del vehículo al programar el mantenimiento.
  @Column({ type: 'int' })
  mileage: number;

  // Horario del mantenimiento (inicio y fin). Sirven para detectar cruces entre mantenimientos del mecánico.
  // timestamptz = fecha y hora con zona horaria.
  @Column({ type: 'timestamptz' })
  scheduledAt: Date;

  @Column({ type: 'timestamptz' })
  scheduledEnd: Date;

  // Estado actual. Nace como SCHEDULED por defecto.
  @Column({
    type: 'enum',
    enum: MaintenanceStatus,
    default: MaintenanceStatus.SCHEDULED,
  })
  status: MaintenanceStatus;

  // Datos de cierre: nulos hasta que el mantenimiento se completa.
  // Trabajo realizado.
  @Column({ type: 'text', nullable: true })
  workDone: string | null;

  // Costo final del trabajo.
  @Column({ type: 'int', nullable: true })
  cost: number | null;

  // Fecha y hora real en que terminó el trabajo.
  @Column({ type: 'timestamptz', nullable: true })
  finishedAt: Date | null;

  // Kilometraje con el que el vehículo sale del taller.
  @Column({ type: 'int', nullable: true })
  finalMileage: number | null;

  // RELACIONES: muchos mantenimientos pertenecen a un vehículo, a un mecánico y a un taller.
  // ManyToOne: la propiedad "vehicle" trae el objeto completo del vehículo.
  // JoinColumn: la llave foránea se guarda en la columna "vehicleId".
  @ManyToOne(() => Vehicle, { nullable: false })
  @JoinColumn({ name: 'vehicleId' })
  vehicle: Vehicle;

  // Columna con el id del vehículo (la llave foránea como número).
  @Column({ type: 'int' })
  vehicleId: number;

  // Mismo patrón para el mecánico asignado.
  @ManyToOne(() => Mechanic, { nullable: false })
  @JoinColumn({ name: 'mechanicId' })
  mechanic: Mechanic;

  @Column({ type: 'int' })
  mechanicId: number;

  // Mismo patrón para el taller donde se hace el trabajo.
  @ManyToOne(() => Workshop, { nullable: false })
  @JoinColumn({ name: 'workshopId' })
  workshop: Workshop;

  @Column({ type: 'int' })
  workshopId: number;
}
