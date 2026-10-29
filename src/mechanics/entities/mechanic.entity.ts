// Column: columna de tabla. Entity: marca la clase como tabla. JoinColumn: indica la columna de llave foránea.
// OneToOne: relación uno a uno. PrimaryGeneratedColumn: id autonumérico.
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
// Entidad User: el usuario TECHNICIAN que puede estar ligado a este mecánico.
import { User } from '../../users/entities/user.entity';

// Entidad Mechanic: representa la tabla "mechanics".
@Entity('mechanics')
export class Mechanic {
  // Llave primaria autonumérica.
  @PrimaryGeneratedColumn()
  id: number;

  // Nombre del mecánico.
  @Column()
  name: string;

  // Correo: unique, no puede repetirse entre mecánicos.
  @Column({ unique: true })
  email: string;

  // Especialidad (por ejemplo Motor, Frenos).
  @Column()
  specialty: string;

  // Estado del mecánico: true = activo, false = inactivo.
  // Un mecánico inactivo no puede asignarse a nuevos mantenimientos.
  @Column({ default: true })
  isActive: boolean;

  // Usuario TECHNICIAN con el que se ingresa al sistema (opcional).
  // Es una relación 1 a 1: un usuario solo puede estar ligado a un mecánico.
  // JoinColumn({ name: 'userId' }) indica que la llave foránea se guarda en la columna userId.
  @OneToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  // Columna real de la llave foránea (el id del usuario). unique: un usuario, un solo mecánico.
  @Column({ type: 'int', nullable: true, unique: true })
  userId: number | null;
}
