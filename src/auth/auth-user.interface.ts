// UserRole: enum con los roles posibles (ADMIN, TECHNICIAN) definido en la entidad User.
import { UserRole } from '../users/entities/user.entity';

// Datos del usuario autenticado que el JwtAuthGuard guarda en la petición (request.user).
// Son los datos que salen del token JWT; no incluyen la contraseña.
export interface AuthUser {
  id: number; // id del usuario (viene del campo "sub" del token)
  email: string; // correo del usuario
  role: UserRole; // rol: ADMIN o TECHNICIAN
}
