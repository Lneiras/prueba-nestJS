import { UserRole } from '../users/entities/user.entity';

// Datos del usuario autenticado que el guard de auth guarda en la petición.
export interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
}
