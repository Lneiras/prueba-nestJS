// Herramientas de NestJS para construir un guard.
import {
  CanActivate, // Interfaz que debe implementar todo guard (método canActivate).
  ExecutionContext, // Información de la petición en curso.
  Injectable, // Permite que Nest administre el guard.
  UnauthorizedException, // Error 401: la petición no demostró que puede pasar.
} from '@nestjs/common';
// ConfigService: lee las variables del .env (aquí, API_KEYS).
import { ConfigService } from '@nestjs/config';

// GUARD DE API KEY
// Protege las rutas para sistemas externos: el cliente debe enviar el header "x-api-key"
// con una de las claves que están en la variable API_KEYS del .env.
@Injectable()
export class ApiKeyGuard implements CanActivate {
  // Recibimos ConfigService para leer API_KEYS.
  constructor(private readonly config: ConfigService) {}

  // Devuelve true si la clave es válida (la petición pasa) o lanza 401 si no lo es.
  canActivate(context: ExecutionContext): boolean {
    // Obtenemos la petición y tipamos sus headers para poder leer "x-api-key".
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | undefined> }>();

    // API_KEYS llega como texto separado por comas: "clave1,clave2"
    // Lo convertimos en una lista, quitando espacios y entradas vacías.
    const clavesValidas = (this.config.get<string>('API_KEYS') ?? '')
      .split(',')
      .map((clave) => clave.trim())
      .filter((clave) => clave !== '');

    // Leemos la clave que envió el cliente en el header x-api-key.
    const clave = request.headers['x-api-key'];
    // Si no envió clave, o la clave no está en la lista, rechazamos con 401.
    if (!clave || !clavesValidas.includes(clave)) {
      throw new UnauthorizedException('API Key inválida o no enviada');
    }
    return true;
  }
}
