// Herramientas de NestJS para crear un interceptor.
import {
  CallHandler, // Representa el siguiente paso: el controlador que va a responder.
  ExecutionContext, // Información de la petición en curso.
  Injectable, // Permite que Nest administre esta clase.
  NestInterceptor, // Interfaz que debe implementar todo interceptor.
} from '@nestjs/common';
// Tipo de la respuesta de Express (solo se usa para TypeScript).
import type { Response } from 'express';
// map: operador de RxJS que transforma cada dato que pasa por el flujo.
import { map } from 'rxjs';

// INTERCEPTOR DE RESPUESTA
// Envuelve lo que devuelve cada controlador en un formato uniforme:
// { success: true, statusCode, data, timestamp }.
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  // Nest ejecuta este método en cada petición, antes y después del controlador.
  intercept(context: ExecutionContext, next: CallHandler) {
    // Obtenemos la respuesta HTTP para leer el código de estado (200, 201...).
    const response = context.switchToHttp().getResponse<Response>();

    // next.handle() es lo que devolvió el controlador; map() lo transforma antes de enviarlo.
    return next.handle().pipe(
      map((data: unknown) => ({
        success: true,
        statusCode: response.statusCode,
        data, // lo que devolvió el servicio o el controlador
        timestamp: new Date().toISOString(), // fecha y hora de la respuesta
      })),
    );
  }
}
