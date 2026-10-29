// createParamDecorator: crea un decorador para PARÁMETROS de un método del controlador.
// ExecutionContext: información de la petición en curso.
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
// Tipo con los datos del usuario autenticado (solo para TypeScript).
import type { AuthUser } from '../auth-user.interface';

// Decorador @CurrentUser(): entrega al método el usuario que hizo la petición.
// Ejemplo de uso: metodo(@CurrentUser() usuario: AuthUser) { ... }
export const CurrentUser = createParamDecorator(
  // _data: dato opcional que se pasa al decorador (no lo usamos, por eso el guion bajo).
  (_data: unknown, context: ExecutionContext): AuthUser => {
    // Tomamos la petición HTTP.
    const request = context.switchToHttp().getRequest<{ user: AuthUser }>();
    // request.user lo guardó el JwtAuthGuard después de validar el token.
    return request.user;
  },
);
