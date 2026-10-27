import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('mechanics')
export class Mechanic {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  specialty: string;

  // Estado del mecánico: true = activo, false = inactivo.
  @Column({ default: true })
  isActive: boolean;

  // Usuario TECHNICIAN con el que se ingresa al sistema (opcional).
  // Es una relación 1 a 1: un usuario solo puede estar ligado a un mecánico.
  @OneToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @Column({ type: 'int', nullable: true, unique: true })
  userId: number | null;
}
