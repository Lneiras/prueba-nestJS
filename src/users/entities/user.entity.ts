import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Roles que puede tener un usuario.
export enum UserRole {
  ADMIN = 'ADMIN',
  TECHNICIAN = 'TECHNICIAN',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  // unique: no puede haber dos usuarios con el mismo correo.
  @Column({ unique: true })
  email: string;

  // Aquí se guarda el hash de bcrypt, nunca la contraseña real.
  // select: false evita que la contraseña salga en las consultas normales.
  @Column({ select: false })
  password: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;
}
