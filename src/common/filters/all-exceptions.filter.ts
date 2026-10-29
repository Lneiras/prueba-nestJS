// Herramientas de NestJS para construir el filtro de excepciones.
import {
  ArgumentsHost, // Da acceso a la petición y la respuesta HTTP donde ocurrió el error.
  Catch, // Decorador que indica qué errores atrapa el filtro.
  ExceptionFilter, // Interfaz que debe implementar todo filtro.
  HttpException, // Clase base de los errores HTTP de Nest (NotFound, Conflict, etc.).
  HttpStatus, // Constantes con los códigos HTTP (500, 409, 400...).
  Logger, // Herramienta para guardar mensajes de error en el log del servidor.
} from '@nestjs/common';
// Tipos de Express para la petición y la respuesta (solo se usan para TypeScript).
import type { Request, Response } from 'express';
// QueryFailedError: error que lanza TypeORM cuando PostgreSQL rechaza una consulta.
import { QueryFailedError } from 'typeorm';

// FILTRO DE EXCEPCIONES
// Atrapa TODOS los errores de la aplicación y los convierte en una respuesta
// con el mismo formato: { success, statusCode, message, path, timestamp }.
// Así ningún error de validación, de base de datos o de negocio termina como un 500 genérico.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  // Logger con el nombre de esta clase, para identificar de dónde sale cada mensaje en el log.
  private readonly logger = new Logger(AllExceptionsFilter.name);

  // Nest llama a este método cada vez que una petición lanza un error.
  // exception: el error que ocurrió. host: información de la petición en curso.
  catch(exception: unknown, host: ArgumentsHost) {
    // Obtenemos la respuesta y la petición HTTP a partir del "host".
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Valores por defecto: si no sabemos qué pasó, respondemos 500 con un mensaje genérico.
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Error interno del servidor';

    // CASO 1: error HTTP de Nest (lo lanzamos nosotros o lo lanzó el ValidationPipe).
    if (exception instanceof HttpException) {
      // Errores que lanzamos nosotros (NotFoundException, ConflictException...)
      // y los de validación (BadRequestException del ValidationPipe).
      statusCode = exception.getStatus();
      // getResponse() devuelve el contenido del error: puede ser un texto o un objeto.
      const body = exception.getResponse();
      // Extraemos el mensaje: si es texto lo usamos tal cual; si es objeto, tomamos su campo "message".
      const detalle =
        typeof body === 'string'
          ? body
          : (body as { message?: string | string[] }).message;
      // El ValidationPipe devuelve un arreglo de mensajes: lo unimos en un solo texto.
      // Si no hay detalle, usamos el mensaje propio de la excepción.
      message = Array.isArray(detalle)
        ? detalle.join('; ')
        : (detalle ?? exception.message);

      // CASO 2: error de PostgreSQL que llegó a través de TypeORM.
    } else if (exception instanceof QueryFailedError) {
      // Código de error que devuelve PostgreSQL (cada tipo de error tiene su código).
      const codigo = (exception.driverError as { code?: string }).code;
      if (codigo === '23505') {
        // 23505 = valor duplicado en una columna única (placa, correo...)
        statusCode = HttpStatus.CONFLICT;
        message = 'Ya existe un registro con esos datos';
      } else if (codigo === '23503') {
        // 23503 = relación con un registro que no existe (llave foránea)
        statusCode = HttpStatus.CONFLICT;
        message = 'La operación entra en conflicto con registros relacionados';
      } else if (codigo === '22P02' || codigo === '22003') {
        // 22P02 / 22003 = texto o número con formato inválido
        statusCode = HttpStatus.BAD_REQUEST;
        message = 'Alguno de los datos enviados tiene un formato inválido';
      } else {
        // Cualquier otro error de base de datos: lo guardamos en el log para revisarlo.
        this.logger.error(exception.message, exception.stack);
      }

      // CASO 3: un error inesperado (no es de Nest ni de la base de datos).
    } else {
      // Lo guardamos en el log, pero NO mostramos detalles internos al cliente.
      this.logger.error(
        exception instanceof Error ? exception.message : String(exception),
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    // Enviamos la respuesta de error con el formato único de la API.
    response.status(statusCode).json({
      success: false,
      statusCode,
      message,
      path: request.url, // ruta donde ocurrió el error
      timestamp: new Date().toISOString(), // fecha y hora del error
    });
  }
}
