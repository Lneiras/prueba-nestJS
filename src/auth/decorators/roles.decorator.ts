// SetMetadata: guarda una etiqueta en la ruta para que el RolesGuard la lea.
import { SetMetadata } from '@nestjs/common';
// Enum con los roles posibles (ADMIN, TECHNICIAN).
import { UserRole } from '../../users/entities/user.entity';

// Nombre de la etiqueta de roles. El RolesGuard usa este mismo nombre para leerla.
export const ROLES_KEY = 'roles';

// Decorador @Roles(...): declara qué roles pueden entrar a una ruta.
// Ejemplo: @Roles(UserRole.ADMIN) deja pasar solo a administradores.
// "...roles" recibe uno o más roles separados por coma.
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
