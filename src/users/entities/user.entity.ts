// Column: columna de una tabla. Entity: marca la clase como tabla. PrimaryGeneratedColumn: id autonumérico.
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Roles que puede tener un usuario. Se guardan como texto en la base de datos.
export enum UserRole {
  ADMIN = 'ADMIN', // administra vehículos, mecánicos, talleres y mantenimientos
  TECHNICIAN = 'TECHNICIAN', // ve y actualiza solo sus mantenimientos asignados
}

// Entidad User: cada clase decorada con @Entity representa una tabla ("users").
@Entity('users')
export class User {
  // Llave primaria: número que se genera solo (1, 2, 3...).
  @PrimaryGeneratedColumn()
  id: number;

  // Nombre del usuario.
  @Column()
  name: string;

  // unique: no puede haber dos usuarios con el mismo correo.
  @Column({ unique: true })
  email: string;

  // Aquí se guarda el hash de bcrypt, nunca la contraseña real.
  // select: false evita que la contraseña salga en las consultas normales.
  @Column({ select: false })
  password: string;

  // Rol del usuario. "enum" le indica a PostgreSQL que solo acepte los valores de UserRole.
  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;
}
