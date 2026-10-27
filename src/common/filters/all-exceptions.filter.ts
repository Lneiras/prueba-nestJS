import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

// FILTRO DE EXCEPCIONES
// esto atrapa TODOS los errores de la aplicación
// y los convierte en una respuesta con el mismo formato:
// { success, statusCode, message, path, timestamp }.
// así ningún error de validación, de base de datos o de negocio solo muestra un 500.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Error interno del servidor';

    if (exception instanceof HttpException) {
      // Errores que lanzamos nosotros (NotFoundException, ConflictException...)
      // y los de validación (BadRequestException del ValidationPipe).
      statusCode = exception.getStatus();
      const body = exception.getResponse();
      const detalle =
        typeof body === 'string'
          ? body
          : (body as { message?: string | string[] }).message;
      // El ValidationPipe devuelve un arreglo de mensajes: lo unimos en un solo texto.
      message = Array.isArray(detalle)
        ? detalle.join('; ')
        : (detalle ?? exception.message);
    } else if (exception instanceof QueryFailedError) {
      // Errores de PostgreSQL: los traducimos para que no sean un 500.
      const codigo = (exception.driverError as { code?: string }).code;
      if (codigo === '23505') {
        // 23505 = valor duplicado en una columna única (placa, correo...)
        statusCode = HttpStatus.CONFLICT;
        message = 'Ya existe un registro con esos datos';
      } else if (codigo === '23503') {
        // 23503 = relación con un registro que no existe
        statusCode = HttpStatus.CONFLICT;
        message = 'La operación entra en conflicto con registros relacionados';
      } else if (codigo === '22P02' || codigo === '22003') {
        // 22P02 / 22003 = texto o número con formato inválido
        statusCode = HttpStatus.BAD_REQUEST;
        message = 'Alguno de los datos enviados tiene un formato inválido';
      } else {
        this.logger.error(exception.message, exception.stack);
      }
    } else {
      // Error inesperado: lo guardamos en el log pero no mostramos detalles al cliente.
      this.logger.error(
        exception instanceof Error ? exception.message : String(exception),
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(statusCode).json({
      success: false,
      statusCode,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
