import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('workshops')
export class Workshop {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  address: string;

  // Estado del taller: true = activo, false = inactivo.
  @Column({ default: true })
  isActive: boolean;
}
