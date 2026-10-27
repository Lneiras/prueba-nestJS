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

export enum MaintenanceType {
  PREVENTIVE = 'PREVENTIVE',
  CORRECTIVE = 'CORRECTIVE',
}

export enum MaintenanceStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('maintenances')
export class Maintenance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: MaintenanceType })
  type: MaintenanceType;

  @Column({ type: 'text' })
  description: string;

  // Kilometraje del vehículo al programar el mantenimiento.
  @Column({ type: 'int' })
  mileage: number;

  // Horario del mantenimiento: sirve para detectar cruces entre mantenimientos del mecánico.
  @Column({ type: 'timestamptz' })
  scheduledAt: Date;

  @Column({ type: 'timestamptz' })
  scheduledEnd: Date;

  @Column({
    type: 'enum',
    enum: MaintenanceStatus,
    default: MaintenanceStatus.SCHEDULED,
  })
  status: MaintenanceStatus;

  // Estos son datos de cierre: solo se llenan al completar el mantenimiento
  @Column({ type: 'text', nullable: true })
  workDone: string | null;

  @Column({ type: 'int', nullable: true })
  cost: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  finalMileage: number | null;

  // Relaciones: muchos mantenimientos pertenecen a un vehículo, mecánico y taller
  @ManyToOne(() => Vehicle, { nullable: false })
  @JoinColumn({ name: 'vehicleId' })
  vehicle: Vehicle;

  @Column({ type: 'int' })
  vehicleId: number;

  @ManyToOne(() => Mechanic, { nullable: false })
  @JoinColumn({ name: 'mechanicId' })
  mechanic: Mechanic;

  @Column({ type: 'int' })
  mechanicId: number;

  @ManyToOne(() => Workshop, { nullable: false })
  @JoinColumn({ name: 'workshopId' })
  workshop: Workshop;

  @Column({ type: 'int' })
  workshopId: number;
}
