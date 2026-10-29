// Herramientas de NestJS para construir un guard.
import {
  CanActivate, // Interfaz que debe implementar todo guard (método canActivate).
  ExecutionContext, // Información de la petición en curso.
  ForbiddenException, // Error 403: sabemos quién eres, pero no tienes permiso.
  Injectable, // Permite que Nest administre el guard.
} from '@nestjs/common';
// Reflector: lee las etiquetas que puso el decorador @Roles().
import { Reflector } from '@nestjs/core';
// Enum con los roles posibles.
import { UserRole } from '../../users/entities/user.entity';
import type { AuthUser } from '../auth-user.interface';
// Clave de la etiqueta de roles (la misma que usa el decorador @Roles).
import { ROLES_KEY } from '../decorators/roles.decorator';

// GUARD DE ROLES
// Compara el rol del usuario con los roles que declaró @Roles() en la ruta.
// Si el rol no coincide, responde 403 (Forbidden).
// Este guard se ejecuta DESPUÉS del JwtAuthGuard, así que ya tenemos request.user.
@Injectable()
export class RolesGuard implements CanActivate {
  // Reflector nos permite leer la lista de roles permitidos.
  constructor(private readonly reflector: Reflector) {}

  // Devuelve true si el usuario puede entrar, o lanza 403 si no.
  canActivate(context: ExecutionContext): boolean {
    // Leemos la etiqueta @Roles() del método o, si no tiene, de la clase.
    const rolesPermitidos = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si la ruta no declara roles, cualquier usuario autenticado puede entrar.
    if (!rolesPermitidos || rolesPermitidos.length === 0) return true;

    // Tomamos el usuario que dejó el JwtAuthGuard en la petición.
    const { user } = context.switchToHttp().getRequest<{ user?: AuthUser }>();

    // Si no hay usuario, o su rol no está en la lista permitida, respondemos 403.
    if (!user || !rolesPermitidos.includes(user.role)) {
      throw new ForbiddenException(
        'No tienes el rol necesario para realizar esta operación',
      );
    }
    return true;
  }
}
