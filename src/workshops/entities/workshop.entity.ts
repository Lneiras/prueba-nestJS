// Column: columna de tabla. Entity: marca la clase como tabla. PrimaryGeneratedColumn: id autonumérico.
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Entidad Workshop: representa la tabla "workshops" (los talleres donde se hacen los mantenimientos).
@Entity('workshops')
export class Workshop {
  // Llave primaria autonumérica.
  @PrimaryGeneratedColumn()
  id: number;

  // Nombre del taller.
  @Column()
  name: string;

  // Dirección del taller.
  @Column()
  address: string;

  // Estado del taller: true = activo, false = inactivo.
  // No se asignan mantenimientos a talleres inactivos.
  @Column({ default: true })
  isActive: boolean;
}
