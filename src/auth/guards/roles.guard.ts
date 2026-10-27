import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/entities/user.entity';
import type { AuthUser } from '../auth-user.interface';
import { ROLES_KEY } from '../decorators/roles.decorator';

// GUARD ROLES
// Compara el rol del usuario con los roles que declaró @Roles() en la ruta. Si no coincide, responde 403
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesPermitidos = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si la ruta no declara roles, cualquier usuario autenticado puede entrar.
    if (!rolesPermitidos || rolesPermitidos.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: AuthUser }>();

    if (!user || !rolesPermitidos.includes(user.role)) {
      throw new ForbiddenException(
        'No tienes el rol necesario para realizar esta operación',
      );
    }
    return true;
  }
}
