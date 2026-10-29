// Herramientas de NestJS para construir un guard.
import {
  CanActivate, // Interfaz que debe implementar todo guard (método canActivate).
  ExecutionContext, // Información de la petición en curso.
  Injectable, // Permite que Nest administre el guard.
  UnauthorizedException, // Error 401: no hay token, o el token es inválido o expiró.
} from '@nestjs/common';
// Reflector: herramienta para leer las etiquetas (metadatos) que pusieron los decoradores.
import { Reflector } from '@nestjs/core';
// JwtService: herramienta para verificar la firma de un token JWT.
import { JwtService } from '@nestjs/jwt';
import type { AuthUser } from '../auth-user.interface';
// Clave de la etiqueta que marca una ruta como pública (@Public).
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

// GUARD JWT
// Se aplica a TODAS las rutas porque está registrado como guard global.
// 1. Si la ruta tiene @Public(), deja pasar sin pedir token.
// 2. Si no, exige el header "Authorization: Bearer <token>" y valida el token.
// 3. Si el token es válido, guarda al usuario en request.user para usarlo después.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  // Inyectamos JwtService (para validar el token) y Reflector (para leer @Public).
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  // Nest llama a este método antes de entrar a cada ruta.
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Paso 1: ¿la ruta (o su controlador) tiene la etiqueta @Public()?
    // getAllAndOverride busca primero en el método y luego en la clase.
    const esPublica = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(), // el método que se va a ejecutar
      context.getClass(), // la clase (controlador) de ese método
    ]);
    // Si es pública, no pedimos token y dejamos pasar la petición.
    if (esPublica) return true;

    // Obtenemos la petición para leer sus headers y, luego, guardar el usuario.
    const request = context
      .switchToHttp()
      .getRequest<{ headers: { authorization?: string }; user?: AuthUser }>();

    // Paso 2: el header debe verse así: "Bearer eyJhbGciOi..."
    // Lo partimos por el espacio: tipo = "Bearer", token = "eyJhbGciOi...".
    const [tipo, token] = request.headers.authorization?.split(' ') ?? [];
    // Si no hay header, o no empieza con "Bearer", o falta el token, respondemos 401.
    if (tipo !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token no enviado');
    }

    // Paso 3: verificamos el token.
    try {
      // verifyAsync revisa la firma (con JWT_SECRET) y la fecha de expiración.
      // Si algo no cuadra, lanza un error que atrapamos más abajo.
      const payload = await this.jwtService.verifyAsync<{
        sub: number;
        email: string;
        role: AuthUser['role'];
      }>(token);
      // Paso 4: guardamos los datos del usuario en la petición para que los usen
      // el RolesGuard y el decorador @CurrentUser().
      request.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
    } catch {
      // Token falso, alterado o vencido: respondemos 401.
      throw new UnauthorizedException('Token inválido o expirado');
    }

    // El token es válido: dejamos pasar la petición.
    return true;
  }
}
