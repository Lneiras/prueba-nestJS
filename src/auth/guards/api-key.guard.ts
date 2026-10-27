import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// GUARD DE API KEY
// El cliente debe enviar el header "x-api-key", una de las claves del .env
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | undefined> }>();

    // API_KEYS llega como texto separado por comas: "key1,key2"
    const clavesValidas = (this.config.get<string>('API_KEYS') ?? '')
      .split(',')
      .map((clave) => clave.trim())
      .filter((clave) => clave !== '');

    const clave = request.headers['x-api-key'];
    if (!clave || !clavesValidas.includes(clave)) {
      throw new UnauthorizedException('API Key inválida o no enviada');
    }
    return true;
  }
}
