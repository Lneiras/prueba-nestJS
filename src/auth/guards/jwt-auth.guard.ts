import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { AuthUser } from '../auth-user.interface';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

// GUARD JWT
// Se aplica a TODAS las rutas
// 1. Si la ruta tiene @Public(), deja pasar.
// 2. Si no, exige el header "Authorization: Bearer <token>" y valida el token.
// 3. Si el token es válido, guarda al usuario en request.user para usarlo después.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // ¿La ruta  está marcada como pública?
    const esPublica = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (esPublica) return true;

    const request = context
      .switchToHttp()
      .getRequest<{ headers: { authorization?: string }; user?: AuthUser }>();

    // El header se tiene ue ver así: "Bearer eyJhbGciOi..."
    const [tipo, token] = request.headers.authorization?.split(' ') ?? [];
    if (tipo !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token no enviado');
    }

    try {
      // verifyAsync revisa la firma y la fecha de expiración.
      const payload = await this.jwtService.verifyAsync<{
        sub: number;
        email: string;
        role: AuthUser['role'];
      }>(token);
      request.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    return true;
  }
}
